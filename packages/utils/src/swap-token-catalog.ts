/**
 * Product swap token catalog — loaded from committed swap-tokens.json.
 */
import { CHAINS, CHAIN_KEYS } from "./chains.js";
import { NATIVE_TOKEN_ADDRESS, SOLANA_NATIVE_MINT } from "./chains.js";
import type { TokenInfo } from "./tokens.js";

import catalogJson from "./data/swap-tokens.json" with { type: "json" };

export type SwapTokenTag = "native" | "stable" | "btc" | "meme";

export type SwapCatalogToken = TokenInfo & {
  marketCapRank?: number;
  tags?: SwapTokenTag[];
};

type CatalogFile = {
  version: number;
  generatedAt: string;
  tokens: SwapCatalogToken[];
};

const catalogData = catalogJson as CatalogFile;
const ALL_CATALOG: SwapCatalogToken[] = catalogData.tokens;

const byChain = new Map<string, SwapCatalogToken[]>();
for (const chainKey of CHAIN_KEYS) {
  byChain.set(chainKey, ALL_CATALOG.filter((t) => t.chainKey === chainKey));
}

export function getSwapTokenCatalog(chainKey?: string): SwapCatalogToken[] {
  if (!chainKey || chainKey === "all") return ALL_CATALOG;
  return byChain.get(chainKey) ?? [];
}

export function getSwapCatalogMeta(): { version: number; generatedAt: string; total: number } {
  return {
    version: catalogData.version,
    generatedAt: catalogData.generatedAt,
    total: ALL_CATALOG.length,
  };
}

export type SearchSwapTokensParams = {
  chainKey?: string;
  search?: string;
  limit?: number;
  offset?: number;
  tags?: SwapTokenTag[];
};

export type SearchSwapTokensResult = {
  tokens: SwapCatalogToken[];
  total: number;
  hasMore: boolean;
};

/** BTC first, then native/stables by rank, then A–Z. */
function compareCatalogTokens(a: SwapCatalogToken, b: SwapCatalogToken): number {
  const aBtc = a.tags?.includes("btc") ? 0 : 1;
  const bBtc = b.tags?.includes("btc") ? 0 : 1;
  if (aBtc !== bBtc) return aBtc - bBtc;

  const aNative = a.tags?.includes("native") ? 0 : 1;
  const bNative = b.tags?.includes("native") ? 0 : 1;
  if (aNative !== bNative) return aNative - bNative;

  const aStable = a.tags?.includes("stable") ? 0 : 1;
  const bStable = b.tags?.includes("stable") ? 0 : 1;
  if (aStable !== bStable) return aStable - bStable;

  const aRank = a.marketCapRank ?? 999_999;
  const bRank = b.marketCapRank ?? 999_999;
  if (aRank !== bRank) return aRank - bRank;

  return a.symbol.localeCompare(b.symbol);
}

export function searchSwapTokens(params: SearchSwapTokensParams = {}): SearchSwapTokensResult {
  const { chainKey, search, tags } = params;
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  let pool = getSwapTokenCatalog(chainKey);

  if (tags?.length) {
    const tagSet = new Set(tags);
    pool = pool.filter((t) => t.tags?.some((tag) => tagSet.has(tag as SwapTokenTag)));
  }

  const q = search?.trim().toLowerCase();
  if (q) {
    pool = pool.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q),
    );
  }

  pool = filterCanonicalBtc(pool);
  pool = [...pool].sort(compareCatalogTokens);

  const total = pool.length;
  const tokens = pool.slice(offset, offset + limit);
  return { tokens, total, hasMore: offset + limit < total };
}

export function findSwapCatalogToken(chainKey: string, address: string): SwapCatalogToken | undefined {
  const lower = address.toLowerCase();
  return getSwapTokenCatalog(chainKey).find(
    (t) => t.chainKey === chainKey && t.address.toLowerCase() === lower,
  );
}

/** Merge catalog entry with TokenInfo — catalog wins on decimals/tags. */
export function enrichTokenInfo(token: TokenInfo): SwapCatalogToken {
  const found = findSwapCatalogToken(token.chainKey, token.address);
  if (found) {
    return {
      ...found,
      ...token,
      decimals: found.decimals,
      tags: found.tags ?? (token.tags as SwapTokenTag[] | undefined),
    };
  }
  return { ...token, tags: token.tags as SwapTokenTag[] | undefined };
}

export function catalogTokenKey(chainKey: string, address: string): string {
  return `${chainKey}:${address.toLowerCase()}`;
}

export function isCatalogNative(chainKey: string, address: string): boolean {
  const chain = CHAINS.find((c) => c.key === chainKey);
  if (!chain) return false;
  if (chain.kind === "solana") return address === SOLANA_NATIVE_MINT;
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

/** One wrapped-BTC mint per chain — filters duplicate/scam BTC entries from the catalog. */
export const CANONICAL_BTC_BY_CHAIN: Record<string, string> = {
  ethereum: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  bsc: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
  polygon: "0x1BFD67037B42Cf73cF2043757aBF6e659E6F5d2e",
  arbitrum: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  base: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
  avalanche: "0x152b9d0FdC40C300757fC614114C7f7000000000",
  solana: "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
};

function filterCanonicalBtc(pool: SwapCatalogToken[]): SwapCatalogToken[] {
  return pool.filter((t) => {
    if (!t.tags?.includes("btc")) return true;
    const canonical = CANONICAL_BTC_BY_CHAIN[t.chainKey];
    if (!canonical) return true;
    return t.address.toLowerCase() === canonical.toLowerCase();
  });
}

export { ALL_CATALOG as SWAP_TOKEN_CATALOG };
