/**
 * GeckoTerminal — keyless on-chain market data (works when DexScreener blocks server IPs).
 * https://api.geckoterminal.com/docs/index.html
 */
import type { Candle, MarketToken } from "@xauconnect/utils";
import { logger } from "../logger.js";
import { tokenCacheKey } from "./token-address.js";
import { withTimeout } from "./routing/evm.js";

const BASE = "https://api.geckoterminal.com/api/v2";
const HTTP_MS = 8_000;
/** Discovery pacing — public tier ~10 calls/min. */
const DISCOVERY_GAP_MS = 12_000;
/** Token detail / chart lookups — shorter gap so clicks stay responsive. */
const LOOKUP_GAP_MS = 2_500;

export const GECKO_NETWORK: Record<string, string> = {
  ethereum: "eth",
  bsc: "bsc",
  polygon: "polygon_pos",
  arbitrum: "arbitrum",
  base: "base",
  avalanche: "avax",
  solana: "solana",
};

const CHAIN_ROTATION = Object.keys(GECKO_NETWORK);

let lastDiscoveryAt = 0;
let lastLookupAt = 0;
let rotationIdx = 0;
let cachedLaunches: MarketToken[] = [];

function geckoNetworkToKey(networkId: string): string | undefined {
  return Object.entries(GECKO_NETWORK).find(([, id]) => id === networkId)?.[0];
}

function poolIdToAddress(poolId: string): string {
  const idx = poolId.indexOf("_");
  return idx >= 0 ? poolId.slice(idx + 1) : poolId;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function gtFetch(
  path: string,
  kind: "discovery" | "lookup" = "discovery",
  timeoutMs = HTTP_MS,
): Promise<any> {
  const now = Date.now();
  const gap = kind === "lookup" ? LOOKUP_GAP_MS : DISCOVERY_GAP_MS;
  const lastAt = kind === "lookup" ? lastLookupAt : lastDiscoveryAt;
  const wait = gap - (now - lastAt);
  if (wait > 0) await sleep(wait);
  if (kind === "lookup") lastLookupAt = Date.now();
  else lastDiscoveryAt = Date.now();

  const res = await withTimeout(
    fetch(`${BASE}${path}`, {
      headers: { Accept: "application/json;version=20230203" },
    }),
    timeoutMs,
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`geckoterminal ${res.status} ${body.slice(0, 120)}`);
  }
  return res.json();
}

function poolsToTokens(response: { data?: any[]; included?: any[] }): MarketToken[] {
  const included = new Map<string, any>();
  for (const item of response.included ?? []) {
    included.set(item.id, item);
  }

  const tokens: MarketToken[] = [];
  const seen = new Set<string>();

  for (const pool of response.data ?? []) {
    const networkId = pool.relationships?.network?.data?.id as string | undefined;
    const chainKey = networkId ? geckoNetworkToKey(networkId) : undefined;
    if (!chainKey) continue;

    const baseId = pool.relationships?.base_token?.data?.id as string | undefined;
    const base = baseId ? included.get(baseId) : undefined;
    const addr = base?.attributes?.address as string | undefined;
    if (!addr) continue;

    const key = tokenCacheKey(chainKey, addr);
    if (seen.has(key)) continue;
    seen.add(key);

    const attrs = pool.attributes ?? {};
    const baseAttrs = base.attributes ?? {};
    const createdAt = attrs.pool_created_at ? Date.parse(attrs.pool_created_at) : undefined;

    tokens.push({
      chainKey,
      address: addr,
      symbol: baseAttrs.symbol ?? "?",
      name: baseAttrs.name ?? "Unknown",
      priceUsd: Number(attrs.base_token_price_usd ?? 0),
      change1hPct: Number(attrs.price_change_percentage?.h1 ?? 0),
      change24hPct: Number(attrs.price_change_percentage?.h24 ?? 0),
      volume24hUsd: Number(attrs.volume_usd?.h24 ?? 0),
      liquidityUsd: Number(attrs.reserve_in_usd ?? 0),
      marketCapUsd: Number(attrs.market_cap_usd ?? attrs.fdv_usd ?? 0) || undefined,
      logoURI: baseAttrs.image_url,
      createdAt,
      xauLaunch: false,
      auditBadge: "none",
    });
  }

  return tokens;
}

function tokenDetailToMarket(
  chainKey: string,
  body: any,
): (MarketToken & { topPoolAddress?: string; totalSupply?: string; fdvUsd?: number }) | null {
  const data = body?.data;
  if (!data?.attributes) return null;
  const attrs = data.attributes;
  const topPoolId = data.relationships?.top_pools?.data?.[0]?.id as string | undefined;

  return {
    chainKey,
    address: attrs.address,
    symbol: attrs.symbol ?? "?",
    name: attrs.name ?? "Unknown",
    priceUsd: Number(attrs.price_usd ?? 0),
    change1hPct: 0,
    change24hPct: 0,
    volume24hUsd: Number(attrs.volume_usd?.h24 ?? 0),
    liquidityUsd: Number(attrs.total_reserve_in_usd ?? 0),
    marketCapUsd: Number(attrs.market_cap_usd ?? attrs.fdv_usd ?? 0) || undefined,
    logoURI: attrs.image_url,
    createdAt: undefined,
    xauLaunch: false,
    auditBadge: "none",
    topPoolAddress: topPoolId ? poolIdToAddress(topPoolId) : undefined,
    totalSupply: attrs.total_supply ? String(attrs.total_supply) : undefined,
    fdvUsd: attrs.fdv_usd ? Number(attrs.fdv_usd) : undefined,
  };
}

/** Latest launches across all supported chains (one GeckoTerminal call per invocation). */
export async function gtNewLaunches(limit = 24): Promise<MarketToken[]> {
  try {
    const idx = rotationIdx++ % (CHAIN_ROTATION.length + 1);
    let tokens: MarketToken[] = [];

    if (idx === 0) {
      const body = await gtFetch("/networks/new_pools?include=base_token,dex", "discovery");
      tokens = poolsToTokens(body);
    } else {
      const chainKey = CHAIN_ROTATION[idx - 1] as string;
      const network = GECKO_NETWORK[chainKey];
      if (!network) return cachedLaunches.slice(0, limit);
      const body = await gtFetch(`/networks/${network}/new_pools?include=base_token,dex`, "discovery");
      tokens = poolsToTokens(body);
    }

    const sorted = tokens
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, limit);

    if (sorted.length > 0) cachedLaunches = sorted;
    return sorted.length > 0 ? sorted : cachedLaunches.slice(0, limit);
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "gecko new launches failed");
    return cachedLaunches.slice(0, limit);
  }
}

/** Full token detail for a single address. */
export async function gtTokenLookup(
  chainKey: string,
  address: string,
): Promise<(MarketToken & { topPoolAddress?: string; totalSupply?: string; fdvUsd?: number }) | null> {
  const network = GECKO_NETWORK[chainKey];
  if (!network) return null;
  try {
    const body = await gtFetch(`/networks/${network}/tokens/${address}`, "lookup");
    return tokenDetailToMarket(chainKey, body);
  } catch (err) {
    logger.debug({ err: (err as Error).message, chainKey, address }, "gecko token lookup failed");
    return null;
  }
}

const OHLCV_TF: Record<string, { tf: string; agg: number }> = {
  "1m": { tf: "minute", agg: 1 },
  "5m": { tf: "minute", agg: 5 },
  "15m": { tf: "minute", agg: 15 },
  "30m": { tf: "minute", agg: 30 },
  "1h": { tf: "hour", agg: 1 },
  "4h": { tf: "hour", agg: 4 },
  "1d": { tf: "day", agg: 1 },
};

const OHLCV_LIMIT = 300;

export async function gtCandles(
  chainKey: string,
  poolAddress: string,
  interval: "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d",
): Promise<Candle[]> {
  const network = GECKO_NETWORK[chainKey];
  const spec = OHLCV_TF[interval];
  if (!network || !spec) return [];

  try {
    const body = await gtFetch(
      `/networks/${network}/pools/${poolAddress}/ohlcv/${spec.tf}?aggregate=${spec.agg}&limit=${OHLCV_LIMIT}`,
      "lookup",
    );
    const list = body?.data?.attributes?.ohlcv_list as number[][] | undefined;
    if (!list?.length) return [];
    return list
      .filter((row) => row.length >= 5)
      .map(([time, open, high, low, close, volume]) => ({
        time: Number(time),
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: volume !== undefined ? Number(volume) : undefined,
      }));
  } catch (err) {
    logger.debug({ err: (err as Error).message, chainKey, poolAddress }, "gecko ohlcv failed");
    return [];
  }
}
