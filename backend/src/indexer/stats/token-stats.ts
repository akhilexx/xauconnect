/**
 * Token volume / change stats from indexed swap events and pool snapshots.
 */
import { db } from "../../db/client.js";

export interface TokenStats {
  volume24hUsd: number;
  change24hPct: number;
  change1hPct: number;
}

export async function tokenStatsFromDb(
  chainKey: string,
  address: string,
): Promise<TokenStats> {
  const empty = { volume24hUsd: 0, change24hPct: 0, change1hPct: 0 };
  if (!db) return empty;

  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since1h = new Date(Date.now() - 60 * 60 * 1000);

    const pool = await db.indexedPool.findFirst({
      where: { chainKey, baseTokenAddress: address, isActive: true },
    });
    if (!pool) return empty;

    const vol = await db.swapEvent.aggregate({
      where: { poolId: pool.id, blockTime: { gte: since24h } },
      _sum: { volumeUsd: true },
    });

    const [snapNow, snap1h, snap24h] = await Promise.all([
      db.poolSnapshot.findFirst({
        where: { poolId: pool.id },
        orderBy: { capturedAt: "desc" },
      }),
      db.poolSnapshot.findFirst({
        where: { poolId: pool.id, capturedAt: { lte: since1h } },
        orderBy: { capturedAt: "desc" },
      }),
      db.poolSnapshot.findFirst({
        where: { poolId: pool.id, capturedAt: { lte: since24h } },
        orderBy: { capturedAt: "desc" },
      }),
    ]);

    const priceNow = snapNow?.priceUsd ?? 0;
    const change1hPct =
      snap1h && snap1h.priceUsd > 0 ? ((priceNow - snap1h.priceUsd) / snap1h.priceUsd) * 100 : 0;
    const change24hPct =
      snap24h && snap24h.priceUsd > 0 ? ((priceNow - snap24h.priceUsd) / snap24h.priceUsd) * 100 : 0;

    return {
      volume24hUsd: vol._sum.volumeUsd ?? 0,
      change1hPct,
      change24hPct,
    };
  } catch {
    return empty;
  }
}
