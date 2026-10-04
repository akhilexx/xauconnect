/**
 * DexScreener — keyless live market data (discovery, launches, token detail).
 * https://docs.dexscreener.com/api/reference
 */
import type { MarketToken } from "@xauconnect/utils";
import { logger } from "../logger.js";
import { tokenAddressEq, tokenCacheKey } from "./token-address.js";
import { withTimeout } from "./routing/evm.js";

const HTTP_MS = 6_000;
const BATCH_MS = 4_000;

export const DEXSCREENER_CHAIN: Record<string, string> = {
  ethereum: "ethereum",
  bsc: "bsc",
  polygon: "polygon",
  arbitrum: "arbitrum",
  base: "base",
  avalanche: "avalanche",
  solana: "solana",
};

export function fromDexScreenerPair(pair: any): MarketToken | null {
  const chainKey = Object.entries(DEXSCREENER_CHAIN).find(([, v]) => v === pair.chainId)?.[0];
  if (!chainKey || !pair.baseToken?.address) return null;
  return {
    chainKey,
    address: pair.baseToken.address,
    symbol: pair.baseToken.symbol ?? "?",
    name: pair.baseToken.name ?? "Unknown",
    priceUsd: Number(pair.priceUsd ?? 0),
    change1hPct: Number(pair.priceChange?.h1 ?? 0),
    change24hPct: Number(pair.priceChange?.h24 ?? 0),
    volume24hUsd: Number(pair.volume?.h24 ?? 0),
    liquidityUsd: Number(pair.liquidity?.usd ?? 0),
    marketCapUsd: Number(pair.marketCap ?? pair.fdv ?? 0),
    logoURI: pair.info?.imageUrl,
    createdAt: pair.pairCreatedAt ? Number(pair.pairCreatedAt) : undefined,
    xauLaunch: false,
    auditBadge: "none",
  };
}

function applyLive(base: MarketToken, live: MarketToken): MarketToken {
  return {
    ...base,
    symbol: live.symbol && live.symbol !== "?" ? live.symbol : base.symbol,
    name: live.name && live.name !== "Unknown" ? live.name : base.name,
    priceUsd: live.priceUsd,
    change1hPct: live.change1hPct,
    change24hPct: live.change24hPct,
    volume24hUsd: live.volume24hUsd,
    liquidityUsd: live.liquidityUsd,
    marketCapUsd: live.marketCapUsd,
    logoURI: live.logoURI ?? base.logoURI,
    createdAt: base.createdAt ?? live.createdAt,
  };
}

async function fetchJson(url: string, timeoutMs = HTTP_MS): Promise<any> {
  const res = await withTimeout(fetch(url, { headers: { accept: "application/json" } }), timeoutMs);
  if (!res.ok) throw new Error(`dexscreener ${res.status}`);
  return res.json();
}

function bestPairForToken(
  pairs: any[],
  chainKey: string,
  chainId: string,
  address: string,
): any | null {
  const matches = pairs.filter(
    (p) =>
      p.chainId === chainId &&
      p.baseToken?.address &&
      tokenAddressEq(chainKey, p.baseToken.address, address),
  );
  if (matches.length === 0) return null;
  return matches.sort((a, b) => Number(b.liquidity?.usd ?? 0) - Number(a.liquidity?.usd ?? 0))[0];
}

/**
 * Batch price refresh — one DexScreener call per chain (up to 30 addresses each).
 * Fast enough for 2s live ticks.
 */
export async function dexBatchRefresh(tokens: MarketToken[]): Promise<MarketToken[]> {
  if (tokens.length === 0) return tokens;

  const byChain = new Map<string, MarketToken[]>();
  for (const t of tokens) {
    const list = byChain.get(t.chainKey) ?? [];
    list.push(t);
    byChain.set(t.chainKey, list);
  }

  const updated = new Map<string, MarketToken>();

  for (const [chainKey, chainTokens] of byChain) {
    const chainId = DEXSCREENER_CHAIN[chainKey];
    if (!chainId) {
      for (const t of chainTokens) updated.set(tokenCacheKey(t.chainKey, t.address), t);
      continue;
    }

    for (let i = 0; i < chainTokens.length; i += 30) {
      const chunk = chainTokens.slice(i, i + 30);
      const addrs = chunk.map((t) => t.address).join(",");
      try {
        const data = await fetchJson(
          `https://api.dexscreener.com/tokens/v1/${chainId}/${addrs}`,
          BATCH_MS,
        );
        const pairs = (Array.isArray(data) ? data : []) as any[];
        for (const t of chunk) {
          const key = tokenCacheKey(t.chainKey, t.address);
          const pair = bestPairForToken(pairs, chainKey, chainId, t.address);
          const live = pair ? fromDexScreenerPair(pair) : null;
          updated.set(key, live ? applyLive(t, live) : t);
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message, chainKey }, "dex batch refresh failed");
        for (const t of chunk) {
          updated.set(tokenCacheKey(t.chainKey, t.address), t);
        }
      }
    }
  }

  return tokens.map((t) => updated.get(tokenCacheKey(t.chainKey, t.address)) ?? t);
}

/** Hydrate a token address into the best pair on a supported chain. */
export async function dexTokenLookup(address: string, chainKey?: string): Promise<MarketToken | null> {
  try {
    if (chainKey && DEXSCREENER_CHAIN[chainKey]) {
      const chainId = DEXSCREENER_CHAIN[chainKey];
      const data = await fetchJson(
        `https://api.dexscreener.com/tokens/v1/${chainId}/${address}`,
      );
      const pairs = (Array.isArray(data) ? data : []) as any[];
      const pair = bestPairForToken(pairs, chainKey, chainId, address);
      return pair ? fromDexScreenerPair(pair) : null;
    }

    const data = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
    const pairs = (data.pairs ?? []) as any[];
    const match = pairs[0];
    return match ? fromDexScreenerPair(match) : null;
  } catch (err) {
    logger.debug({ err: (err as Error).message, address, chainKey }, "dex token lookup failed");
    return null;
  }
}

/** Trending / volume leaders via token boosts (keyless). */
export async function dexTrendingTokens(limit = 20): Promise<MarketToken[]> {
  try {
    const boosts = (await fetchJson("https://api.dexscreener.com/token-boosts/top/v1")) as any[];
    const tokens: MarketToken[] = [];
    const seen = new Set<string>();
    for (const boost of boosts.slice(0, limit * 2)) {
      const token = await dexTokenLookup(boost.tokenAddress, boost.chainId ? chainIdToKey(boost.chainId) : undefined);
      if (!token) continue;
      const key = `${token.chainKey}:${token.address.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      tokens.push(token);
      if (tokens.length >= limit) break;
    }
    return tokens;
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "dex trending fetch failed");
    return [];
  }
}

function chainIdToKey(chainId: string): string | undefined {
  return Object.entries(DEXSCREENER_CHAIN).find(([, v]) => v === chainId)?.[0];
}

/** DexScreener profile rows — newly listed tokens (not paid boosts). */
type DexProfile = {
  chainId: string;
  tokenAddress: string;
  icon?: string;
  updatedAt?: string;
};

const PROFILE_LATEST = "https://api.dexscreener.com/token-profiles/latest/v1";
const PROFILE_UPDATES = "https://api.dexscreener.com/token-profiles/recent-updates/v1";
/** "Launching now" window — pairs newer than this stay in the rail. */
const LAUNCH_MAX_AGE_MS = 12 * 60 * 60 * 1000;

async function fetchProfileEntries(urls: string[]): Promise<DexProfile[]> {
  const seen = new Set<string>();
  const out: DexProfile[] = [];

  for (const url of urls) {
    try {
      const list = (await fetchJson(url)) as DexProfile[];
      for (const profile of list) {
        if (!chainIdToKey(profile.chainId)) continue;
        const key = `${profile.chainId}:${profile.tokenAddress.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(profile);
      }
    } catch (err) {
      logger.debug({ err: (err as Error).message, url }, "dex profiles fetch failed");
    }
  }

  return out;
}

/** Batch-hydrate profiles via tokens/v1 (one call per chain chunk). */
async function hydrateProfiles(profiles: DexProfile[]): Promise<MarketToken[]> {
  if (profiles.length === 0) return [];

  const byChain = new Map<string, DexProfile[]>();
  for (const profile of profiles) {
    const chainKey = chainIdToKey(profile.chainId);
    if (!chainKey) continue;
    const list = byChain.get(chainKey) ?? [];
    list.push(profile);
    byChain.set(chainKey, list);
  }

  const tokens: MarketToken[] = [];

  await Promise.all(
    [...byChain.entries()].map(async ([chainKey, entries]) => {
      const chainId = DEXSCREENER_CHAIN[chainKey];
      if (!chainId) return;

      for (let i = 0; i < entries.length; i += 30) {
        const chunk = entries.slice(i, i + 30);
        const profileByAddr = new Map(
          chunk.map((entry) => [entry.tokenAddress.toLowerCase(), entry]),
        );
        const addrs = chunk.map((entry) => entry.tokenAddress).join(",");

        try {
          const data = await fetchJson(
            `https://api.dexscreener.com/tokens/v1/${chainId}/${addrs}`,
            BATCH_MS,
          );
          const pairs = (Array.isArray(data) ? data : []) as any[];
          const bestByToken = new Map<string, any>();

          for (const pair of pairs) {
            const addr = pair.baseToken?.address?.toLowerCase();
            if (!addr) continue;
            const prev = bestByToken.get(addr);
            if (!prev || Number(pair.pairCreatedAt ?? 0) > Number(prev.pairCreatedAt ?? 0)) {
              bestByToken.set(addr, pair);
            }
          }

          for (const [addr, pair] of bestByToken) {
            const token = fromDexScreenerPair(pair);
            if (!token) continue;
            const profile = profileByAddr.get(addr);
            tokens.push({
              ...token,
              logoURI: token.logoURI ?? profile?.icon,
              createdAt:
                token.createdAt ??
                (profile?.updatedAt ? Date.parse(profile.updatedAt) : undefined),
            });
          }
        } catch (err) {
          logger.debug({ err: (err as Error).message, chainKey }, "dex profile hydrate failed");
        }
      }
    }),
  );

  return tokens;
}

function filterRecentLaunches(tokens: MarketToken[], limit: number): MarketToken[] {
  const now = Date.now();
  const sorted = [...tokens].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const fresh = sorted.filter((t) => now - (t.createdAt ?? 0) <= LAUNCH_MAX_AGE_MS);
  const pool = fresh.length >= Math.min(6, limit) ? fresh : sorted;
  return pool.slice(0, limit);
}

/**
 * Fresh launches — DexScreener latest token profiles across all supported chains.
 * Uses pairCreatedAt (not paid boosts) so the rail rotates as new tokens list.
 */
export async function dexNewLaunches(limit = 24): Promise<MarketToken[]> {
  const profiles = await fetchProfileEntries([PROFILE_LATEST, PROFILE_UPDATES]);
  const tokens = await hydrateProfiles(profiles);
  return filterRecentLaunches(tokens, limit);
}

/** Lightweight peek — only profiles not already in the live snapshot. */
export async function dexPeekNewLaunches(
  known: Set<string>,
  limit = 12,
): Promise<MarketToken[]> {
  const profiles = await fetchProfileEntries([PROFILE_LATEST]);
  const novel = profiles.filter((profile) => {
    const chainKey = chainIdToKey(profile.chainId);
    if (!chainKey) return false;
    const key = `${chainKey}:${profile.tokenAddress.toLowerCase()}`;
    return !known.has(key);
  });
  if (novel.length === 0) return [];
  const tokens = await hydrateProfiles(novel.slice(0, limit * 2));
  return filterRecentLaunches(tokens, limit);
}
