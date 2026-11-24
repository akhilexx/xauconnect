import { CHAIN_KEYS, type AdminMetrics } from "@xauconnect/utils";
import { db } from "../db/client.js";
import { cached } from "../cache.js";
import { ApiError } from "../middleware/error.js";
import { verifiedWhere } from "./settlement/evidence.js";

export async function adminMetrics(): Promise<
  AdminMetrics & { persisted: boolean; hasData: boolean }
> {
  if (!db) throw new ApiError(503, "Settlement ledger unavailable", "LEDGER_UNAVAILABLE");
  const client = db;
  return cached("admin:settlement-metrics:v1", 15, async () => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(+today - 29 * 86400000);
    const firstMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
    const [
      chains,
      daily,
      monthly,
      totalUsers,
      activeUsers24h,
      tokensLaunched,
      legacyCount,
      pendingCount,
      reviewCount,
      unpricedCount,
      tvl,
    ] = await client.$transaction(
      async (tx) =>
        Promise.all([
          tx.swap.groupBy({
            by: ["chainKey"],
            where: verifiedWhere,
            _sum: { volumeUsd: true, feeUsd: true },
            _count: { _all: true },
          }),
          tx.$queryRaw<Array<{ day: Date; volume: number; fees: number }>>`
          SELECT date_trunc('day',"createdAt") AS day,SUM("volumeUsd") AS volume,SUM("feeUsd") AS fees
          FROM "Swap" WHERE "verifiedAt" IS NOT NULL AND "settlementKey" IS NOT NULL AND status='confirmed'
          AND "createdAt">=${start} GROUP BY 1 ORDER BY 1`,
          tx.$queryRaw<Array<{ day: Date; volume: number; fees: number }>>`
            SELECT date_trunc('month',"createdAt") AS day,SUM("volumeUsd") AS volume,SUM("feeUsd") AS fees
            FROM "Swap" WHERE "verifiedAt" IS NOT NULL AND "settlementKey" IS NOT NULL AND status='confirmed'
            AND "createdAt">=${firstMonth} GROUP BY 1 ORDER BY 1`,
          tx.user.count(),
          tx.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 86400000) } } }),
          tx.launch.count({ where: { status: { in: ["DEPLOYED", "GRADUATED"] } } }),
          tx.swap.count({ where: { verifiedAt: null } }),
          tx.swapVerification.count({ where: { state: "pending" } }),
          tx.swapVerification.count({ where: { state: "review" } }),
          tx.swap.count({
            where: { ...verifiedWhere, OR: [{ volumePriced: false }, { feePriced: false }] },
          }),
          tx.chainStat.aggregate({ where: { date: { gte: start } }, _max: { tvlUsd: true } }),
        ]),
      { isolationLevel: "RepeatableRead" },
    );
    const chainBreakdown = CHAIN_KEYS.map((chainKey) => {
      const c = chains.find((x) => x.chainKey === chainKey);
      return {
        chainKey,
        volumeUsd: c?._sum.volumeUsd ?? 0,
        feesUsd: c?._sum.feeUsd ?? 0,
        swaps: c?._count._all ?? 0,
      };
    });
    const volumeSeries = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(+start + i * 86400000).toISOString().slice(0, 10);
      const d = daily.find((row) => row.day.toISOString().slice(0, 10) === date);
      return { date, volumeUsd: d?.volume ?? 0, feesUsd: d?.fees ?? 0 };
    });
    const sum = (f: "swaps" | "volumeUsd" | "feesUsd") =>
      chainBreakdown.reduce((a, c) => a + c[f], 0);
    return {
      totalVolumeUsd: sum("volumeUsd"),
      feesEarnedUsd: sum("feesUsd"),
      swapCount: sum("swaps"),
      chainBreakdown,
      volumeSeries,
      monthSeries: Array.from({ length: 12 }, (_, i) => {
        const date = new Date(
          Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + i, 1),
        )
          .toISOString()
          .slice(0, 10);
        const d = monthly.find((row) => row.day.toISOString().slice(0, 10) === date);
        return { date, volumeUsd: d?.volume ?? 0, feesUsd: d?.fees ?? 0 };
      }),
      totalUsers,
      activeUsers24h,
      tokensLaunched,
      tvlUsd: tvl._max.tvlUsd ?? 0,
      legacyCount,
      pendingCount,
      reviewCount,
      unpricedCount,
      persisted: true,
      hasData: sum("swaps") > 0,
    };
  });
}
