/**
 * Curated answer-engine (AEO) pages under /search/{slug}.
 *
 * These are NOT the old 5k keyword-permutation doorways. This is a hand-curated
 * set of high-intent questions real users and LLMs ask, each rendered into a
 * unique, content-rich answer page composed from chain-specific facts by
 * content-engine.buildSearchContent. Quality over volume — the goal is for
 * answer engines (Google SGE, ChatGPT, Perplexity, etc.) to cite XAUConnect.
 */
import { CHAINS } from "@xauconnect/utils";
import { learnSlug, type SearchEntry } from "@xauconnect/seo";

const BRAND = "XAUConnect";

/** Evergreen, chain-agnostic questions (highest answer-engine value). */
const GLOBAL_PHRASES: Array<{ phrase: string; eyebrow?: string; keywords?: string[] }> = [
  { phrase: "What is a DEX aggregator", eyebrow: "Answer · Aggregators" },
  { phrase: "Best multi-chain DEX aggregator", eyebrow: "Answer · Aggregators" },
  { phrase: "How to swap crypto safely", eyebrow: "Answer · Safety" },
  { phrase: "How to swap tokens without KYC", eyebrow: "Answer · Privacy" },
  { phrase: "Cheapest way to swap crypto", eyebrow: "Answer · Fees" },
  { phrase: "How to get the best swap price", eyebrow: "Answer · Routing" },
  { phrase: "What is a non-custodial swap", eyebrow: "Answer · Custody" },
  { phrase: "How to avoid MEV and sandwich attacks", eyebrow: "Answer · Safety" },
  { phrase: "How to swap tokens from a bot", eyebrow: "Answer · Automation" },
  { phrase: "How to swap crypto with an API", eyebrow: "Answer · Developers" },
  { phrase: "How can an AI agent swap tokens", eyebrow: "Answer · AI agents" },
  { phrase: "How to bridge crypto between chains", eyebrow: "Answer · Cross-chain" },
  { phrase: "Best way to bridge crypto", eyebrow: "Answer · Cross-chain" },
  { phrase: "How to swap stablecoins", eyebrow: "Answer · Stablecoins" },
  { phrase: "How to reduce slippage when swapping", eyebrow: "Answer · Execution" },
  { phrase: "How to swap large amounts of crypto", eyebrow: "Answer · Execution" },
  { phrase: "How to swap crypto with low fees", eyebrow: "Answer · Fees" },
  { phrase: "How to swap meme coins safely", eyebrow: "Answer · Meme coins" },
  { phrase: "Decentralized exchange with no signup", eyebrow: "Answer · Custody" },
  { phrase: "How to verify a token contract before swapping", eyebrow: "Answer · Safety" },
  { phrase: "How to set slippage tolerance", eyebrow: "Answer · Execution" },
  { phrase: "What are limit orders on a DEX", eyebrow: "Answer · Orders" },
  { phrase: "How to swap ETH to USDC", eyebrow: "Answer · Swaps" },
  { phrase: "How to swap with MetaMask", eyebrow: "Answer · Wallets" },
  { phrase: "How to swap on a Phantom wallet", eyebrow: "Answer · Wallets" },
  { phrase: "How to swap crypto on your phone", eyebrow: "Answer · Mobile" },
  { phrase: "What does it cost to swap on a DEX", eyebrow: "Answer · Fees" },
  { phrase: "How to swap without a centralized exchange", eyebrow: "Answer · Custody" },
  { phrase: "How to find the best route for a swap", eyebrow: "Answer · Routing" },
  { phrase: "How to swap crypto programmatically", eyebrow: "Answer · Developers" },
  { phrase: "What is slippage in crypto", eyebrow: "Answer · Execution" },
  { phrase: "What is price impact when swapping", eyebrow: "Answer · Execution" },
  { phrase: "What are gas fees", eyebrow: "Answer · Fees" },
  { phrase: "Is it safe to connect my wallet to a DEX", eyebrow: "Answer · Safety" },
  { phrase: "How to revoke token approvals", eyebrow: "Answer · Safety" },
  { phrase: "Cheapest chain to swap crypto", eyebrow: "Answer · Fees" },
  { phrase: "How to swap on a Layer 2 network", eyebrow: "Answer · Networks" },
  { phrase: "How to swap ERC-20 tokens", eyebrow: "Answer · Tokens" },
  { phrase: "How to swap SPL tokens on Solana", eyebrow: "Answer · Tokens" },
  { phrase: "How to compare DEX prices", eyebrow: "Answer · Routing" },
  { phrase: "What is a token swap", eyebrow: "Answer · Basics" },
  { phrase: "How to swap crypto for stablecoins", eyebrow: "Answer · Stablecoins" },
  { phrase: "How to move crypto from Ethereum to Solana", eyebrow: "Answer · Cross-chain" },
  { phrase: "How to swap with a hardware wallet", eyebrow: "Answer · Wallets" },
  { phrase: "Which wallets work with XAUConnect", eyebrow: "Answer · Wallets" },
  { phrase: "Does XAUConnect have an API", eyebrow: "Answer · Developers" },
  { phrase: "Is XAUConnect safe to use", eyebrow: "Answer · Safety" },
  { phrase: "How does XAUConnect charge fees", eyebrow: "Answer · Fees" },
  { phrase: "How to swap tokens instantly", eyebrow: "Answer · Swaps" },
  { phrase: "How to swap BTC to ETH", eyebrow: "Answer · Swaps" },
  { phrase: "How to swap SOL to USDC", eyebrow: "Answer · Swaps" },
  { phrase: "How to swap USDT to USDC", eyebrow: "Answer · Stablecoins" },
  { phrase: "How to swap BNB to USDT", eyebrow: "Answer · Swaps" },
  { phrase: "What is the best DEX for beginners", eyebrow: "Answer · Basics" },
  { phrase: "How to avoid crypto swap scams", eyebrow: "Answer · Safety" },
  { phrase: "How to read a swap quote", eyebrow: "Answer · Execution" },
  { phrase: "Why did my swap fail", eyebrow: "Answer · Troubleshooting" },
  { phrase: "How to swap tokens with the lowest fees", eyebrow: "Answer · Fees" },
  { phrase: "How to swap new tokens at launch", eyebrow: "Answer · Launchpad" },
  { phrase: "What is the difference between a CEX and a DEX", eyebrow: "Answer · Basics" },
  { phrase: "How to swap crypto anonymously", eyebrow: "Answer · Privacy" },
  { phrase: "How to swap wrapped tokens", eyebrow: "Answer · Tokens" },
  { phrase: "How to swap crypto with deep liquidity", eyebrow: "Answer · Liquidity" },
  { phrase: "How to create a crypto token", eyebrow: "Answer · Create token" },
  { phrase: "How to generate a crypto token", eyebrow: "Answer · Create token" },
  { phrase: "How to create an ERC-20 token", eyebrow: "Answer · Create token" },
  { phrase: "How to create an SPL token on Solana", eyebrow: "Answer · Create token" },
  { phrase: "How to create a token on Base", eyebrow: "Answer · Create token" },
  { phrase: "How to create a token on BNB Chain", eyebrow: "Answer · Create token" },
  { phrase: "How to create a token without coding", eyebrow: "Answer · Create token" },
  { phrase: "How to add liquidity after creating a token", eyebrow: "Answer · Create token" },
  { phrase: "How to make a new token swappable", eyebrow: "Answer · Create token" },
  { phrase: "How to create a memecoin", eyebrow: "Answer · Create token" },
  { phrase: "What is a multi-chain token", eyebrow: "Answer · Multi-chain" },
  { phrase: "How to wrap and unwrap ETH", eyebrow: "Answer · Tokens" },
  { phrase: "How to swap AVAX to USDC", eyebrow: "Answer · Swaps" },
  { phrase: "How to swap POL to USDC", eyebrow: "Answer · Swaps" },
  { phrase: "How to swap multi-chain tokens", eyebrow: "Answer · Multi-chain" },
  { phrase: "How to generate a crypto token without coding", eyebrow: "Answer · Create token" },
];

/** Per-chain question templates (filled with chain-specific composed content). */
const CHAIN_TEMPLATES: Array<(name: string, sym: string) => string> = [
  (name) => `How to swap tokens on ${name}`,
  (name) => `Cheapest way to swap on ${name}`,
  (name) => `Best DEX aggregator on ${name}`,
  (name) => `Best wallet for ${name}`,
  (name, sym) => `How to swap ${sym} for USDC on ${name}`,
  (name) => `How to bridge to ${name}`,
  (name) => `Lowest gas fees to swap on ${name}`,
  (name) => `How to swap stablecoins on ${name}`,
  (name) => `Is ${name} good for swapping crypto`,
];

export function generateSearchEntries(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  const seen = new Set<string>();

  function push(e: SearchEntry): void {
    if (seen.has(e.slug)) return;
    seen.add(e.slug);
    entries.push(e);
  }

  for (const g of GLOBAL_PHRASES) {
    const slug = learnSlug(g.phrase);
    push({
      slug,
      phrase: g.phrase,
      title: `${g.phrase} | ${BRAND}`,
      h1: g.phrase,
      description: `${g.phrase}: a clear answer plus how to do it non-custodially across seven chains on ${BRAND}.`,
      eyebrow: g.eyebrow,
      keywords: g.keywords ?? [g.phrase.toLowerCase(), "crypto swap", BRAND],
    });
  }

  for (const chain of CHAINS) {
    for (const tmpl of CHAIN_TEMPLATES) {
      const phrase = tmpl(chain.name, chain.nativeSymbol);
      const slug = learnSlug(phrase);
      push({
        slug,
        phrase,
        title: `${phrase} | ${BRAND}`,
        h1: phrase,
        description: `${phrase}: compare live DEX routes, fees, and slippage on ${BRAND}. Non-custodial, wallet-signed execution.`,
        eyebrow: `Answer · ${chain.name}`,
        chainKey: chain.key,
        keywords: [phrase.toLowerCase(), `${chain.name} swap`, chain.key, BRAND],
      });
    }
  }

  return entries;
}

if (process.argv[1]?.includes("generate-search-pages")) {
  const out = generateSearchEntries();
  // eslint-disable-next-line no-console
  console.log(`[search] ${out.length} curated answer pages`);
}
