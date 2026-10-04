/**
 * Launch feed — XAU launchpad (DB) + GeckoTerminal + DexScreener (parallel merge).
 */
import type { MarketToken } from "@xauconnect/utils";
import { env } from "../config.js";
import { db } from "../db/client.js";
import { dexNewLaunches } from "./dexscreener.js";
import { dbRecentIndexedPools } from "../indexer/db/pools.js";
import { gtNewLaunches } from "./geckoterminal.js";
import { lookupToken } from "./market-lookup.js";
import { tokenCacheKey } from "./token-address.js";

const POLL_MS = 2_000;
const REFRESH_MS = 12_000;

let snapshot: MarketToken[] = [];
let externalPool: MarketToken[] = [];
let lastRefreshAt = 0;
let lastPollAt = 0;

const POOL_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export async function dbRecentLaunches(limit = 24): Promise<MarketToken[]> {
  if (!db) return [];
  try {
    const tokens = await db.token.findMany({
      where: { xauLaunch: true },
      orderBy: { createdAt: "desc" },
      take: limit,
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
        holders: 1,
        logoURI: t.logoURI ?? live?.logoURI,
        createdAt: t.createdAt.getTime(),
        xauLaunch: true,
        auditBadge: (t.auditBadge.toLowerCase() as MarketToken["auditBadge"]) ?? "none",
      });
    }
    return out;
  } catch {
    return [];
  }
}

function mergeLaunches(ours: MarketToken[], external: MarketToken[], limit = 24): MarketToken[] {
  const seen = new Set<string>();
  const merged: MarketToken[] = [];
  for (const t of [...ours, ...external]) {
    const key = tokenCacheKey(t.chainKey, t.address);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(t);
  }
  return merged
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .slice(0, limit);
}

/** Full ingest — DB + external APIs merged (hybrid always supplements with Gecko/Dex). */
export async function getLiveLaunchesFresh(): Promise<MarketToken[]> {
  const now = Date.now();
  const [ours, indexed] = await Promise.all([dbRecentLaunches(12), dbRecentIndexedPools(56)]);

  if (env.MARKET_SOURCE !== "db") {
    const [geckoBatch, dexBatch] = await Promise.all([
      gtNewLaunches(24),
      dexNewLaunches(24).catch(() => [] as MarketToken[]),
    ]);
    const batch = mergeLaunches(geckoBatch, dexBatch, 36);
    externalPool = mergeLaunches(externalPool, batch, 48).filter(
      (t) => now - (t.createdAt ?? now) <= POOL_MAX_AGE_MS,
    );
  }

  return mergeLaunches(mergeLaunches(ours, indexed), externalPool, 48).slice(0, 24);
}

/**
 * Live launch list — serves cached snapshot every 2s; refreshes every 12s.
 */
export async function getLiveLaunches(): Promise<{ launches: MarketToken[]; syncedAt: number }> {
  const now = Date.now();

  if (snapshot.length === 0 || now - lastRefreshAt >= REFRESH_MS) {
    const fresh = await getLiveLaunchesFresh();
    if (fresh.length > 0) {
      snapshot = fresh;
      lastRefreshAt = now;
    }
    lastPollAt = now;
    return { launches: snapshot.map((t) => ({ ...t })), syncedAt: lastPollAt };
  }

  if (now - lastPollAt >= POLL_MS) {
    lastPollAt = now;
  }

  return { launches: snapshot.map((t) => ({ ...t })), syncedAt: lastPollAt || now };
}
