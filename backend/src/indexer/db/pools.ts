/**
 * Indexed pool DB helpers.
 */
import { Prisma, type IndexedPool } from "@prisma/client";
import { CHAIN_KEYS, type MarketToken } from "@xauconnect/utils";
import { db } from "../../db/client.js";
import { dexBatchRefresh } from "../../services/dexscreener.js";
import { tokenCacheKey } from "../../services/token-address.js";

export async function findPoolForToken(
  chainKey: string,
  tokenAddress: string,
): Promise<IndexedPool | null> {
  if (!db) return null;
  const addr = chainKey === "solana" ? tokenAddress : tokenAddress.toLowerCase();
  return db.indexedPool.findFirst({
    where: {
      chainKey,
      baseTokenAddress: { equals: addr, mode: "insensitive" },
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function upsertIndexedPool(data: {
  chainKey: string;
  dexKey: string;
  poolAddress: string;
  token0Address: string;
  token1Address: string;
  baseTokenAddress: string;
  createdBlock?: bigint;
  createdAt?: Date;
  token0Symbol?: string;
  token1Symbol?: string;
  creatorAddress?: string;
}): Promise<IndexedPool | null> {
  if (!db) return null;
  const poolAddr = data.chainKey === "solana" ? data.poolAddress : data.poolAddress.toLowerCase();
  return db.indexedPool.upsert({
    where: { chainKey_poolAddress: { chainKey: data.chainKey, poolAddress: poolAddr } },
    create: {
      chainKey: data.chainKey,
      dexKey: data.dexKey,
      poolAddress: poolAddr,
      token0Address: data.token0Address,
      token1Address: data.token1Address,
      baseTokenAddress: data.baseTokenAddress,
      createdBlock: data.createdBlock ?? 0n,
      createdAt: data.createdAt ?? new Date(),
      token0Symbol: data.token0Symbol,
      token1Symbol: data.token1Symbol,
      creatorAddress: data.creatorAddress,
    },
    update: {
      lastSeenBlock: data.createdBlock ?? undefined,
      isActive: true,
      creatorAddress: data.creatorAddress ?? undefined,
    },
  });
}

export async function dbRecentIndexedPools(limit = 24): Promise<MarketToken[]> {
  if (!db) return [];
  try {
    const perChain = Math.max(4, Math.ceil(limit / CHAIN_KEYS.length));
    // Batch the per-chain lists and indexed stats into one read. The previous
    // fan-out queued up to five queries per pool on every feed refresh.
    const now = Date.now();
    const hour = new Date(now - 3_600_000),
      day = new Date(now - 86_400_000);
    const pools = await db.$queryRaw<
      Array<{
        chainKey: string;
        baseTokenAddress: string;
        token0Symbol: string | null;
        token1Symbol: string | null;
        createdAt: Date;
        priceUsd: number | null;
        liquidityUsd: number | null;
        price1h: number | null;
        price24h: number | null;
        volume24hUsd: number;
      }>
    >`
      WITH recent AS MATERIALIZED (
        SELECT p.*
        FROM (VALUES ${Prisma.join(CHAIN_KEYS.map((key) => Prisma.sql`(${key}::text)`))}) AS chain(key)
        CROSS JOIN LATERAL (
          SELECT "id", "chainKey", "baseTokenAddress", "token0Symbol", "token1Symbol", "createdAt"
          FROM "IndexedPool"
          WHERE "chainKey" = chain.key AND "isActive"
          ORDER BY "createdAt" DESC
          LIMIT ${perChain}
        ) p
        ORDER BY p."createdAt" DESC
        LIMIT ${limit}
      )
      SELECT p.*, latest."priceUsd", latest."liquidityUsd",
        older_hour."priceUsd" AS "price1h", older_day."priceUsd" AS "price24h",
        COALESCE((SELECT SUM("volumeUsd") FROM "SwapEvent"
          WHERE "poolId" = p.id AND "blockTime" >= ${day}), 0) AS "volume24hUsd"
      FROM recent p
      LEFT JOIN LATERAL (
        SELECT "priceUsd", "liquidityUsd" FROM "PoolSnapshot"
        WHERE "poolId" = p.id ORDER BY "capturedAt" DESC LIMIT 1
      ) latest ON true
      LEFT JOIN LATERAL (
        SELECT "priceUsd" FROM "PoolSnapshot" WHERE "poolId" = p.id AND "capturedAt" <= ${hour}
        ORDER BY "capturedAt" DESC LIMIT 1
      ) older_hour ON true
      LEFT JOIN LATERAL (
        SELECT "priceUsd" FROM "PoolSnapshot" WHERE "poolId" = p.id AND "capturedAt" <= ${day}
        ORDER BY "capturedAt" DESC LIMIT 1
      ) older_day ON true
      ORDER BY p."createdAt" DESC
    `;
    const change = (current: number | null, older: number | null) =>
      current !== null && older !== null && older > 0 ? ((current - older) / older) * 100 : 0;
    const base: MarketToken[] = pools.map((p) => ({
      chainKey: p.chainKey,
      address: p.baseTokenAddress,
      symbol: p.token0Symbol ?? p.token1Symbol ?? "?",
      name: p.token0Symbol ?? p.token1Symbol ?? "Unknown",
      priceUsd: p.priceUsd ?? 0,
      change24hPct: change(p.priceUsd, p.price24h),
      change1hPct: change(p.priceUsd, p.price1h),
      volume24hUsd: p.volume24hUsd,
      liquidityUsd: p.liquidityUsd ?? 0,
      createdAt: p.createdAt.getTime(),
      xauLaunch: false,
      auditBadge: "none",
    }));

    const enriched = await dexBatchRefresh(base);
    return enriched.map((t, i) => {
      const snap = pools[i];
      if (snap?.priceUsd && snap.priceUsd > 0) {
        return {
          ...t,
          priceUsd: snap.priceUsd,
          liquidityUsd:
            snap.liquidityUsd && snap.liquidityUsd > 0 ? snap.liquidityUsd : t.liquidityUsd,
        };
      }
      return t;
    });
  } catch {
    return [];
  }
}

export function isQuoteAsset(
  chainKey: string,
  address: string,
  chain: { usdc?: string; wrappedNative?: string },
): boolean {
  const a = chainKey === "solana" ? address : address.toLowerCase();
  if (chain.usdc && a === (chainKey === "solana" ? chain.usdc : chain.usdc.toLowerCase()))
    return true;
  if (
    chain.wrappedNative &&
    a === (chainKey === "solana" ? chain.wrappedNative : chain.wrappedNative.toLowerCase())
  )
    return true;
  return false;
}

export function pickBaseToken(
  chainKey: string,
  token0: string,
  token1: string,
  chain: { usdc?: string; wrappedNative?: string },
): string {
  if (isQuoteAsset(chainKey, token0, chain)) return token1;
  if (isQuoteAsset(chainKey, token1, chain)) return token0;
  return token0;
}

export { tokenCacheKey };
