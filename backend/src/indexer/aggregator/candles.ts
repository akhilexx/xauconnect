/**
 * OHLCV candle aggregation from indexed swap events.
 */
import { db } from "../../db/client.js";
import { logger } from "../../logger.js";

const INTERVALS = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const;
type Interval = (typeof INTERVALS)[number];

const MS: Record<Interval, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function bucketStart(interval: Interval, t: Date): Date {
  const ms = MS[interval];
  return new Date(Math.floor(t.getTime() / ms) * ms);
}

function ohlcvFromSwaps(
  swaps: Array<{ priceUsd: number; volumeUsd: number; blockTime: Date }>,
): { open: number; high: number; low: number; close: number; volumeUsd: number } | null {
  if (swaps.length === 0) return null;
  const prices = swaps.map((s) => s.priceUsd).filter((p) => p > 0);
  if (prices.length === 0) return null;
  return {
    open: prices[0]!,
    high: Math.max(...prices),
    low: Math.min(...prices),
    close: prices[prices.length - 1]!,
    volumeUsd: swaps.reduce((a, s) => a + s.volumeUsd, 0),
  };
}

async function aggregateForPool(
  pool: { id: string; chainKey: string; baseTokenAddress: string; poolAddress: string },
  interval: Interval,
): Promise<void> {
  if (!db) return;
  const start = bucketStart(interval, new Date());
  const swaps = await db.swapEvent.findMany({
    where: { poolId: pool.id, blockTime: { gte: start } },
    orderBy: { blockTime: "asc" },
  });
  const bar = ohlcvFromSwaps(swaps);
  if (!bar) return;

  await db.candleBar.upsert({
    where: {
      chainKey_tokenAddress_interval_openTime: {
        chainKey: pool.chainKey,
        tokenAddress: pool.baseTokenAddress,
        interval,
        openTime: start,
      },
    },
    create: {
      chainKey: pool.chainKey,
      tokenAddress: pool.baseTokenAddress,
      poolAddress: pool.poolAddress,
      interval,
      openTime: start,
      ...bar,
    },
    update: bar,
  });
}

export async function runCandleAggregatorLoop(): Promise<never> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (db) {
      const pools = await db.indexedPool.findMany({ where: { isActive: true }, take: 200 });
      for (const pool of pools) {
        for (const interval of INTERVALS) {
          try {
            await aggregateForPool(pool, interval);
          } catch (err) {
            logger.warn({ err: (err as Error).message, pool: pool.id, interval }, "candle agg failed");
          }
        }
      }
    }
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

export async function candlesFromDb(
  chainKey: string,
  address: string,
  interval: Interval,
  limit = 200,
): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
  if (!db) return [];
  const bars = await db.candleBar.findMany({
    where: { chainKey, tokenAddress: address, interval },
    orderBy: { openTime: "asc" },
    take: limit,
  });
  if (bars.length > 0) {
    return bars.map((b) => ({
      time: Math.floor(b.openTime.getTime() / 1000),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: b.volumeUsd,
    }));
  }
  return candlesFromSnapshots(chainKey, address, interval, limit);
}

/** Build chart bars from indexer pool snapshots when swap OHLCV is not yet available. */
export async function candlesFromSnapshots(
  chainKey: string,
  address: string,
  interval: Interval,
  limit = 200,
): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
  if (!db) return [];
  const pool = await db.indexedPool.findFirst({
    where: { chainKey, baseTokenAddress: address, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!pool) return [];

  const ms = MS[interval];
  const since = new Date(Date.now() - ms * limit);
  const snaps = await db.poolSnapshot.findMany({
    where: { poolId: pool.id, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });
  if (snaps.length === 0) return [];

  const buckets = new Map<number, { prices: number[]; volume: number }>();
  for (const s of snaps) {
    const t = Math.floor(s.capturedAt.getTime() / ms) * ms;
    const b = buckets.get(t) ?? { prices: [], volume: 0 };
    if (s.priceUsd > 0) b.prices.push(s.priceUsd);
    b.volume += s.liquidityUsd * 0.001;
    buckets.set(t, b);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .slice(-limit)
    .map(([t, b]) => {
      const prices = b.prices.length > 0 ? b.prices : [0];
      return {
        time: Math.floor(t / 1000),
        open: prices[0]!,
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1]!,
        volume: b.volume,
      };
    })
    .filter((c) => c.close > 0);
}
