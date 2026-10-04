/**
 * Generate curated cross-chain swap SEO entries — directed chain pairs limited
 * to liquid major assets (stablecoins + blue chips). No mid-cap filler, no fixed
 * 5,000 target: the matrix is intentionally small so every route is real and useful.
 */
import { CHAINS, getChainByKey } from "@xauconnect/utils";
import { pairSlug, saveCrossChainEntries, type CrossChainEntry, type TokenCatalogEntry } from "@xauconnect/seo";
import { log } from "./lib/env.js";

const ORIGIN_TOKENS_PER_ROUTE = 6;
const DEST_TOKENS_PER_ROUTE = 5;

/** Only these liquid majors are eligible for cross-chain landing pages. */
const LIQUID_SYMBOLS = [
  "USDC",
  "USDT",
  "DAI",
  "ETH",
  "WETH",
  "BTC",
  "WBTC",
  "BNB",
  "SOL",
  "AVAX",
  "POL",
  "MATIC",
  "ARB",
  "OP",
  "LINK",
];

/** Pick only liquid-major tokens for a chain, ordered by the curated list. */
function pickTokensForChain(catalog: TokenCatalogEntry[], chainKey: string, limit: number): TokenCatalogEntry[] {
  const chainTokens = catalog.filter((t) => t.chainKey === chainKey);
  const picked: TokenCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const sym of LIQUID_SYMBOLS) {
    const match = chainTokens.find((t) => t.symbol.toUpperCase() === sym);
    if (match && !seen.has(match.address.toLowerCase())) {
      picked.push(match);
      seen.add(match.address.toLowerCase());
    }
    if (picked.length >= limit) break;
  }

  return picked.slice(0, limit);
}

export function generateCrossChainEntries(catalog: TokenCatalogEntry[]): CrossChainEntry[] {
  const entries: CrossChainEntry[] = [];
  const seen = new Set<string>();

  for (const from of CHAINS) {
    for (const to of CHAINS) {
      if (from.key === to.key) continue;

      const fromChain = getChainByKey(from.key);
      const toChain = getChainByKey(to.key);
      if (!fromChain || !toChain) continue;

      const originTokens = pickTokensForChain(catalog, from.key, ORIGIN_TOKENS_PER_ROUTE);
      const destTokens = pickTokensForChain(catalog, to.key, DEST_TOKENS_PER_ROUTE);

      for (const tokenIn of originTokens) {
        for (const tokenOut of destTokens) {
          const slug = pairSlug(tokenIn.symbol, tokenOut.symbol);
          const key = `${from.key}:${to.key}:${slug}`;
          if (seen.has(key)) continue;
          seen.add(key);

          const phrase = `Swap ${tokenIn.symbol} from ${fromChain.name} to ${tokenOut.symbol} on ${toChain.name}`;
          entries.push({
            fromChainKey: from.key,
            toChainKey: to.key,
            pairSlug: slug,
            tokenInSymbol: tokenIn.symbol,
            tokenOutSymbol: tokenOut.symbol,
            tokenInAddress: tokenIn.address,
            tokenOutAddress: tokenOut.address,
            title: `${phrase} | XAUConnect`,
            h1: phrase,
            description: `Bridge and swap ${tokenIn.symbol} on ${fromChain.name} to ${tokenOut.symbol} on ${toChain.name} with XAUConnect cross-chain routing.`,
          });
        }
      }
    }
  }

  log("cross-chain entries", `${entries.length} curated liquid routes`);

  saveCrossChainEntries(entries);
  return entries;
}

if (process.argv[1]?.includes("generate-cross-chain-pages")) {
  import("./fetch-token-catalog.js").then(async ({ fetchTokenCatalog }) => {
    const catalog = await fetchTokenCatalog();
    generateCrossChainEntries(catalog);
  });
}
