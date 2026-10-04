/**
 * Admin metrics service — aggregates platform KPIs from the database only.
 * Returns zeros when the database is empty; never fabricates demo figures.
 */
import type { AdminMetrics } from "@xauconnect/utils";
import { CHAIN_KEYS } from "@xauconnect/utils";
import { db } from "../db/client.js";
import { cached } from "../cache.js";

const EMPTY: AdminMetrics = {
  totalVolumeUsd: 0,
  feesEarnedUsd: 0,
  activeUsers24h: 0,
  totalUsers: 0,
  tokensLaunched: 0,
  tvlUsd: 0,
  swapCount: 0,
  chainBreakdown: CHAIN_KEYS.map((chainKey) => ({
    chainKey,
    volumeUsd: 0,
    feesUsd: 0,
    swaps: 0,
  })),
  volumeSeries: [],
};

function last30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
}

export async function adminMetrics(): Promise<
  AdminMetrics & { persisted: boolean; hasData: boolean }
> {
  return cached("admin:metrics", 30, async () => {
    if (!db) return { ...EMPTY, persisted: false, hasData: false };

    try {
      const since24h = new Date(Date.now() - 86_400_000);
      const since30d = new Date(Date.now() - 30 * 86_400_000);
      since30d.setUTCHours(0, 0, 0, 0);

      const [volumeAgg, totalUsers, activeUsers, tokensLaunched, swapCount, byChain, daily] =
        await Promise.all([
          db.swap.aggregate({ _sum: { volumeUsd: true, feeUsd: true } }),
          db.user.count(),
          db.user.count({ where: { lastSeenAt: { gte: since24h } } }),
          db.launch.count({ where: { status: { in: ["DEPLOYED", "GRADUATED"] } } }),
          db.swap.count(),
          db.swap.groupBy({
            by: ["chainKey"],
            _sum: { volumeUsd: true, feeUsd: true },
            _count: { _all: true },
          }),
          db.chainStat.findMany({
            where: { date: { gte: since30d } },
            orderBy: { date: "asc" },
          }),
        ]);

      const chainMap = new Map(
        byChain.map((c) => [
          c.chainKey,
          {
            chainKey: c.chainKey,
            volumeUsd: c._sum.volumeUsd ?? 0,
            feesUsd: c._sum.feeUsd ?? 0,
            swaps: c._count._all,
          },
        ]),
      );

      const seriesMap = new Map<string, { volumeUsd: number; feesUsd: number }>();
      for (const day of last30Days()) {
        seriesMap.set(day, { volumeUsd: 0, feesUsd: 0 });
      }
      for (const stat of daily) {
        const key = stat.date.toISOString().slice(0, 10);
        const entry = seriesMap.get(key) ?? { volumeUsd: 0, feesUsd: 0 };
        entry.volumeUsd += stat.volumeUsd;
        entry.feesUsd += stat.feesUsd;
        seriesMap.set(key, entry);
      }

      const totalVolumeUsd = volumeAgg._sum.volumeUsd ?? 0;
      const hasData = swapCount > 0 || tokensLaunched > 0 || totalUsers > 0;

      return {
        totalVolumeUsd,
        feesEarnedUsd: volumeAgg._sum.feeUsd ?? 0,
        activeUsers24h: activeUsers,
        totalUsers,
        tokensLaunched,
        tvlUsd: daily.reduce((max, s) => Math.max(max, s.tvlUsd), 0),
        swapCount,
        chainBreakdown: CHAIN_KEYS.map(
          (chainKey) =>
            chainMap.get(chainKey) ?? { chainKey, volumeUsd: 0, feesUsd: 0, swaps: 0 },
        ),
        volumeSeries: [...seriesMap.entries()].map(([date, v]) => ({ date, ...v })),
        persisted: true,
        hasData,
      };
    } catch {
      return { ...EMPTY, persisted: true, hasData: false };
    }
  });
}
