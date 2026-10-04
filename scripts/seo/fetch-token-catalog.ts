/**
 * Build deduplicated token catalog from Postgres, CoinGecko, DexScreener, and defaults.
 *
 * Real tokens only — no synthetic padding. Market figures (price, 24h change,
 * volume, market cap, liquidity) are captured here so SEO pages can render
 * genuine, data-backed content instead of templated prose.
 */
import { CHAINS, DEFAULT_TOKENS } from "@xauconnect/utils";
import {
  saveTokenCatalog,
  tokenSlug,
  type TokenCatalogEntry,
} from "@xauconnect/seo";
import { fetchJson, loadEnv, log } from "./lib/env.js";

const TODAY = new Date().toISOString().slice(0, 10);

const COINGECKO_PLATFORM: Record<string, string> = {
  ethereum: "ethereum",
  bsc: "binance-smart-chain",
  polygon: "polygon-pos",
  arbitrum: "arbitrum-one",
  base: "base",
  avalanche: "avalanche",
  solana: "solana",
};

const MEME_SYMBOLS = new Set([
  "PEPE", "SHIB", "DOGE", "BONK", "WIF", "FLOKI", "BRETT", "MOG", "BOME", "MYRO",
  "POPCAT", "MEW", "BILLY", "GIGA", "NEIRO", "TURBO", "LADYS", "WOJAK", "MEME",
]);

function key(chainKey: string, address: string): string {
  return `${chainKey}:${address.toLowerCase()}`;
}

/**
 * Reject synthetic / placeholder tokens. The production DB was historically
 * seeded with rows like "Ethereum Token 26" / symbol "TK26"; those must never
 * reach the SEO catalog (they produce pages about tokens that do not exist).
 */
function isPlaceholderToken(symbol: string, name: string, address: string): boolean {
  const sym = (symbol ?? "").trim();
  const nm = (name ?? "").trim();
  if (!sym || !nm || !address) return true;
  if (/^tk\d+$/i.test(sym)) return true;
  if (/\btoken\s*\d+$/i.test(nm)) return true; // "... Token 21"
  if (/^0x0{20,}$/i.test(address)) return true;
  return false;
}

function addToken(
  map: Map<string, TokenCatalogEntry>,
  entry: Omit<TokenCatalogEntry, "slug"> & { slug?: string },
): void {
  if (isPlaceholderToken(entry.symbol, entry.name, entry.address)) return;
  const slug = entry.slug ?? tokenSlug(entry.symbol, entry.name, entry.address);
  const k = key(entry.chainKey, entry.address);
  const existing = map.get(k);
  if (existing) {
    // Merge richer market data / metadata into an entry we already have.
    if (entry.market && !existing.market) existing.market = entry.market;
    if (entry.coingeckoId && !existing.coingeckoId) existing.coingeckoId = entry.coingeckoId;
    if (entry.marketCapRank != null && existing.marketCapRank == null) {
      existing.marketCapRank = entry.marketCapRank;
    }
    if (entry.logoURI && !existing.logoURI) existing.logoURI = entry.logoURI;
    return;
  }
  map.set(k, {
    ...entry,
    slug,
    isMeme: entry.isMeme ?? MEME_SYMBOLS.has(entry.symbol.toUpperCase()),
  });
}

async function fetchFromDb(map: Map<string, TokenCatalogEntry>): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    const tokens = await prisma.token.findMany({
      take: 5000,
      orderBy: { createdAt: "desc" },
      select: {
        chainKey: true,
        address: true,
        symbol: true,
        name: true,
        decimals: true,
        logoURI: true,
      },
    });
    for (const t of tokens) {
      addToken(map, {
        chainKey: t.chainKey,
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoURI: t.logoURI ?? undefined,
      });
    }
    await prisma.$disconnect();
    log("db", `${tokens.length} tokens`);
  } catch (e) {
    log("db skip", String(e));
  }
}

async function fetchCoinGeckoMarkets(map: Map<string, TokenCatalogEntry>): Promise<void> {
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-cg-pro-api-key"] = apiKey;
  const base = apiKey ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";

  for (let page = 1; page <= 8; page++) {
    const markets = await fetchJson<
      {
        id: string;
        symbol: string;
        name: string;
        market_cap_rank?: number;
        current_price?: number;
        market_cap?: number;
        total_volume?: number;
        price_change_percentage_24h?: number;
      }[]
    >(
      `${base}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}`,
      { headers },
    );
    if (!markets?.length) break;

    for (const coin of markets.slice(0, 80)) {
      const detail = await fetchJson<{
        platforms?: Record<string, string>;
        detail_platforms?: Record<string, { contract_address?: string }>;
      }>(`${base}/coins/${coin.id}?localization=false&tickers=false&community_data=false&developer_data=false`, {
        headers,
      });
      if (!detail?.platforms) continue;

      for (const chain of CHAINS) {
        const platform = COINGECKO_PLATFORM[chain.key];
        if (!platform) continue;
        const addr =
          detail.platforms[platform] ??
          detail.detail_platforms?.[platform]?.contract_address;
        if (!addr) continue;
        const hasPrice = typeof coin.current_price === "number" && coin.current_price > 0;
        addToken(map, {
          chainKey: chain.key,
          address: addr,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          decimals: chain.kind === "solana" ? 9 : 18,
          coingeckoId: coin.id,
          marketCapRank: coin.market_cap_rank,
          isMeme: MEME_SYMBOLS.has(coin.symbol.toUpperCase()),
          market: hasPrice
            ? {
                priceUsd: coin.current_price,
                change24hPct: coin.price_change_percentage_24h ?? undefined,
                volume24hUsd: coin.total_volume ?? undefined,
                marketCapUsd: coin.market_cap ?? undefined,
                marketCapRank: coin.market_cap_rank ?? undefined,
                asOf: TODAY,
                source: "coingecko",
              }
            : undefined,
        });
      }
      await new Promise((r) => setTimeout(r, apiKey ? 120 : 600));
    }
    log("coingecko page", String(page));
  }
}

async function fetchDexScreenerTrending(map: Map<string, TokenCatalogEntry>): Promise<void> {
  for (const chain of CHAINS) {
    // DexScreener identifies chains by slug (ethereum, bsc, polygon, base, ...),
    // which matches our chain keys.
    const dexChainId = chain.key;
    const data = await fetchJson<{
      pairs?: {
        chainId?: string;
        baseToken?: { address: string; symbol: string; name: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
        volume?: { h24?: number };
        priceChange?: { h24?: number };
        marketCap?: number;
        info?: { imageUrl?: string };
      }[];
    }>(`https://api.dexscreener.com/latest/dex/search?q=${chain.nativeSymbol}`);
    for (const pair of data?.pairs?.slice(0, 100) ?? []) {
      const t = pair.baseToken;
      if (!t?.address) continue;
      // DexScreener returns cross-chain results for a query — keep only this chain.
      if (pair.chainId && pair.chainId !== dexChainId) continue;
      const priceUsd = pair.priceUsd ? Number(pair.priceUsd) : undefined;
      const hasPrice = typeof priceUsd === "number" && Number.isFinite(priceUsd) && priceUsd > 0;
      addToken(map, {
        chainKey: chain.key,
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: chain.kind === "solana" ? 9 : 18,
        isMeme: true,
        logoURI: pair.info?.imageUrl,
        market: hasPrice
          ? {
              priceUsd,
              change24hPct: pair.priceChange?.h24 ?? undefined,
              volume24hUsd: pair.volume?.h24 ?? undefined,
              liquidityUsd: pair.liquidity?.usd ?? undefined,
              marketCapUsd: pair.marketCap ?? undefined,
              asOf: TODAY,
              source: "dexscreener",
            }
          : undefined,
      });
    }
  }
}

export async function fetchTokenCatalog(): Promise<TokenCatalogEntry[]> {
  loadEnv();
  const map = new Map<string, TokenCatalogEntry>();

  for (const t of DEFAULT_TOKENS) {
    addToken(map, {
      chainKey: t.chainKey,
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      coingeckoId: t.coingeckoId,
      logoURI: t.logoURI,
    });
  }

  await fetchFromDb(map);
  await fetchCoinGeckoMarkets(map);
  await fetchDexScreenerTrending(map);

  const catalog = [...map.values()].sort(
    (a, b) => (a.marketCapRank ?? 9999) - (b.marketCapRank ?? 9999),
  );
  saveTokenCatalog(catalog);
  log("token catalog", `${catalog.length} entries`);
  return catalog;
}
