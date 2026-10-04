/**
 * Unified token lookup — GeckoTerminal + DexScreener + on-chain in parallel (merged).
 */
import type { MarketToken } from "@xauconnect/utils";
import { env } from "../config.js";
import { dexTokenLookup } from "./dexscreener.js";
import { gtTokenLookup } from "./geckoterminal.js";
import { hydratePoolFromAddress } from "../indexer/hydrate.js";
import { getTokenPrice, type OnchainTokenResult } from "../indexer/price-service.js";
import { tokenCacheKey } from "./token-address.js";

const TOKEN_CACHE_MS = 8_000;
/** Keep last good snapshot when live APIs flake or a token drops off discovery feeds. */
const STICKY_CACHE_MS = 15 * 60_000;
const tokenCache = new Map<string, { at: number; token: EnrichedMarketToken }>();
const stickyCache = new Map<string, { at: number; token: EnrichedMarketToken }>();

function rememberToken(key: string, token: EnrichedMarketToken): EnrichedMarketToken {
  const now = Date.now();
  tokenCache.set(key, { at: now, token });
  stickyCache.set(key, { at: now, token });
  return token;
}

/** Persist a resolved token so later refetches survive feed rotation / API blips. */
export function seedStickyToken(
  chainKey: string,
  address: string,
  token: EnrichedMarketToken,
): EnrichedMarketToken {
  return rememberToken(tokenCacheKey(chainKey, address), token);
}

function stickyToken(key: string): EnrichedMarketToken | null {
  const hit = stickyCache.get(key);
  if (!hit || Date.now() - hit.at >= STICKY_CACHE_MS) return null;
  return hit.token;
}

export type EnrichedMarketToken = MarketToken & {
  topPoolAddress?: string;
  totalSupply?: string;
  fdvUsd?: number;
  description?: string;
  websites?: string[];
  socials?: Array<{ type: string; url: string }>;
  sources?: string[];
};

function mergePair(
  a: EnrichedMarketToken | null,
  b: EnrichedMarketToken | MarketToken | OnchainTokenResult | null,
): EnrichedMarketToken | null {
  if (!a && !b) return null;
  if (!a) return { ...(b as EnrichedMarketToken), sources: (b as EnrichedMarketToken).sources ?? [] };
  if (!b) return a;

  const bEnriched = b as EnrichedMarketToken;
  const sources = [...new Set([...(a.sources ?? []), ...(bEnriched.sources ?? [])])];

  return {
    chainKey: a.chainKey,
    address: a.address,
    symbol: a.symbol || bEnriched.symbol,
    name: a.name || bEnriched.name,
    priceUsd: a.priceUsd > 0 ? a.priceUsd : bEnriched.priceUsd,
    change1hPct: bEnriched.change1hPct ?? a.change1hPct ?? 0,
    change24hPct: bEnriched.change24hPct ?? a.change24hPct ?? 0,
    volume24hUsd: Math.max(a.volume24hUsd, bEnriched.volume24hUsd ?? 0),
    liquidityUsd: Math.max(a.liquidityUsd, bEnriched.liquidityUsd ?? 0),
    marketCapUsd:
      a.marketCapUsd && a.marketCapUsd > 0
        ? a.marketCapUsd
        : bEnriched.marketCapUsd && bEnriched.marketCapUsd > 0
          ? bEnriched.marketCapUsd
          : undefined,
    fdvUsd:
      a.fdvUsd && a.fdvUsd > 0
        ? a.fdvUsd
        : bEnriched.fdvUsd && bEnriched.fdvUsd > 0
          ? bEnriched.fdvUsd
          : a.marketCapUsd,
    logoURI: a.logoURI ?? bEnriched.logoURI,
    createdAt: a.createdAt ?? bEnriched.createdAt,
    xauLaunch: a.xauLaunch || bEnriched.xauLaunch,
    auditBadge: a.auditBadge !== "none" ? a.auditBadge : bEnriched.auditBadge,
    topPoolAddress: a.topPoolAddress ?? bEnriched.topPoolAddress,
    totalSupply: a.totalSupply ?? bEnriched.totalSupply,
    description: a.description ?? bEnriched.description,
    websites: a.websites ?? bEnriched.websites,
    socials: a.socials ?? bEnriched.socials,
    sources,
  };
}

function mergeTokens(
  gecko: EnrichedMarketToken | null,
  dex: MarketToken | null,
): EnrichedMarketToken | null {
  if (!gecko && !dex) return null;
  if (!gecko) return { ...dex!, sources: ["dexscreener"] };
  if (!dex) return { ...gecko, sources: ["geckoterminal"] };

  const sources: string[] = [];
  if (gecko.priceUsd > 0 || gecko.liquidityUsd > 0) sources.push("geckoterminal");
  if (dex.priceUsd > 0 || dex.liquidityUsd > 0) sources.push("dexscreener");
  if (sources.length === 0) sources.push("geckoterminal", "dexscreener");

  return {
    chainKey: gecko.chainKey,
    address: gecko.address,
    symbol: gecko.symbol || dex.symbol,
    name: gecko.name || dex.name,
    priceUsd: gecko.priceUsd > 0 ? gecko.priceUsd : dex.priceUsd,
    change1hPct: dex.change1hPct ?? gecko.change1hPct ?? 0,
    change24hPct: dex.change24hPct ?? gecko.change24hPct ?? 0,
    volume24hUsd: Math.max(gecko.volume24hUsd, dex.volume24hUsd),
    liquidityUsd: Math.max(gecko.liquidityUsd, dex.liquidityUsd),
    marketCapUsd:
      gecko.marketCapUsd && gecko.marketCapUsd > 0
        ? gecko.marketCapUsd
        : dex.marketCapUsd && dex.marketCapUsd > 0
          ? dex.marketCapUsd
          : undefined,
    logoURI: gecko.logoURI ?? dex.logoURI,
    createdAt: dex.createdAt ?? gecko.createdAt,
    xauLaunch: gecko.xauLaunch || dex.xauLaunch,
    auditBadge: gecko.auditBadge !== "none" ? gecko.auditBadge : dex.auditBadge,
    topPoolAddress: gecko.topPoolAddress,
    totalSupply: gecko.totalSupply,
    fdvUsd: gecko.fdvUsd,
    sources,
  };
}

export async function lookupToken(
  chainKey: string,
  address: string,
): Promise<EnrichedMarketToken | null> {
  const key = tokenCacheKey(chainKey, address);
  const hit = tokenCache.get(key);
  if (hit && Date.now() - hit.at < TOKEN_CACHE_MS) return hit.token;

  const useExternal = env.MARKET_SOURCE !== "db";
  const useOnchain = env.MARKET_SOURCE !== "external";

  // Indexer/on-chain first — our own RPC + Postgres, not third-party APIs.
  let merged: EnrichedMarketToken | null = null;
  if (useOnchain) {
    merged = await getTokenPrice(chainKey, address);
  }

  let gecko: EnrichedMarketToken | null = null;
  let dex: MarketToken | null = null;

  if (useExternal && (!merged || env.MARKET_SOURCE === "hybrid")) {
    const [geckoRes, dexRes] = await Promise.allSettled([
      gtTokenLookup(chainKey, address),
      dexTokenLookup(address, chainKey),
    ]);
    gecko = geckoRes.status === "fulfilled" ? geckoRes.value : null;
    dex = dexRes.status === "fulfilled" ? dexRes.value : null;
    const external = mergeTokens(gecko, dex);
    if (external?.topPoolAddress) {
      await hydratePoolFromAddress(chainKey, address, external.topPoolAddress).catch(() => {});
    }
    merged = mergePair(merged, external);
    if (!merged && useOnchain) {
      merged = await getTokenPrice(chainKey, address, external?.topPoolAddress);
    }
  }

  if (merged) return rememberToken(key, merged);

  return stickyToken(key);
}
