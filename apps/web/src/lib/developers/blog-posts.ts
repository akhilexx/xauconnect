export type BlogSection = {
  heading?: string;
  paragraphs?: string[];
  code?: string;
  list?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  /** ISO date */
  date: string;
  excerpt: string;
  readMinutes: number;
  sections: BlogSection[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "introducing-swap-api-for-ai-agents",
    title: "Introducing the XAUConnect Swap API for AI Agents",
    date: "2026-06-10",
    excerpt:
      "Public quote and build endpoints for autonomous trading bots, LLM tool calls, and multi-chain DeFi integrations.",
    readMinutes: 6,
    sections: [
      {
        paragraphs: [
          "XAUConnect now ships a public REST API at https://xauconnect.com/api so AI agents and backend services can request swap quotes and unsigned transactions without loading the web UI. The API aggregates 1inch, 0x, and Jupiter across seven chains — Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana.",
          "This release is built for agentic workflows: LangChain tools, OpenAI function calling, autonomous trading bots, and internal treasury scripts can all use the same endpoints the web app uses.",
        ],
      },
      {
        heading: "What you can do today",
        list: [
          "GET /swap/chains and /swap/tokens — discover supported networks and token addresses",
          "POST /swap/quote — compare routes and fees across aggregators",
          "POST /swap/build — receive unsigned EVM calldata or Solana transaction bytes",
          "POST /swap/cross-chain/quote and /build — bridge assets between chains",
          "POST /swap/record — report completed swaps for admin analytics",
        ],
      },
      {
        heading: "Non-custodial by design",
        paragraphs: [
          "The API never holds private keys and never broadcasts EVM transactions on your behalf. Your agent signs locally (viem, ethers, Turnkey, etc.). On Solana, you sign first and POST /swap/submit-solana with the signed bytes — the server only relays to RPC.",
        ],
      },
      {
        heading: "Identify your agent",
        paragraphs: [
          "Send optional headers on every request so usage appears in the admin API Agents tab:",
        ],
        code: `X-Client-Id: my-trading-bot-v1
X-Client-Name: Acme Treasury Bot
X-Client-Source: agent`,
      },
      {
        heading: "Next steps",
        paragraphs: [
          "Read the quickstart for a full quote → build → sign → record flow, or open the interactive OpenAPI reference at /developers/api.",
        ],
      },
    ],
  },
  {
    slug: "autonomous-trading-bot",
    title: "How to build an autonomous trading bot with XAUConnect",
    date: "2026-06-11",
    excerpt:
      "End-to-end Node.js pattern: quote polling, route selection, viem signing, and swap recording.",
    readMinutes: 8,
    sections: [
      {
        paragraphs: [
          "This guide walks through a minimal server-side bot that swaps on BNB Chain using the XAUConnect API and viem. The same pattern applies to other EVM chains — change chainKey and RPC.",
        ],
      },
      {
        heading: "1. Configure the SDK client",
        code: `import { XauApiClient } from "@xauconnect/sdk";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";

const api = new XauApiClient({
  baseUrl: "https://xauconnect.com/api",
  clientId: "treasury-rebalancer",
  clientName: "Treasury Rebalancer",
  clientSource: "agent",
});

const account = privateKeyToAccount(process.env.PRIVATE_KEY as \`0x\${string}\`);
const wallet = createWalletClient({ account, chain: bsc, transport: http() });`,
      },
      {
        heading: "2. Quote and pick the best executable route",
        code: `const quote = await api.quote({
  chainKey: "bsc",
  tokenIn: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  tokenOut: "0x55d398326f99059fF775485246999027B3197955", // USDT
  amountIn: "1000000000000000000",
  slippageBps: 50,
  taker: account.address,
});

const route = quote.best ?? quote.quotes.find((q) => q.executable);
if (!route) throw new Error("No executable route");`,
      },
      {
        heading: "3. Build, approve if needed, sign, and record",
        paragraphs: [
          "Call GET /swap/allowance before swapping ERC-20 tokens. After the transaction confirms, always POST /swap/record with source: agent so volume shows in admin.",
        ],
        code: `const built = await api.buildSwap({
  request: { chainKey: "bsc", tokenIn, tokenOut, amountIn, slippageBps: 50, taker: account.address },
  route,
  minAmountOut: quote.minAmountOut!,
});

const hash = await wallet.sendTransaction({
  to: built.evm!.to as \`0x\${string}\`,
  data: built.evm!.data as \`0x\${string}\`,
  value: BigInt(built.evm!.value),
});

await api.recordSwap({
  chainKey: "bsc",
  dexId: route.dexId,
  tokenIn, tokenOut,
  amountIn, amountOut: route.amountOutAfterFee,
  protocolFee: route.protocolFee,
  feeBps: quote.protocolFeeBps,
  txHash: hash,
  address: account.address,
  status: "confirmed",
  source: "agent",
});`,
      },
    ],
  },
  {
    slug: "cross-chain-ethereum-solana",
    title: "Cross-chain swaps via API: Ethereum to Solana walkthrough",
    date: "2026-06-12",
    excerpt:
      "Quote a bridge route, sign the origin transaction, and poll until funds arrive on Solana.",
    readMinutes: 7,
    sections: [
      {
        paragraphs: [
          "Cross-chain swaps require a wallet on the source chain and optionally a destination address. XAUConnect routes through 0x Cross-Chain (with composite USDC-bridge fallbacks when direct routes are unavailable).",
        ],
      },
      {
        heading: "Quote with taker addresses",
        code: `const { quote } = await api.crossChainQuote({
  fromChainKey: "ethereum",
  toChainKey: "solana",
  tokenIn: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  tokenOut: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC Solana
  amountIn: "1000000000",
  slippageBps: 50,
  taker: "0xYourEthWallet...",
  takerDestination: "YourSolanaWallet...",
});`,
      },
      {
        heading: "Build and inspect executionSteps",
        paragraphs: [
          "The build response includes executionSteps[] describing each wallet action. Composite routes may require multiple transactions (swap → bridge → swap).",
        ],
      },
      {
        heading: "Poll bridge status",
        code: `const status = await api.crossChainStatus(
  quote.quoteId!,
  "ethereum",
  originTxHash,
  "solana",
);
// status.status: pending | completed | failed | unknown`,
      },
    ],
  },
  {
    slug: "rate-limits-best-practices",
    title: "Rate limits, best practices, and error handling",
    date: "2026-06-13",
    excerpt: "Stay within 300 req/min on quotes, handle errors gracefully, and cache token metadata.",
    readMinutes: 5,
    sections: [
      {
        heading: "Rate limits",
        list: [
          "Quote / build / cross-chain / submit-solana: 300 requests per minute per IP",
          "Chains, tokens, settings, record: 120 requests per minute per IP",
          "Responses include RateLimit-Remaining header",
        ],
      },
      {
        heading: "Common error codes",
        list: [
          "RATE_LIMITED (429) — exponential backoff starting at 2s",
          "NO_LIVE_QUOTES (503) — pair may be illiquid; try smaller size or different tokens",
          "SAME_TOKEN (400) — tokenIn and tokenOut must differ",
          "VALIDATION_ERROR (400) — check Zod shapes in OpenAPI spec",
        ],
      },
      {
        heading: "Best practices",
        paragraphs: [
          "Cache GET /swap/tokens results for at least 60 seconds. Re-quote only when amount or slippage changes — do not quote on every block. Always pass taker at quote time on EVM meta routes for accurate gas estimates. Use X-Client-Id consistently so admin can attribute traffic.",
        ],
      },
    ],
  },
  {
    slug: "non-custodial-execution",
    title: "Non-custodial execution: why agents must sign locally",
    date: "2026-06-14",
    excerpt:
      "Security model, why there is no EVM submit endpoint, and how Solana broadcast differs.",
    readMinutes: 5,
    sections: [
      {
        paragraphs: [
          "XAUConnect is a routing layer, not a custodian. Aggregators return calldata; funds move only when your wallet signs and broadcasts. This matches industry standard for 1inch, 0x, and Jupiter integrations.",
        ],
      },
      {
        heading: "EVM execution",
        paragraphs: [
          "POST /swap/build returns { to, data, value }. Your agent must check ERC-20 allowance (GET /swap/allowance), approve the spender if needed, then sendTransaction via its own RPC. We intentionally do not offer POST /swap/submit-evm — storing user keys on a server would introduce unacceptable custody risk.",
        ],
      },
      {
        heading: "Solana execution",
        paragraphs: [
          "Solana builds return base64 unsigned VersionedTransaction bytes. Sign with Phantom, Solflare, or a local keypair, then POST /swap/submit-solana. The server broadcasts already-signed bytes via Helius RPC to avoid browser 403 errors — it still never sees your private key.",
        ],
      },
      {
        heading: "Production key management",
        list: [
          "Development: environment variable private key (never commit)",
          "Production: Turnkey, Privy, Fireblocks, or AWS KMS",
          "High-value treasuries: MPC or hardware-backed signing",
        ],
      },
    ],
  },
  {
    slug: "how-we-rank-swap-routes",
    title: "How we rank swap routes: minimum received, not headline rate",
    date: "2026-08-14",
    excerpt:
      "XAUConnect compares 1inch, 0x, and Jupiter by net tokens after the disclosed platform fee — why a quieter path often beats a marketing mid-price.",
    readMinutes: 7,
    sections: [
      {
        paragraphs: [
          "Most aggregator landing pages say “best price.” That phrase is meaningless until you specify the ranking key. XAUConnect ranks candidate routes by minimum received after our disclosed platform fee — the floor encoded in the transaction you sign — not by the mid-market rate on a screenshot.",
          "This post is the engineering note behind the new Learn article on routing. It is written for integrators who are about to hard-code the wrong comparison in a bot.",
        ],
      },
      {
        heading: "What we query",
        paragraphs: [
          "EVM quotes fan out to configured 1inch and 0x graphs plus any path our AggregatorRouter can build. Solana quotes go through Jupiter. Each provider returns estimated output, a gas hint, and a hop list. Quotes that fail simulation or return zero output are dropped before ranking.",
        ],
      },
      {
        heading: "Why headline rate lies",
        paragraphs: [
          "A route can show a better mid price and still deliver fewer tokens after LP fees, partner fees, and price impact. Ranking on mid price is how you ship a UI that looks winning in a thread and losing in a wallet. Compare the minimum-received field in POST /swap/quote against a single-DEX UI on the same block, same addresses, same size.",
        ],
      },
      {
        heading: "Build is not quote",
        paragraphs: [
          "POST /swap/build returns unsigned EVM { to, data, value } or Solana VersionedTransaction bytes. If the pool moved, simulation fails or the on-chain minimum check reverts. Re-quote. Do not reuse calldata. We still do not submit EVM transactions for you.",
        ],
      },
      {
        heading: "Further reading",
        list: [
          "Learn: How XAUConnect routing works",
          "Learn: How XAUConnect fees work",
          "Docs: /developers/api/swap",
        ],
      },
    ],
  },
];

export const BLOG_BY_SLUG = Object.fromEntries(BLOG_POSTS.map((p) => [p.slug, p])) as Record<
  string,
  BlogPost
>;

export function formatBlogDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
