import { CHAIN_KEYS, type AdminMetrics } from "@xauconnect/utils";
import { db } from "../db/client.js";
import { logger } from "../logger.js";
import { ApiError } from "../middleware/error.js";
import { singleFlight } from "../lib/single-flight.js";

type Metrics = AdminMetrics & { persisted: boolean; hasData: boolean };
type SeriesData = Pick<AdminMetrics["volumeSeries"][number], "volumeUsd" | "feesUsd">;
type MetricsRow = Pick<
  AdminMetrics,
  | "totalUsers"
  | "activeUsers24h"
  | "tokensLaunched"
  | "legacyCount"
  | "pendingCount"
  | "reviewCount"
  | "unpricedCount"
  | "tvlUsd"
> & {
  chains: AdminMetrics["chainBreakdown"];
  daily: Record<string, SeriesData>;
  monthly: Record<string, SeriesData>;
};

const dayMs = 86_400_000;
const freshMs = 15_000;
let snapshot: { value: Metrics; updatedAt: number } | undefined;
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const loadMetrics = singleFlight(async (): Promise<Metrics> => {
  const client = db;
  if (!client)
    throw new ApiError(503, "Settlement ledger is temporarily unavailable", "LEDGER_UNAVAILABLE");
  const now = Date.now();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(+today - 29 * dayMs);
  const firstMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));

  // A single statement provides one consistent PostgreSQL snapshot and doesn't
  // reserve a connection for an interactive transaction across multiple reads.
  const [row] = await client.$queryRaw<MetricsRow[]>`
    WITH verified AS MATERIALIZED (
      SELECT "chainKey", "createdAt", "volumeUsd", "feeUsd", "volumePriced", "feePriced"
      FROM "Swap"
      WHERE status = 'confirmed' AND "verifiedAt" IS NOT NULL AND "settlementKey" IS NOT NULL
    ), chains AS (
      SELECT "chainKey", SUM("volumeUsd") AS "volumeUsd", SUM("feeUsd") AS "feesUsd",
        COUNT(*)::int AS swaps FROM verified GROUP BY "chainKey"
    ), daily AS (
      SELECT to_char("createdAt", 'YYYY-MM-DD') AS date,
        SUM("volumeUsd") AS "volumeUsd", SUM("feeUsd") AS "feesUsd"
      FROM verified WHERE "createdAt" >= ${start} GROUP BY 1
    ), monthly AS (
      SELECT to_char("createdAt", 'YYYY-MM-01') AS date,
        SUM("volumeUsd") AS "volumeUsd", SUM("feeUsd") AS "feesUsd"
      FROM verified WHERE "createdAt" >= ${firstMonth} GROUP BY 1
    )
    SELECT
      COALESCE((SELECT jsonb_agg(chains) FROM chains), '[]'::jsonb) AS chains,
      COALESCE((SELECT jsonb_object_agg(date, jsonb_build_object(
        'volumeUsd', "volumeUsd", 'feesUsd', "feesUsd")) FROM daily), '{}'::jsonb) AS daily,
      COALESCE((SELECT jsonb_object_agg(date, jsonb_build_object(
        'volumeUsd', "volumeUsd", 'feesUsd', "feesUsd")) FROM monthly), '{}'::jsonb) AS monthly,
      (SELECT COUNT(*)::int FROM "User") AS "totalUsers",
      (SELECT COUNT(*)::int FROM "User" WHERE "lastSeenAt" >= ${new Date(now - dayMs)}) AS "activeUsers24h",
      (SELECT COUNT(*)::int FROM "Launch" WHERE status IN ('DEPLOYED', 'GRADUATED')) AS "tokensLaunched",
      (SELECT COUNT(*)::int FROM "Swap" WHERE "verifiedAt" IS NULL) AS "legacyCount",
      (SELECT COUNT(*)::int FROM "SwapVerification" WHERE state = 'pending') AS "pendingCount",
      (SELECT COUNT(*)::int FROM "SwapVerification" WHERE state = 'review') AS "reviewCount",
      (SELECT COUNT(*)::int FROM verified WHERE NOT "volumePriced" OR NOT "feePriced") AS "unpricedCount",
      COALESCE((SELECT MAX("tvlUsd") FROM "ChainStat" WHERE date >= ${start}), 0) AS "tvlUsd"
  `.catch((error: unknown) => {
    const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
    logger.warn({ code }, "admin metrics refresh failed");
    throw new ApiError(
      503,
      "Settlement metrics are temporarily unavailable",
      "METRICS_UNAVAILABLE",
    );
  });
  if (!row)
    throw new ApiError(
      503,
      "Settlement metrics are temporarily unavailable",
      "METRICS_UNAVAILABLE",
    );

  const { chains, daily, monthly, ...counts } = row;
  const chainBreakdown = CHAIN_KEYS.map(
    (chainKey) =>
      chains.find((c) => c.chainKey === chainKey) ?? {
        chainKey,
        volumeUsd: 0,
        feesUsd: 0,
        swaps: 0,
      },
  );
  const sum = (field: "swaps" | "volumeUsd" | "feesUsd") =>
    chainBreakdown.reduce((total, chain) => total + chain[field], 0);
  const point = (series: Record<string, SeriesData>, date: string) => ({
    date,
    volumeUsd: series[date]?.volumeUsd ?? 0,
    feesUsd: series[date]?.feesUsd ?? 0,
  });
  const swapCount = sum("swaps");
  const value: Metrics = {
    ...counts,
    totalVolumeUsd: sum("volumeUsd"),
    feesEarnedUsd: sum("feesUsd"),
    swapCount,
    chainBreakdown,
    volumeSeries: Array.from({ length: 30 }, (_, i) =>
      point(daily, dateKey(new Date(+start + i * dayMs))),
    ),
    monthSeries: Array.from({ length: 12 }, (_, i) =>
      point(
        monthly,
        dateKey(new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1))),
      ),
    ),
    persisted: true,
    hasData: swapCount > 0,
  };
  snapshot = { value, updatedAt: Date.now() };
  return value;
});

export async function adminMetrics(): Promise<Metrics> {
  return snapshot && Date.now() - snapshot.updatedAt < freshMs ? snapshot.value : loadMetrics();
}
