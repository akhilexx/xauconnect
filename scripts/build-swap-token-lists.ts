/**
 * Build product swap token catalog (100+ verified tokens per chain).
 * Output: packages/utils/src/data/swap-tokens.json
 *
 * Usage: pnpm exec tsx scripts/build-swap-token-lists.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAINS, DEFAULT_TOKENS, NATIVE_TOKEN_ADDRESS, SOLANA_NATIVE_MINT } from "@xauconnect/utils";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "packages/utils/src/data/swap-tokens.json");
const MIN_PER_CHAIN = 100;

/** CoinGecko curated token list URLs (Uniswap-style JSON). */
const COINGECKO_TOKEN_LIST: Record<string, string> = {
  ethereum: "https://tokens.coingecko.com/ethereum/all.json",
  bsc: "https://tokens.coingecko.com/binance-smart-chain/all.json",
  polygon: "https://tokens.coingecko.com/polygon-pos/all.json",
  arbitrum: "https://tokens.coingecko.com/arbitrum-one/all.json",
  base: "https://tokens.coingecko.com/base/all.json",
  avalanche: "https://tokens.coingecko.com/avalanche/all.json",
  solana: "https://tokens.coingecko.com/solana/all.json",
};

const STABLE_SYMBOLS = new Set(["USDC", "USDT", "DAI", "FRAX", "BUSD", "TUSD", "USDP", "LUSD", "USDCE"]);
const MEME_SYMBOLS = new Set([
  "PEPE", "SHIB", "DOGE", "BONK", "WIF", "FLOKI", "BRETT", "MOG", "BOME", "MYRO",
  "POPCAT", "MEW", "NEIRO", "TURBO", "LADYS", "WOJAK", "MEME", "TRUMP", "PNUT",
]);

/** Canonical wrapped BTC per chain — displayed as BTC in UI. */
const WRAPPED_BTC: Record<
  string,
  { address: string; symbol: string; name: string; decimals: number; coingeckoId?: string }
> = {
  ethereum: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    symbol: "BTC",
    name: "Wrapped BTC (WBTC)",
    decimals: 8,
    coingeckoId: "wrapped-bitcoin",
  },
  bsc: {
    address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
    symbol: "BTC",
    name: "Binance-Peg BTC (BTCB)",
    decimals: 18,
    coingeckoId: "bitcoin-bep2",
  },
  polygon: {
    address: "0x1BFD67037B42Cf73cF2043757aBF6e659E6F5d2e",
    symbol: "BTC",
    name: "Wrapped BTC (Polygon)",
    decimals: 8,
    coingeckoId: "wrapped-bitcoin",
  },
  arbitrum: {
    address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    symbol: "BTC",
    name: "Wrapped BTC (Arbitrum)",
    decimals: 8,
    coingeckoId: "wrapped-bitcoin",
  },
  base: {
    address: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    symbol: "BTC",
    name: "Coinbase Wrapped BTC (cbBTC)",
    decimals: 8,
    coingeckoId: "coinbase-wrapped-btc",
  },
  avalanche: {
    address: "0x152b9d0FdC40C300757fC614114C7f7000000000",
    symbol: "BTC",
    name: "Bitcoin (BTC.b)",
    decimals: 8,
    coingeckoId: "bitcoin-avalanche-bridged-btc-b",
  },
  solana: {
    address: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    symbol: "BTC",
    name: "Coinbase Wrapped BTC (cbBTC)",
    decimals: 8,
    coingeckoId: "coinbase-wrapped-btc",
  },
};

export type SwapCatalogEntry = {
  chainKey: string;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  coingeckoId?: string;
  logoURI?: string;
  marketCapRank?: number;
  tags?: string[];
};

function tokenKey(chainKey: string, address: string): string {
  return `${chainKey}:${address.toLowerCase()}`;
}

const EVM_ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
const SOL_ADDR_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidCatalogAddress(chainKey: string, address: string): boolean {
  const chain = CHAINS.find((c) => c.key === chainKey);
  if (!chain) return false;
  if (chain.kind === "solana") {
    return address === SOLANA_NATIVE_MINT || SOL_ADDR_RE.test(address);
  }
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase() || EVM_ADDR_RE.test(address);
}

function tagsFor(symbol: string, isNative: boolean): string[] {
  const out: string[] = [];
  const sym = symbol.toUpperCase();
  if (isNative) out.push("native");
  if (sym === "BTC" || sym === "WBTC" || sym === "BTCB" || sym === "CBBTC") out.push("btc");
  if (STABLE_SYMBOLS.has(sym)) out.push("stable");
  if (MEME_SYMBOLS.has(sym)) out.push("meme");
  return out;
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json", ...headers } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function loadEnv(): void {
  const { readFileSync, existsSync } = require("node:fs") as typeof import("node:fs");
  for (const file of [join(ROOT, ".local/production.env"), join(ROOT, ".env")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = apiKey ? { "x-cg-pro-api-key": apiKey } : {};
  const base = apiKey ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";

  const map = new Map<string, SwapCatalogEntry>();

  const add = (entry: SwapCatalogEntry) => {
    if (!isValidCatalogAddress(entry.chainKey, entry.address)) return;
    const k = tokenKey(entry.chainKey, entry.address);
    const existing = map.get(k);
    if (existing && (existing.marketCapRank ?? 99999) <= (entry.marketCapRank ?? 99999)) return;
    map.set(k, entry);
  };

  for (const t of DEFAULT_TOKENS) {
    add({
      chainKey: t.chainKey,
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      coingeckoId: t.coingeckoId,
      logoURI: t.logoURI,
      marketCapRank: 1,
      tags: tagsFor(t.symbol, t.address === NATIVE_TOKEN_ADDRESS || t.address === SOLANA_NATIVE_MINT),
    });
  }

  for (const chain of CHAINS) {
    const btc = WRAPPED_BTC[chain.key];
    if (!btc) continue;
    add({
      chainKey: chain.key,
      address: btc.address,
      symbol: btc.symbol,
      name: btc.name,
      decimals: btc.decimals,
      coingeckoId: btc.coingeckoId,
      marketCapRank: 2,
      tags: ["btc"],
    });
  }

  for (const chain of CHAINS) {
    const listUrl = COINGECKO_TOKEN_LIST[chain.key];
    if (!listUrl) continue;
    const list = await fetchJson<{
      tokens?: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        logoURI?: string;
      }[];
    }>(listUrl);
    const nativeAddr = chain.kind === "solana" ? SOLANA_NATIVE_MINT : NATIVE_TOKEN_ADDRESS;
    let rank = 10;
    for (const t of list?.tokens ?? []) {
      if (!t.address || !t.symbol) continue;
      add({
        chainKey: chain.key,
        address: t.address,
        symbol: t.symbol.toUpperCase(),
        name: t.name,
        decimals: t.decimals,
        logoURI: t.logoURI,
        marketCapRank: rank++,
        tags: tagsFor(t.symbol, t.address.toLowerCase() === nativeAddr.toLowerCase()),
      });
      if (rank > 500) break;
    }
    console.log(`[swap-catalog] coingecko list ${chain.key}: ${Math.min(rank - 10, list?.tokens?.length ?? 0)}`);
  }

  for (const chain of CHAINS) {
    const data = await fetchJson<{ pairs?: { baseToken?: { address: string; symbol: string; name: string } }[] }>(
      `https://api.dexscreener.com/latest/dex/search?q=${chain.nativeSymbol}`,
    );
    for (const pair of data?.pairs?.slice(0, 80) ?? []) {
      const t = pair.baseToken;
      if (!t?.address) continue;
      add({
        chainKey: chain.key,
        address: t.address,
        symbol: t.symbol.toUpperCase(),
        name: t.name,
        decimals: chain.kind === "solana" ? 9 : 18,
        marketCapRank: 500,
        tags: tagsFor(t.symbol, false),
      });
    }
  }

  const perChain = new Map<string, SwapCatalogEntry[]>();
  for (const entry of map.values()) {
    const list = perChain.get(entry.chainKey) ?? [];
    list.push(entry);
    perChain.set(entry.chainKey, list);
  }

  for (const chain of CHAINS) {
    const list = perChain.get(chain.key) ?? [];
    list.sort((a, b) => (a.marketCapRank ?? 9999) - (b.marketCapRank ?? 9999));
    console.log(`[swap-catalog] ${chain.key}: ${list.length} tokens`);
    if (list.length < MIN_PER_CHAIN) {
      console.warn(`[swap-catalog] WARNING: ${chain.key} has only ${list.length} tokens (target ${MIN_PER_CHAIN})`);
    }
  }

  const catalog = [...map.values()].sort((a, b) => {
    if (a.chainKey !== b.chainKey) return a.chainKey.localeCompare(b.chainKey);
    return (a.marketCapRank ?? 9999) - (b.marketCapRank ?? 9999);
  });

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), tokens: catalog }, null, 2));
  console.log(`[swap-catalog] wrote ${catalog.length} entries → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
