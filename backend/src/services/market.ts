/**
 * Market data service — GeckoTerminal + DexScreener + DB launchpad (no demo).
 */
import { CHAINS, type Candle, type CandleInterval, type DiscoveryTab, type MarketToken } from "@xauconnect/utils";
import { env } from "../config.js";
import { db } from "../db/client.js";
import { ApiError } from "../middleware/error.js";
import { logger } from "../logger.js";
import { gtCandles } from "./geckoterminal.js";
import { candlesFromDb } from "../indexer/aggregator/candles.js";
import { dbRecentIndexedPools } from "../indexer/db/pools.js";
import { discoveryFromCache, getDiscoveryPool } from "./discovery-cache.js";
import { getLiveLaunches } from "./launches.js";
import { lookupToken, seedStickyToken, type EnrichedMarketToken } from "./market-lookup.js";
import { goldCurveMarket } from "./meteora-dbc.js";
import { tokenCacheKey } from "./token-address.js";

async function findCachedToken(
  chainKey: string,
  address: string,
): Promise<EnrichedMarketToken | null> {
  const key = tokenCacheKey(chainKey, address);
  const [{ launches }, discovery] = await Promise.all([getLiveLaunches(), getDiscoveryPool()]);

  for (const t of [...launches, ...discovery]) {
    if (t.chainKey === chainKey && tokenCacheKey(t.chainKey, t.address) === key) {
      return { ...t, sources: ["discovery-cache"] };
    }
  }
  return null;
}

const POLL_MS = 2_000;
const CANDLE_CACHE_MS = 8_000;

let discoveryPool: MarketToken[] = [];
let discoveryLastPoll = 0;
const candleCache = new Map<string, { at: number; candles: Candle[] }>();

async function xauLaunchedTokens(): Promise<MarketToken[]> {
  if (!db) return [];
  try {
    const tokens = await db.token.findMany({
      where: { xauLaunch: true, listingStatus: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const out: MarketToken[] = [];
    for (const t of tokens) {
      const live = await lookupToken(t.chainKey, t.address);
      out.push({
        chainKey: t.chainKey,
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        priceUsd: live?.priceUsd ?? 0,
        change24hPct: live?.change24hPct ?? 0,
        change1hPct: live?.change1hPct ?? 0,
        volume24hUsd: live?.volume24hUsd ?? 0,
        liquidityUsd: live?.liquidityUsd ?? 0,
        marketCapUsd: live?.marketCapUsd ?? 0,
        logoURI: t.logoURI ?? live?.logoURI,
        createdAt: t.createdAt.getTime(),
        xauLaunch: true,
        auditBadge: t.auditBadge.toLowerCase() as MarketToken["auditBadge"],
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function ensureDiscoveryPool(): Promise<MarketToken[]> {
  const now = Date.now();
  const { launches } = await getLiveLaunches();
  const ours = await xauLaunchedTokens();

  const seen = new Set<string>();
  discoveryPool = [];
  for (const t of [...ours, ...launches]) {
    const key = tokenCacheKey(t.chainKey, t.address);
    if (seen.has(key)) continue;
    seen.add(key);
    discoveryPool.push(t);
  }

  if (discoveryPool.length === 0) {
    logger.warn("discovery empty — launch feed returned no tokens");
  }

  if (now - discoveryLastPoll >= POLL_MS) {
    discoveryLastPoll = now;
  }

  return discoveryPool.map((t) => ({ ...t }));
}

export async function discovery(tab: DiscoveryTab, chainKey?: string): Promise<MarketToken[]> {
  return discoveryFromCache(tab, chainKey);
}

export async function tokenDetail(chainKey: string, address: string): Promise<EnrichedMarketToken> {
  let token = await lookupToken(chainKey, address);

  if (!token) {
    const cached = await findCachedToken(chainKey, address);
    if (cached) token = seedStickyToken(chainKey, address, cached);
  }

  if (!token && db) {
    const row = await db.token.findUnique({
      where: { chainKey_address: { chainKey, address } },
    });
    if (row) {
      token = seedStickyToken(chainKey, address, {
        chainKey: row.chainKey,
        address: row.address,
        symbol: row.symbol,
        name: row.name,
        priceUsd: 0,
        change24hPct: 0,
        volume24hUsd: 0,
        liquidityUsd: 0,
        logoURI: row.logoURI ?? undefined,
        createdAt: row.createdAt.getTime(),
        xauLaunch: row.xauLaunch,
        auditBadge: row.auditBadge.toLowerCase() as MarketToken["auditBadge"],
      });
    }
  }

  if (!token) {
    throw new ApiError(404, `Token not found: ${chainKey}/${address}`, "TOKEN_NOT_FOUND");
  }

  return withCurveMarket(await withLaunchRow(token));
}

/** Keep the XAU launch badge when a live feed already returned the token. */
async function withLaunchRow(token: EnrichedMarketToken): Promise<EnrichedMarketToken> {
  if (!db) return token;
  try {
    const row = await db.token.findUnique({
      where: { chainKey_address: { chainKey: token.chainKey, address: token.address } },
      select: {
        xauLaunch: true,
        logoURI: true,
        name: true,
        symbol: true,
        createdAt: true,
        auditBadge: true,
      },
    });
    if (!row) return token;
    return {
      ...token,
      xauLaunch: token.xauLaunch || row.xauLaunch,
      logoURI: token.logoURI || row.logoURI || undefined,
      name: token.name && token.name !== "Unknown" ? token.name : row.name,
      symbol: token.symbol && token.symbol !== "?" ? token.symbol : row.symbol,
      createdAt: token.createdAt ?? row.createdAt.getTime(),
      auditBadge:
        token.auditBadge !== "none"
          ? token.auditBadge
          : (row.auditBadge.toLowerCase() as MarketToken["auditBadge"]),
    };
  } catch (err) {
    logger.debug({ err: (err as Error).message }, "launch row lookup failed");
    return token;
  }
}

/** Replace feed numbers with the curve's own price, quote, and swap volume. */
async function withCurveMarket(token: EnrichedMarketToken): Promise<EnrichedMarketToken> {
  if (token.chainKey !== "solana") return token;
  try {
    const curve = await goldCurveMarket(token.address, { priceUsd: token.priceUsd });
    if (!curve) return token;
    return {
      ...token,
      priceUsd: curve.priceUsd,
      liquidityUsd: curve.liquidityUsd,
      volume24hUsd: curve.volume24hUsd ?? token.volume24hUsd,
      marketCapUsd: curve.marketCapUsd,
      fdvUsd: curve.fdvUsd,
      change24hPct: curve.change24hPct ?? token.change24hPct,
      change1hPct: curve.change1hPct ?? token.change1hPct,
      holders: curve.holders ?? token.holders,
      topPoolAddress: token.topPoolAddress ?? curve.pool,
      sources: [...new Set([...(token.sources ?? []), "gold-curve"])],
    };
  } catch (err) {
    logger.debug({ err: (err as Error).message, address: token.address }, "gold curve market overlay failed");
    return token;
  }
}

function singlePointCandle(token: { priceUsd: number; volume24hUsd: number }): Candle[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    {
      time: now,
      open: token.priceUsd,
      high: token.priceUsd,
      low: token.priceUsd,
      close: token.priceUsd,
      volume: token.volume24hUsd / 24,
    },
  ];
}

export async function candles(
  chainKey: string,
  address: string,
  interval: CandleInterval,
): Promise<Candle[]> {
  const cacheKey = `${chainKey}:${address}:${interval}`;
  const hit = candleCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CANDLE_CACHE_MS) return hit.candles;

  const dbBars =
    env.MARKET_SOURCE !== "external" ? await candlesFromDb(chainKey, address, interval, 300) : [];

  if (env.MARKET_SOURCE === "db") {
    const result = dbBars.length > 0 ? dbBars : singlePointCandle(await tokenDetail(chainKey, address));
    candleCache.set(cacheKey, { at: Date.now(), candles: result });
    return result;
  }

  const token = await tokenDetail(chainKey, address);
  const poolAddress = token.topPoolAddress;
  let external: Candle[] = [];
  if (poolAddress) {
    external = await gtCandles(chainKey, poolAddress, interval);
  }

  const result =
    external.length >= dbBars.length && external.length > 0
      ? external
      : dbBars.length > 0
        ? dbBars
        : external.length > 0
          ? external
          : singlePointCandle(token);

  candleCache.set(cacheKey, { at: Date.now(), candles: result });
  return result;
}

type TickerRow = {
  chainKey: string;
  symbol: string;
  address: string;
  priceUsd: number;
  change24hPct: number;
};

let tickerRows: TickerRow[] = [];
let tickerListAt = 0;
const TICKER_LIST_MS = 60_000;

/** Stable marquee feed — fixed token set, deduped by address, in-place price updates. */
export async function tickerPrices(): Promise<TickerRow[]> {
  const now = Date.now();
  if (tickerRows.length === 0 || now - tickerListAt >= TICKER_LIST_MS) {
    const tokens = await discovery("volume");
    const seen = new Set<string>();
    const next: TickerRow[] = [];
    for (const t of tokens) {
      const key = tokenCacheKey(t.chainKey, t.address);
      if (seen.has(key)) continue;
      seen.add(key);
      next.push({
        chainKey: t.chainKey,
        symbol: t.symbol,
        address: t.address,
        priceUsd: t.priceUsd,
        change24hPct: t.change24hPct,
      });
      if (next.length >= 12) break;
    }
    next.sort((a, b) => tokenCacheKey(a.chainKey, a.address).localeCompare(tokenCacheKey(b.chainKey, b.address)));
    tickerRows = next;
    tickerListAt = now;
    return tickerRows.map((t) => ({ ...t }));
  }

  const byKey = new Map(tickerRows.map((t) => [tokenCacheKey(t.chainKey, t.address), t]));
  const pool = await ensureDiscoveryPool();
  for (const t of pool) {
    const key = tokenCacheKey(t.chainKey, t.address);
    const row = byKey.get(key);
    if (row) {
      row.priceUsd = t.priceUsd;
      row.change24hPct = t.change24hPct;
    }
  }
  return tickerRows.map((t) => ({ ...t }));
}

export function supportedChains() {
  return CHAINS.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
    kind: c.kind,
    nativeSymbol: c.nativeSymbol,
    color: c.color,
    explorerUrl: c.explorerUrl,
  }));
}
