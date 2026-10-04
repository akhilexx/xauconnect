/**
 * Unified discovery cache — merges DB indexer, Gecko, Dex, launchpad tokens.
 * Computes trending / volume / gainer scores for tab filtering.
 */
import { CHAIN_KEYS, type DiscoveryTab, type MarketToken } from "@xauconnect/utils";
import { env } from "../config.js";
import { dbRecentIndexedPools } from "../indexer/db/pools.js";
import { getLiveLaunches } from "./launches.js";
import { dexNewLaunches, dexTrendingTokens } from "./dexscreener.js";
import { gtNewLaunches } from "./geckoterminal.js";
import { tokenCacheKey } from "./token-address.js";
import { logger } from "../logger.js";

const REFRESH_MS = 30_000;
const PER_CHAIN_CAP = 10;

export type CachedToken = MarketToken & {
  trendingScore: number;
  volumeScore: number;
  gainerScore: number;
  newScore: number;
};

let pool: CachedToken[] = [];
let refreshedAt = 0;

function scoreToken(t: MarketToken, now: number): CachedToken {
  const ageH = t.createdAt ? Math.max(1, (now - t.createdAt) / 3_600_000) : 72;
  const vol = t.volume24hUsd ?? 0;
  const chg = t.change24hPct ?? 0;
  const liq = t.liquidityUsd ?? 0;
  return {
    ...t,
    trendingScore: vol * (1 + Math.abs(chg) / 100) + liq * 0.1,
    volumeScore: vol,
    gainerScore: chg,
    newScore: t.createdAt ? 1_000_000 / ageH : 0,
  };
}

function mergeUnique(tokens: MarketToken[]): MarketToken[] {
  const seen = new Set<string>();
  const out: MarketToken[] = [];
  for (const t of tokens) {
    const key = tokenCacheKey(t.chainKey, t.address);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

async function fetchAllSources(): Promise<MarketToken[]> {
  const [{ launches }, indexed, gecko, dexNew, dexTrend] = await Promise.all([
    getLiveLaunches(),
    dbRecentIndexedPools(PER_CHAIN_CAP * CHAIN_KEYS.length),
    env.MARKET_SOURCE === "db" ? Promise.resolve([]) : gtNewLaunches(36).catch(() => []),
    env.MARKET_SOURCE === "db" ? Promise.resolve([]) : dexNewLaunches(36).catch(() => []),
    env.MARKET_SOURCE === "db" ? Promise.resolve([]) : dexTrendingTokens(30).catch(() => []),
  ]);
  return mergeUnique([...launches, ...indexed, ...gecko, ...dexNew, ...dexTrend]);
}

function ensureChainMix(tokens: CachedToken[]): CachedToken[] {
  const byChain = new Map<string, CachedToken[]>();
  for (const t of tokens) {
    const list = byChain.get(t.chainKey) ?? [];
    list.push(t);
    byChain.set(t.chainKey, list);
  }
  const mixed: CachedToken[] = [];
  for (const chain of CHAIN_KEYS) {
    const list = (byChain.get(chain) ?? []).sort((a, b) => b.trendingScore - a.trendingScore);
    mixed.push(...list.slice(0, PER_CHAIN_CAP));
  }
  const picked = new Set(mixed.map((t) => tokenCacheKey(t.chainKey, t.address)));
  for (const t of tokens) {
    const key = tokenCacheKey(t.chainKey, t.address);
    if (!picked.has(key)) mixed.push(t);
  }
  return mixed;
}

export async function refreshDiscoveryCache(): Promise<CachedToken[]> {
  try {
    const raw = await fetchAllSources();
    const now = Date.now();
    pool = ensureChainMix(raw.map((t) => scoreToken(t, now)));
    refreshedAt = now;
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "discovery cache refresh failed");
  }
  return pool;
}

export async function getDiscoveryPool(): Promise<CachedToken[]> {
  if (pool.length === 0 || Date.now() - refreshedAt >= REFRESH_MS) {
    await refreshDiscoveryCache();
  }
  return pool.map((t) => ({ ...t }));
}

export async function discoveryFromCache(
  tab: DiscoveryTab,
  chainKey?: string,
): Promise<MarketToken[]> {
  let tokens = await getDiscoveryPool();
  if (chainKey) tokens = tokens.filter((t) => t.chainKey === chainKey);

  switch (tab) {
    case "trending":
      return tokens.sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 30);
    case "new":
      return tokens
        .filter((t) => t.createdAt)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, 30);
    case "gainers":
      return tokens.sort((a, b) => b.gainerScore - a.gainerScore).slice(0, 30);
    case "volume":
      return tokens.sort((a, b) => b.volumeScore - a.volumeScore).slice(0, 30);
  }
}
