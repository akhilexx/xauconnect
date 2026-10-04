/**
 * Indexed pool DB helpers.
 */
import type { IndexedPool } from "@prisma/client";
import { CHAIN_KEYS, type MarketToken } from "@xauconnect/utils";
import { db } from "../../db/client.js";
import { dexBatchRefresh } from "../../services/dexscreener.js";
import { tokenCacheKey } from "../../services/token-address.js";
import { tokenStatsFromDb } from "../stats/token-stats.js";

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
  const poolAddr =
    data.chainKey === "solana" ? data.poolAddress : data.poolAddress.toLowerCase();
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
    const poolGroups = await Promise.all(
      CHAIN_KEYS.map((chainKey) =>
        db!.indexedPool.findMany({
          where: { isActive: true, chainKey },
          orderBy: { createdAt: "desc" },
          take: perChain,
          include: {
            snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
          },
        }),
      ),
    );
    const pools = poolGroups
      .flat()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    const base = await Promise.all(
      pools.map(async (p) => {
        const snap = p.snapshots[0];
        const stats = await tokenStatsFromDb(p.chainKey, p.baseTokenAddress);
        return {
          chainKey: p.chainKey,
          address: p.baseTokenAddress,
          symbol: p.token0Symbol ?? p.token1Symbol ?? "?",
          name: p.token0Symbol ?? p.token1Symbol ?? "Unknown",
          priceUsd: snap?.priceUsd ?? 0,
          change24hPct: stats.change24hPct,
          change1hPct: stats.change1hPct,
          volume24hUsd: stats.volume24hUsd,
          liquidityUsd: snap?.liquidityUsd ?? 0,
          createdAt: p.createdAt.getTime(),
          xauLaunch: false,
          auditBadge: "none" as const,
        };
      }),
    );

    const enriched = await dexBatchRefresh(base);
    return enriched.map((t, i) => {
      const snap = pools[i]?.snapshots[0];
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

export function isQuoteAsset(chainKey: string, address: string, chain: { usdc?: string; wrappedNative?: string }): boolean {
  const a = chainKey === "solana" ? address : address.toLowerCase();
  if (chain.usdc && a === (chainKey === "solana" ? chain.usdc : chain.usdc.toLowerCase())) return true;
  if (chain.wrappedNative && a === (chainKey === "solana" ? chain.wrappedNative : chain.wrappedNative.toLowerCase())) return true;
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
