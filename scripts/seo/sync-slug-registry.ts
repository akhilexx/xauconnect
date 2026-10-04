/**
 * Build the unified pages.json from the real token catalog, curated pairs,
 * curated cross-chain routes, and hand-curated learn entries.
 *
 * Page taxonomy (no doorways, real entities only):
 *   - hub pages:        chain / swap-hub / meme-hub / launch / discover / trade (7 chains each)
 *   - swap-token:       one canonical page per real token (buy/sell collapse here)
 *   - meme-token:       real meme tokens only (no padding with non-memes)
 *   - pair:             curated liquid pairs (majors × stables)
 *   - cross-chain-swap: curated liquid routes
 *   - learn / guide:    curated long-form articles
 *   - search:           curated, content-rich answer (AEO) pages
 *
 * Removed entirely: buy, sell, token-deep, cross-chain-search
 * (keyword-permutation doorways). /buy, /sell, /token 301 to the canonical
 * swap pages via next.config redirects. The /search pages are a curated,
 * hand-listed answer set (see generate-search-pages.ts) — NOT permutations.
 */
import { CHAINS, getChainByKey } from "@xauconnect/utils";
import {
  buildManifest,
  finalizePage,
  chainHubPage,
  swapHubPage,
  tokenIntentPage,
  memeHubPage,
  launchHubPage,
  discoverHubPage,
  tradeHubPage,
  pairPage,
  learnPage,
  searchPhrasePage,
  crossChainSwapPage,
  pairSlug,
  savePages,
  savePairs,
  savePriorities,
  type SeoPageConfig,
  type TokenCatalogEntry,
  type PairCatalogEntry,
} from "@xauconnect/seo";
import { fetchTokenCatalog } from "./fetch-token-catalog.js";
import { generateLearnEntries } from "./generate-learn-pages.js";
import { generateCrossChainEntries } from "./generate-cross-chain-pages.js";
import { generateSearchEntries } from "./generate-search-pages.js";
import { log } from "./lib/env.js";

const SWAP_TOKENS_PER_CHAIN = 250;
const MEME_TOKENS_PER_CHAIN = 60;
const PAIRS_PER_CHAIN = 60;

function buildPairs(catalog: TokenCatalogEntry[]): PairCatalogEntry[] {
  const pairs: PairCatalogEntry[] = [];
  const seen = new Set<string>();

  for (const chain of CHAINS) {
    const tokens = catalog.filter((t) => t.chainKey === chain.key);
    const stables = tokens.filter((t) => ["USDC", "USDT", "DAI"].includes(t.symbol));
    const majors = tokens.filter((t) => !["USDC", "USDT", "DAI"].includes(t.symbol)).slice(0, 30);
    const quotes = stables.length ? stables : tokens.slice(0, 3);
    let count = 0;

    for (const base of majors) {
      for (const quote of quotes) {
        if (base.address === quote.address) continue;
        const slug = pairSlug(base.symbol, quote.symbol);
        const k = `${chain.key}:${slug}`;
        if (seen.has(k)) continue;
        seen.add(k);
        pairs.push({
          chainKey: chain.key,
          pairSlug: slug,
          baseSymbol: base.symbol,
          quoteSymbol: quote.symbol,
          baseAddress: base.address,
          quoteAddress: quote.address,
          title: `${base.symbol}/${quote.symbol}`,
        });
        count++;
        if (count >= PAIRS_PER_CHAIN) break;
      }
      if (count >= PAIRS_PER_CHAIN) break;
    }
  }
  return pairs;
}

export async function syncSlugRegistry(catalog?: TokenCatalogEntry[]): Promise<SeoPageConfig[]> {
  const tokens = catalog ?? (await fetchTokenCatalog());
  const learnEntries = generateLearnEntries();
  const crossChainEntries = generateCrossChainEntries(tokens);
  const pairs = buildPairs(tokens);
  savePairs(pairs);

  const pages: SeoPageConfig[] = [];
  const seenPaths = new Set<string>();

  function push(page: SeoPageConfig): void {
    if (seenPaths.has(page.path)) return;
    seenPaths.add(page.path);
    pages.push(page);
  }

  /** Find the catalog token backing a page so we can bake in real market data. */
  function attachMarket(page: SeoPageConfig, token: TokenCatalogEntry): SeoPageConfig {
    if (token.market) page.marketData = token.market;
    return page;
  }

  // ---- Hub pages (one per chain) ---------------------------------------
  for (const chain of CHAINS) {
    push(finalizePage("chain", `/chains/${chain.key}`, chainHubPage(chain)));
    push(finalizePage("swap-hub", `/swap/${chain.key}`, swapHubPage(chain)));
    push(finalizePage("meme-hub", `/meme-coins/${chain.key}`, memeHubPage(chain)));
    push(finalizePage("launch", `/launch/${chain.key}`, launchHubPage(chain)));
    push(finalizePage("discover", `/discover/${chain.key}`, discoverHubPage(chain)));
    push(finalizePage("trade", `/trade/${chain.key}`, tradeHubPage(chain)));
  }

  const ranked = [...tokens].sort(
    (a, b) => (a.marketCapRank ?? 9999) - (b.marketCapRank ?? 9999),
  );

  // ---- Canonical token swap pages (real tokens only) -------------------
  for (const chain of CHAINS) {
    const chainTokens = ranked
      .filter((t) => t.chainKey === chain.key)
      .slice(0, SWAP_TOKENS_PER_CHAIN);
    const chainInfo = getChainByKey(chain.key)!;
    for (const token of chainTokens) {
      const page = finalizePage(
        "swap-token",
        `/swap/${chain.key}/${token.slug}`,
        tokenIntentPage("swap", chainInfo, token),
      );
      push(attachMarket(page, token));
    }
  }

  // ---- Meme token pages (real memes only — no padding) -----------------
  for (const chain of CHAINS) {
    const chainInfo = getChainByKey(chain.key)!;
    const memes = ranked
      .filter((t) => t.chainKey === chain.key && t.isMeme)
      .slice(0, MEME_TOKENS_PER_CHAIN);
    for (const token of memes) {
      const partial = tokenIntentPage("swap", chainInfo, token);
      const page = finalizePage("meme-token", `/meme-coins/${chain.key}/${token.slug}`, {
        ...partial,
        title: `${token.symbol} meme coin on ${chain.name} | XAUConnect`,
        h1: `Swap ${token.symbol} meme coin on ${chain.name}`,
        eyebrow: `Meme · ${chain.name}`,
      });
      push(attachMarket(page, token));
    }
  }

  // ---- Curated pair pages ----------------------------------------------
  for (const pair of pairs) {
    const chainInfo = getChainByKey(pair.chainKey);
    if (!chainInfo) continue;
    const base: TokenCatalogEntry = {
      chainKey: pair.chainKey,
      address: pair.baseAddress,
      symbol: pair.baseSymbol,
      name: pair.baseSymbol,
      slug: pair.baseSymbol.toLowerCase(),
      decimals: 18,
    };
    const quote: TokenCatalogEntry = {
      chainKey: pair.chainKey,
      address: pair.quoteAddress,
      symbol: pair.quoteSymbol,
      name: pair.quoteSymbol,
      slug: pair.quoteSymbol.toLowerCase(),
      decimals: 18,
    };
    push(
      finalizePage(
        "pair",
        `/pairs/${pair.chainKey}/${pair.pairSlug}`,
        pairPage(chainInfo, base, quote, pair.pairSlug),
      ),
    );
  }

  // ---- Curated learn + guide articles ----------------------------------
  for (const entry of learnEntries) {
    const path = entry.kind === "guide" ? `/learn/guides/${entry.slug}` : `/learn/${entry.slug}`;
    push(finalizePage(entry.kind, path, learnPage(entry)));
  }

  // ---- Curated answer (AEO) pages --------------------------------------
  const learnBySlug = new Map(learnEntries.map((e) => [e.slug, e]));
  const searchCanonicalBySlug: Record<string, string> = {
    "how-to-verify-a-token-contract-before-swapping":
      "/learn/guides/how-to-verify-a-token-contract-before-trading",
    "what-are-limit-orders-on-a-dex": "/learn/how-do-limit-orders-work-on-a-dex",
    "what-are-gas-fees": "/learn/gas-fees-explained-across-chains",
    "what-is-slippage-in-crypto": "/learn/slippage-vs-price-impact-what-s-the-difference",
    "what-is-price-impact-when-swapping": "/learn/slippage-vs-price-impact-what-s-the-difference",
    "how-to-avoid-crypto-swap-scams": "/learn/guides/how-to-avoid-swap-scams-and-honeypots",
    "how-to-read-a-swap-quote": "/learn/guides/how-to-read-a-dex-route-comparison",
    "how-does-xauconnect-charge-fees": "/learn/guides/how-xauconnect-fees-work",
    "how-can-an-ai-agent-swap-tokens": "/learn/how-ai-agents-swap-tokens-without-holding-keys",
    "how-to-swap-crypto-with-an-api": "/learn/guides/how-to-swap-with-the-xauconnect-api",
    "how-to-swap-tokens-from-a-bot": "/learn/guides/how-to-swap-with-the-xauconnect-api",
    "how-to-swap-crypto-programmatically": "/learn/guides/how-to-swap-with-the-xauconnect-api",
    "how-to-swap-crypto-on-your-phone": "/learn/guides/how-to-swap-on-mobile-with-walletconnect",
    "what-is-the-difference-between-a-cex-and-a-dex": "/learn/non-custodial-aggregator-vs-cex",
    "why-did-my-swap-fail": "/learn/why-swap-quotes-expire-and-failed-transactions",
    "how-to-swap-large-amounts-of-crypto": "/learn/guides/how-to-size-a-large-swap-on-thin-liquidity",
    "how-to-swap-new-tokens-at-launch": "/learn/guides/how-to-launch-a-token-on-xauconnect",
    "does-xauconnect-have-an-api": "/learn/guides/how-to-swap-with-the-xauconnect-api",
    "how-to-find-the-best-route-for-a-swap": "/learn/guides/how-xauconnect-routing-works",
    "how-to-create-a-crypto-token": "/learn/guides/how-to-generate-a-crypto-token-without-coding",
    "how-to-generate-a-crypto-token": "/learn/guides/how-to-generate-a-crypto-token-without-coding",
    "how-to-create-a-token-without-coding": "/learn/guides/how-to-generate-a-crypto-token-without-coding",
    "how-to-create-a-memecoin": "/learn/guides/how-to-create-a-memecoin-on-xauconnect",
    "how-to-swap-multi-chain-tokens": "/learn/what-is-a-multi-chain-token",
    "how-to-bridge-crypto-between-chains": "/learn/guides/how-to-bridge-assets-between-chains",
    "how-to-move-crypto-from-ethereum-to-solana":
      "/learn/guides/how-to-move-tokens-from-ethereum-to-solana",
    "cheapest-way-to-swap-crypto": "/learn/cheapest-chain-to-swap-crypto",
    "cheapest-chain-to-swap-crypto": "/learn/cheapest-chain-to-swap-crypto",
    "how-to-swap-tokens-without-kyc": "/learn/guides/how-to-swap-tokens-without-kyc",
    "how-to-swap-crypto-without-kyc": "/learn/guides/how-to-swap-tokens-without-kyc",
    "what-is-a-token-swap": "/learn/what-is-a-token-swap",
    "how-to-swap-on-a-layer-2-network": "/learn/guides/how-to-swap-on-a-layer-2-network",
    "how-to-swap-with-a-hardware-wallet": "/learn/guides/how-to-swap-with-a-hardware-wallet",
    "how-to-swap-wrapped-tokens": "/learn/guides/how-to-wrap-and-unwrap-eth",
    "best-way-to-bridge-crypto": "/learn/guides/how-to-bridge-assets-between-chains",
    "how-to-swap-erc-20-tokens": "/learn/guides/how-to-swap-erc-20-tokens",
    "how-to-swap-spl-tokens-on-solana": "/learn/guides/how-to-swap-spl-tokens-on-solana",
  };

  const searchEntries = generateSearchEntries();
  for (const entry of searchEntries) {
    const partial = searchPhrasePage(entry);
    const learnHit = learnBySlug.get(entry.slug);
    if (learnHit) {
      partial.canonicalPath =
        learnHit.kind === "guide" ? `/learn/guides/${learnHit.slug}` : `/learn/${learnHit.slug}`;
    } else if (searchCanonicalBySlug[entry.slug]) {
      partial.canonicalPath = searchCanonicalBySlug[entry.slug];
    }
    push(finalizePage("search", `/search/${entry.slug}`, partial));
  }

  // ---- Curated cross-chain swap routes ---------------------------------
  for (const entry of crossChainEntries) {
    const fromChain = getChainByKey(entry.fromChainKey);
    const toChain = getChainByKey(entry.toChainKey);
    if (!fromChain || !toChain) continue;

    const tokenIn: TokenCatalogEntry = {
      chainKey: entry.fromChainKey,
      address: entry.tokenInAddress,
      symbol: entry.tokenInSymbol,
      name: entry.tokenInSymbol,
      slug: entry.tokenInSymbol.toLowerCase(),
      decimals: fromChain.kind === "solana" ? 6 : 18,
    };
    const tokenOut: TokenCatalogEntry = {
      chainKey: entry.toChainKey,
      address: entry.tokenOutAddress,
      symbol: entry.tokenOutSymbol,
      name: entry.tokenOutSymbol,
      slug: entry.tokenOutSymbol.toLowerCase(),
      decimals: toChain.kind === "solana" ? 6 : 18,
    };

    const path = `/cross-chain/${entry.fromChainKey}/${entry.toChainKey}/${entry.pairSlug}`;
    const partial = crossChainSwapPage(fromChain, toChain, tokenIn, tokenOut, entry.pairSlug);
    push(
      finalizePage("cross-chain-swap", path, {
        ...partial,
        fromChainKey: entry.fromChainKey,
        toChainKey: entry.toChainKey,
        pairSlug: entry.pairSlug,
      }),
    );
  }

  // Priority scores for optional LLM enrichment (top swap + cross-chain pages).
  const priorities: string[] = [];
  for (const p of pages) {
    if (p.kind === "swap-token" || p.kind === "cross-chain-swap") {
      p.priority = priorities.length < 1000 ? 1000 - priorities.length : 0;
      if (p.priority > 0) priorities.push(p.id);
    }
  }

  savePriorities(priorities);
  savePages(pages);
  const manifest = buildManifest(pages);
  log("sync registry", `${manifest.pageCount} pages (checksum ${manifest.checksum})`);
  return pages;
}
