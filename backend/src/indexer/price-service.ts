/**
 * On-chain price orchestration — reads IndexedPool + RPC, optional PoolSnapshot writes.
 */
import type { MarketToken } from "@xauconnect/utils";
import { db } from "../db/client.js";
import { findPoolForToken } from "./db/pools.js";
import { readV2PoolPrice } from "./onchain/evm-v2-price.js";
import { hydratePoolFromAddress } from "./hydrate.js";
import { tokenStatsFromDb } from "./stats/token-stats.js";
import { tokenCacheKey } from "../services/token-address.js";

const PRICE_CACHE_MS = 1_000;
const priceCache = new Map<string, { at: number; token: OnchainTokenResult }>();

export type OnchainTokenResult = MarketToken & {
  topPoolAddress?: string;
  sources: string[];
};

export async function getTokenPrice(
  chainKey: string,
  address: string,
  hintPoolAddress?: string,
): Promise<OnchainTokenResult | null> {
  const key = tokenCacheKey(chainKey, address);
  const hit = priceCache.get(key);
  if (hit && Date.now() - hit.at < PRICE_CACHE_MS) return hit.token;

  let pool = await findPoolForToken(chainKey, address);
  if (!pool && hintPoolAddress) {
    await hydratePoolFromAddress(chainKey, address, hintPoolAddress);
    pool = await findPoolForToken(chainKey, address);
  }
  if (!pool) return null;

  try {
    const { priceUsd, liquidityUsd, reserve0, reserve1, blockNumber } = await readV2PoolPrice(
      chainKey,
      pool,
    );
    if (priceUsd <= 0) return null;

    const stats = await tokenStatsFromDb(chainKey, address);

    if (db) {
      await db.poolSnapshot.create({
        data: {
          poolId: pool.id,
          blockNumber,
          reserve0: reserve0.toString(),
          reserve1: reserve1.toString(),
          priceUsd,
          liquidityUsd,
        },
      }).catch(() => {});
      await db.indexedPool.update({
        where: { id: pool.id },
        data: { lastSeenBlock: blockNumber },
      }).catch(() => {});
    }

    const result: OnchainTokenResult = {
      chainKey,
      address: pool.baseTokenAddress,
      symbol: pool.token0Symbol ?? pool.token1Symbol ?? "?",
      name: pool.token0Symbol ?? pool.token1Symbol ?? "Unknown",
      priceUsd,
      liquidityUsd,
      volume24hUsd: stats.volume24hUsd,
      change24hPct: stats.change24hPct,
      change1hPct: stats.change1hPct,
      marketCapUsd: 0,
      createdAt: pool.createdAt.getTime(),
      xauLaunch: false,
      auditBadge: "none",
      topPoolAddress: pool.poolAddress,
      sources: ["onchain"],
    };

    priceCache.set(key, { at: Date.now(), token: result });
    return result;
  } catch {
    return null;
  }
}

/** Continuous snapshot loop for indexer worker. */
export async function runPriceSnapshotLoop(): Promise<never> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (db) {
      const pools = await db.indexedPool.findMany({
        where: { isActive: true },
        take: 200,
        orderBy: { createdAt: "desc" },
      });
      for (const pool of pools) {
        await getTokenPrice(pool.chainKey, pool.baseTokenAddress, pool.poolAddress);
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
}
