/**
 * Curated Learn + Guide catalog.
 *
 * Quality over quantity: a focused set of genuinely distinct articles, each
 * Quality over quantity: genuinely distinct articles, each with hand-written
 * content in `packages/seo/src/learn-content*.ts`. Per-chain swap and token-
 * creation guides are unique prose, not name-substituted templates.
 */
import { BRAND_NAME } from "@xauconnect/utils";
import { learnSlug, saveLearnEntries, type LearnEntry } from "@xauconnect/seo";
import { log } from "./lib/env.js";

interface SeedEntry {
  kind: "learn" | "guide";
  h1: string;
  title?: string;
  description: string;
  eyebrow: string;
  topic: string;
  slug?: string;
}

/** Step-by-step guides (HowTo schema). */
const GUIDES: SeedEntry[] = [
  {
    kind: "guide",
    h1: "How to swap tokens on XAUConnect",
    description:
      "Step-by-step: connect a wallet, get a route quote, approve, and confirm a token swap on XAUConnect across Ethereum, Solana, and five more chains.",
    eyebrow: "Guide · Getting started",
    topic: "swapping tokens",
    slug: "how-to-swap-tokens-on-xauconnect",
  },
  {
    kind: "guide",
    h1: "How to set slippage tolerance",
    description:
      "Choose a slippage setting that protects you from sandwich attacks without causing failed transactions. Practical numbers for stable, blue-chip, and thin pools.",
    eyebrow: "Guide · Execution",
    topic: "slippage tolerance",
  },
  {
    kind: "guide",
    h1: "How to connect MetaMask to a DEX",
    description:
      "Add a network, switch chains, and connect MetaMask safely to a decentralized exchange. Covers chain IDs, RPCs, and the permissions you actually grant.",
    eyebrow: "Guide · Wallets",
  topic: "connecting MetaMask",
  },
  {
    kind: "guide",
    h1: "How to connect a Phantom wallet on Solana",
    description:
      "Connect Phantom to swap SPL tokens on Solana: approve a connection, understand transaction simulation, and manage priority fees during congestion.",
    eyebrow: "Guide · Wallets",
    topic: "connecting Phantom",
  },
  {
    kind: "guide",
    h1: "How to buy meme coins safely",
    description:
      "A risk checklist for buying low-cap meme coins: verifying the contract, reading liquidity and holder distribution, sizing test trades, and avoiding honeypots.",
    eyebrow: "Guide · Risk",
    topic: "buying meme coins safely",
  },
  {
    kind: "guide",
    h1: "How to sell tokens for USDC",
    description:
      "Exit a position into a stablecoin: pick the right USDC variant, check price impact on the way out, and confirm the receipt matches your quote.",
    eyebrow: "Guide · Execution",
    topic: "selling tokens for USDC",
  },
  {
    kind: "guide",
    h1: "How to read a DEX route comparison",
    description:
      "Understand every line of an aggregator quote: route source, hops, minimum received, price impact, platform fee, and estimated gas — and which one actually matters.",
    eyebrow: "Guide · Execution",
    topic: "reading a route comparison",
  },
  {
    kind: "guide",
    h1: "How to verify a token contract before trading",
    description:
      "Confirm you are trading the real token: match the contract/mint address on the block explorer, check verification, and spot copycat addresses.",
    eyebrow: "Guide · Security",
    topic: "verifying a token contract",
  },
  {
    kind: "guide",
    h1: "How to avoid swap scams and honeypots",
    description:
      "The most common ways traders lose funds on DEXs — fake tokens, honeypot contracts, approval drains, phishing front-ends — and how to defend against each.",
    eyebrow: "Guide · Security",
    topic: "avoiding swap scams",
  },
  {
    kind: "guide",
    h1: "How to bridge assets between chains",
    description:
      "Move tokens across networks without losing them: pick a route, budget gas on both sides, understand wrapped representations, and verify arrival.",
    eyebrow: "Guide · Cross-chain",
    topic: "bridging assets between chains",
  },
  {
    kind: "guide",
    h1: "How to calculate price impact",
    description:
      "Price impact explained with worked examples: how trade size moves the AMM curve, why it differs from slippage, and how to keep it under control.",
    eyebrow: "Guide · Execution",
    topic: "calculating price impact",
  },
  {
    kind: "guide",
    h1: "How to revoke token approvals",
    description:
      "Unlimited ERC-20 allowances are a standing risk. Learn how approvals work, how to audit them, and how to revoke the ones you no longer need.",
    eyebrow: "Guide · Security",
    topic: "revoking token approvals",
  },
  {
    kind: "guide",
    h1: "How to pay swap fees in USDC",
    description:
      "On supported chains, XAUConnect lets you pay the platform fee in USDC instead of the native gas token. When that helps and how it changes your quote.",
    eyebrow: "Guide · Fees",
    topic: "paying fees in USDC",
  },
  {
    kind: "guide",
    h1: "How to read pool liquidity and depth",
    description:
      "Liquidity depth determines how much you can trade before price impact bites. How to read reserves, TVL, and volume before sizing a position.",
    eyebrow: "Guide · Liquidity",
    topic: "reading pool liquidity",
  },
  {
    kind: "guide",
    h1: "How XAUConnect routing works",
    description:
      "How XAUConnect ranks swap routes: 1inch, 0x, Jupiter, minimum received after fees, hops vs splits, and what your wallet actually signs.",
    eyebrow: "Guide · Product",
    topic: "XAUConnect routing",
    slug: "how-xauconnect-routing-works",
  },
  {
    kind: "guide",
    h1: "How XAUConnect fees work",
    description:
      "Platform fee (typically 30 bps), LP fees, gas, USDC fee payment, and how to read every line on the XAUConnect quote card.",
    eyebrow: "Guide · Fees",
    topic: "XAUConnect fees",
    slug: "how-xauconnect-fees-work",
  },
  {
    kind: "guide",
    h1: "How to swap with the XAUConnect API",
    description:
      "Public quote/build API for bots and AI agents: endpoints, EVM vs Solana signing, identification headers, and rate-limit hygiene.",
    eyebrow: "Guide · Developers",
    topic: "Swap API",
    slug: "how-to-swap-with-the-xauconnect-api",
  },
  {
    kind: "guide",
    h1: "How to use limit orders on XAUConnect",
    description:
      "DEX limit orders vs spot swaps: approvals, expiry, gas on failed fills, and when not to use limits on thin meme pools.",
    eyebrow: "Guide · Orders",
    topic: "limit orders on XAUConnect",
    slug: "how-to-use-limit-orders-on-xauconnect",
  },
  {
    kind: "guide",
    h1: "How to launch a token on XAUConnect",
    description:
      "Launchpad checklist: chain choice, contract vs metadata, liquidity plan, submission wallet, and how Discover ranking actually works.",
    eyebrow: "Guide · Launchpad",
    topic: "launching a token",
    slug: "how-to-launch-a-token-on-xauconnect",
  },
  {
    kind: "guide",
    h1: "How to swap on mobile with WalletConnect",
    description:
      "Phone-first swaps: WalletConnect sessions, matching chains, OS handoff delays, and recovering when the browser tab is killed.",
    eyebrow: "Guide · Mobile",
    topic: "mobile WalletConnect swaps",
    slug: "how-to-swap-on-mobile-with-walletconnect",
  },
  {
    kind: "guide",
    h1: "How to size a large swap on thin liquidity",
    description:
      "Treat size as a percentage of the pool. Split across blocks, keep slippage honest, and know when the correct trade is no trade.",
    eyebrow: "Guide · Execution",
    topic: "sizing large swaps",
    slug: "how-to-size-a-large-swap-on-thin-liquidity",
  },
  {
    kind: "guide",
    h1: "How to swap tokens on Ethereum",
    description:
      "Ethereum mainnet swaps on XAUConnect: chain ID 1, ETH gas buffer, ERC-20 approvals, and when Arbitrum or Base is the cheaper venue.",
    eyebrow: "Guide · Ethereum",
    topic: "swapping on Ethereum",
    slug: "how-to-swap-tokens-on-ethereum",
  },
  {
    kind: "guide",
    h1: "How to swap tokens on Solana",
    description:
      "Solana SPL swaps: Jupiter routes, Phantom simulation, priority fees, mint-address checks — no ERC-20 approval step.",
    eyebrow: "Guide · Solana",
    topic: "swapping on Solana",
    slug: "how-to-swap-tokens-on-solana",
  },
  {
    kind: "guide",
    h1: "How to swap tokens on BNB Chain",
    description:
      "BNB Chain (chain ID 56) swaps: BNB gas, USDT-heavy routing, BscScan verification, and cheap-chain memecoin hygiene.",
    eyebrow: "Guide · BNB Chain",
    topic: "swapping on BNB Chain",
    slug: "how-to-swap-tokens-on-bnb-chain",
  },
  {
    kind: "guide",
    h1: "How to swap tokens on Base",
    description:
      "Base (chain ID 8453) swaps: ETH for gas, native USDC, Coinbase-wallet pitfalls, and memecoin contract paste.",
    eyebrow: "Guide · Base",
    topic: "swapping on Base",
    slug: "how-to-swap-tokens-on-base",
  },
  {
    kind: "guide",
    h1: "How to swap tokens on Arbitrum",
    description:
      "Arbitrum One swaps: L2 ETH gas, Arbiscan checks, canonical-bridge timing, and DeFi-native routing.",
    eyebrow: "Guide · Arbitrum",
    topic: "swapping on Arbitrum",
    slug: "how-to-swap-tokens-on-arbitrum",
  },
  {
    kind: "guide",
    h1: "How to swap tokens on Polygon",
    description:
      "Polygon swaps: POL gas, native versus bridged USDC, Polygonscan verification, and ticker traps on bridged assets.",
    eyebrow: "Guide · Polygon",
    topic: "swapping on Polygon",
    slug: "how-to-swap-tokens-on-polygon",
  },
  {
    kind: "guide",
    h1: "How to swap tokens on Avalanche",
    description:
      "Avalanche C-Chain swaps: AVAX gas, Snowtrace, X/P-Chain address traps, and Trader Joe/Pangolin routing.",
    eyebrow: "Guide · Avalanche",
    topic: "swapping on Avalanche",
    slug: "how-to-swap-tokens-on-avalanche",
  },
  {
    kind: "guide",
    h1: "How to swap ETH to USDC",
    description:
      "Sell ETH for USDC on the chain you actually hold: gas reserve, native USDC contract, and when an L2 beats mainnet.",
    eyebrow: "Guide · Pairs",
    topic: "ETH to USDC",
    slug: "how-to-swap-eth-to-usdc",
  },
  {
    kind: "guide",
    h1: "How to swap SOL to USDC",
    description:
      "Flatten SOL into Solana USDC via Jupiter on XAUConnect: simulation preview, SOL fee buffer, official mint.",
    eyebrow: "Guide · Pairs",
    topic: "SOL to USDC",
    slug: "how-to-swap-sol-to-usdc",
  },
  {
    kind: "guide",
    h1: "How to swap BNB to USDT",
    description:
      "BNB → USDT on BNB Chain: withdraw on-chain first, keep BNB for gas, verify USDT, compare versus USDC depth.",
    eyebrow: "Guide · Pairs",
    topic: "BNB to USDT",
    slug: "how-to-swap-bnb-to-usdt",
  },
  {
    kind: "guide",
    h1: "How to swap USDT to USDC",
    description:
      "Rotate USDT into USDC on-chain: native contracts, fees on a “1.00” pair, depeg versus wrong-variant discounts.",
    eyebrow: "Guide · Stablecoins",
    topic: "USDT to USDC",
    slug: "how-to-swap-usdt-to-usdc",
  },
  {
    kind: "guide",
    h1: "How to swap BTC to ETH",
    description:
      "Swap wrapped Bitcoin (WBTC, cbBTC, BTC.b, SPL wrappers) to ETH — not native BTC. Verify the wrapper and pool.",
    eyebrow: "Guide · Pairs",
    topic: "wrapped BTC to ETH",
    slug: "how-to-swap-btc-to-eth",
  },
  {
    kind: "guide",
    h1: "How to swap ERC-20 tokens",
    description:
      "ERC-20 swaps across Ethereum and EVM L2s: exact allowances, per-chain gas tokens, fee-on-transfer pitfalls.",
    eyebrow: "Guide · Tokens",
    topic: "ERC-20 swaps",
    slug: "how-to-swap-erc-20-tokens",
  },
  {
    kind: "guide",
    h1: "How to swap SPL tokens on Solana",
    description:
      "SPL and Token-2022 swaps: mint verification, freeze/mint authorities, Jupiter, SOL rent, simulation failures.",
    eyebrow: "Guide · Tokens",
    topic: "SPL swaps",
    slug: "how-to-swap-spl-tokens-on-solana",
  },
  {
    kind: "guide",
    h1: "How to swap tokens without KYC",
    description:
      "Non-custodial swaps with no signup: what “no KYC” actually means, what stays public on-chain, when a CEX is still right.",
    eyebrow: "Guide · Custody",
    topic: "swaps without KYC",
    slug: "how-to-swap-tokens-without-kyc",
  },
  {
    kind: "guide",
    h1: "How to swap with a hardware wallet",
    description:
      "Ledger/Trezor swaps on XAUConnect: trust the device screen, exact approvals, test clips on a hot wallet first.",
    eyebrow: "Guide · Wallets",
    topic: "hardware wallet swaps",
    slug: "how-to-swap-with-a-hardware-wallet",
  },
  {
    kind: "guide",
    h1: "How to move tokens from Ethereum to Base",
    description:
      "Ethereum → Base is a bridge, not a self-transfer: same 0x address, different ledgers, arriving USDC variants, ETH gas both sides.",
    eyebrow: "Guide · Cross-chain",
    topic: "Ethereum to Base",
    slug: "how-to-move-tokens-from-ethereum-to-base",
  },
  {
    kind: "guide",
    h1: "How to move tokens from Ethereum to Solana",
    description:
      "Cross-VM transfer: paste a base58 Solana destination, never 0x, test small, verify the arriving SPL mint on Solscan.",
    eyebrow: "Guide · Cross-chain",
    topic: "Ethereum to Solana",
    slug: "how-to-move-tokens-from-ethereum-to-solana",
  },
  {
    kind: "guide",
    h1: "How to swap stablecoins across chains",
    description:
      "Move USDC/USDT between networks: native vs bridged contracts, gas on both sides, when a same-chain rotation is smarter.",
    eyebrow: "Guide · Cross-chain",
    topic: "cross-chain stablecoins",
    slug: "how-to-swap-stablecoins-across-chains",
  },
  {
    kind: "guide",
    h1: "How to wrap and unwrap ETH",
    description:
      "ETH ↔ WETH is 1:1 on the same chain, not a bridge. Keep native ETH for gas and verify canonical WETH.",
    eyebrow: "Guide · Tokens",
    topic: "wrap unwrap ETH",
    slug: "how-to-wrap-and-unwrap-eth",
  },
  {
    kind: "guide",
    h1: "How to swap on a Layer 2 network",
    description:
      "Arbitrum and Base as swap venues: same address, different balances, L2 ETH for gas, slow canonical exits to Ethereum.",
    eyebrow: "Guide · Networks",
    topic: "Layer 2 swaps",
    slug: "how-to-swap-on-a-layer-2-network",
  },
  {
    kind: "guide",
    h1: "How to swap AVAX to USDC",
    description:
      "AVAX → USDC on Avalanche C-Chain only: keep AVAX for gas, verify USDC, not a bridge to Ethereum dollars.",
    eyebrow: "Guide · Pairs",
    topic: "AVAX to USDC",
    slug: "how-to-swap-avax-to-usdc",
  },
  {
    kind: "guide",
    h1: "How to swap POL to USDC",
    description:
      "POL → native USDC on Polygon: gas buffer, bridged-USDC traps, not Ethereum MATIC.",
    eyebrow: "Guide · Pairs",
    topic: "POL to USDC",
    slug: "how-to-swap-pol-to-usdc",
  },
  {
    kind: "guide",
    h1: "How to create an ERC-20 token",
    description:
      "TokenFactory deploys a fixed-supply LaunchedToken (no mint, tax, or blacklist). Then lock liquidity so people can swap it.",
    eyebrow: "Guide · Create token",
    topic: "create ERC-20",
    slug: "how-to-create-an-erc-20-token",
  },
  {
    kind: "guide",
    h1: "How to create an SPL token on Solana",
    description:
      "Mint an SPL / Token-2022 asset with Solana tooling, revoke freeze/mint if you promised immutability, seed a Jupiter-routable pool.",
    eyebrow: "Guide · Create token",
    topic: "create SPL token",
    slug: "how-to-create-an-spl-token-on-solana",
  },
  {
    kind: "guide",
    h1: "How to create a token on Base",
    description:
      "Generate an ERC-20 on Base (8453) via Launchpad: ETH gas, lock LP against ETH or USDC, publish the Basescan address.",
    eyebrow: "Guide · Create token",
    topic: "create token on Base",
    slug: "how-to-create-a-token-on-base",
  },
  {
    kind: "guide",
    h1: "How to create a token on BNB Chain",
    description:
      "Generate a BNB Chain ERC-20: BNB launch fee, USDT or BNB liquidity, lock LP, share the BscScan address — not the ticker.",
    eyebrow: "Guide · Create token",
    topic: "create token on BNB Chain",
    slug: "how-to-create-a-token-on-bnb-chain",
  },
  {
    kind: "guide",
    h1: "How to create a token on Ethereum",
    description:
      "Mainnet TokenFactory deploy: budget ETH gas, mint supply to hardware, lock canonical LP, treat L2 as cheaper iteration.",
    eyebrow: "Guide · Create token",
    topic: "create token on Ethereum",
    slug: "how-to-create-a-token-on-ethereum",
  },
  {
    kind: "guide",
    h1: "How to generate a crypto token without coding",
    description:
      "No-code Launchpad wizard: four steps, wallet-signed createToken, demo vs live factory, then LP so the token is swappable.",
    eyebrow: "Guide · Create token",
    topic: "generate token no code",
    slug: "how-to-generate-a-crypto-token-without-coding",
  },
  {
    kind: "guide",
    h1: "How to add liquidity after creating a token",
    description:
      "Seed a pool with ETH/USDC/USDT/SOL, size for two-way trades, lock LP tokens, test a round-trip swap.",
    eyebrow: "Guide · Create token",
    topic: "add liquidity",
    slug: "how-to-add-liquidity-after-creating-a-token",
  },
  {
    kind: "guide",
    h1: "How to make a new token swappable",
    description:
      "Honest contract, locked pool, aggregator-visible venue, published address, and a working buy and sell before you market.",
    eyebrow: "Guide · Create token",
    topic: "make token swappable",
    slug: "how-to-make-a-new-token-swappable",
  },
  {
    kind: "guide",
    h1: "How to do your first swap after a token launch",
    description:
      "Second wallet, paste the deploy address, test buy then sell on XAUConnect, publish explorer hashes before inviting others.",
    eyebrow: "Guide · Create token",
    topic: "first swap after launch",
    slug: "how-to-do-your-first-swap-after-a-token-launch",
  },
  {
    kind: "guide",
    h1: "How to create a memecoin on XAUConnect",
    description:
      "One chain, honest permissions, locked LP, pasted address. The meme is marketing; the pool is the product. No fake multi-chain.",
    eyebrow: "Guide · Create token",
    topic: "create memecoin",
    slug: "how-to-create-a-memecoin-on-xauconnect",
  },
];

/** Concept explainers (Article schema). */
const CONCEPTS: SeedEntry[] = [
  {
    kind: "learn",
    h1: "What is a DEX aggregator?",
    description:
      "A DEX aggregator scans many liquidity venues and routes your trade for the best net output. How aggregation works and why it beats single-DEX quotes.",
    eyebrow: "Learn · Fundamentals",
    topic: "DEX aggregators",
  },
  {
    kind: "learn",
    h1: "What is an automated market maker (AMM)?",
    description:
      "AMMs replace order books with liquidity pools and a pricing formula. Constant-product math, why prices move per trade, and what LPs actually earn.",
    eyebrow: "Learn · Fundamentals",
    topic: "automated market makers",
  },
  {
    kind: "learn",
    h1: "What is a liquidity pool?",
    description:
      "Liquidity pools are the reserves AMMs trade against. How deposits, fees, and reserves work, and how pool depth affects the price you get.",
    eyebrow: "Learn · Fundamentals",
    topic: "liquidity pools",
  },
  {
    kind: "learn",
    h1: "Slippage vs price impact: what's the difference?",
    description:
      "Two terms traders confuse constantly. Slippage is a tolerance you set; price impact is what your trade size does to the pool. How they interact on every swap.",
    eyebrow: "Learn · Execution",
    topic: "slippage and price impact",
  },
  {
    kind: "learn",
    h1: "What is impermanent loss?",
    description:
      "Why providing liquidity can underperform simply holding the tokens. Impermanent loss explained with a concrete example and when fees offset it.",
    eyebrow: "Learn · Liquidity",
    topic: "impermanent loss",
  },
  {
    kind: "learn",
    h1: "What is a token approval and why does it matter?",
    description:
      "Before a router can move your ERC-20s it needs an approval. How allowances work, the risk of unlimited approvals, and safer alternatives.",
    eyebrow: "Learn · Security",
    topic: "token approvals",
  },
  {
    kind: "learn",
    h1: "What is MEV and how does sandwiching work?",
    description:
      "Maximal extractable value, front-running, and sandwich attacks explained. How public mempools expose your trade and what reduces the risk.",
    eyebrow: "Learn · Execution",
    topic: "MEV and sandwich attacks",
  },
  {
    kind: "learn",
    h1: "Gas fees explained across chains",
    description:
      "What you actually pay to transact on Ethereum, L2s, and Solana. Base fees, priority fees, and why a failed transaction still costs gas.",
    eyebrow: "Learn · Fees",
    topic: "gas fees",
  },
  {
    kind: "learn",
    h1: "How do cross-chain bridges work?",
    description:
      "Bridges move value between networks using lock-and-mint, burn-and-release, or liquidity networks. The trade-offs, the risks, and what to verify.",
    eyebrow: "Learn · Cross-chain",
    topic: "cross-chain bridges",
  },
  {
    kind: "learn",
    h1: "Meme coin risks every trader should know",
    description:
      "Thin liquidity, copycat contracts, insider supply, and rug pulls. A clear-eyed look at why meme coins are high risk and how to trade them with discipline.",
    eyebrow: "Learn · Risk",
    topic: "meme coin risks",
  },
  {
    kind: "learn",
    h1: "What is a fair launch?",
    description:
      "Fair launches aim to give everyone the same starting line — no pre-sale, no team allocation. What that means in practice and the caveats to check.",
    eyebrow: "Learn · Launchpad",
    topic: "fair launches",
  },
  {
    kind: "learn",
    h1: "How do limit orders work on a DEX?",
    description:
      "On-chain limit orders defer execution until price crosses your target. How they differ from spot swaps and the mechanics behind the fill.",
    eyebrow: "Learn · Orders",
    topic: "DEX limit orders",
  },
  {
    kind: "learn",
    h1: "Stablecoins: USDC vs USDT vs DAI",
    description:
      "Not all stablecoins are the same. Collateral models, bridged vs native variants, and why picking the right one prevents wide spreads and failed routes.",
    eyebrow: "Learn · Stablecoins",
    topic: "stablecoins",
  },
  {
    kind: "learn",
    h1: "Wrapped and bridged tokens explained",
    description:
      "Why WETH, wrapped BTC, and bridged USDC exist, how they differ from the native asset, and the decimals and contract checks that prevent costly mistakes.",
    eyebrow: "Learn · Fundamentals",
    topic: "wrapped and bridged tokens",
  },
  {
    kind: "learn",
    h1: "How to spot a rug pull",
    description:
      "Concrete on-chain warning signs of a rug: unlocked liquidity, concentrated holders, mint/blacklist permissions, and anonymous deploys with no audit.",
    eyebrow: "Learn · Risk",
    topic: "rug pull warning signs",
  },
  {
    kind: "learn",
    h1: "Why locked liquidity matters",
    description:
      "Liquidity locks and how they reduce (but don't eliminate) rug risk. How to verify a lock, read the unlock date, and weigh it against other signals.",
    eyebrow: "Learn · Risk",
    topic: "liquidity locks",
  },
  {
    kind: "learn",
    h1: "Tokenomics basics for traders",
    description:
      "Supply, distribution, emissions, and fee mechanics — the tokenomics that actually move price. A practical framework for reading a token before you buy.",
    eyebrow: "Learn · Fundamentals",
    topic: "tokenomics",
  },
  {
    kind: "learn",
    h1: "Market cap vs liquidity: don't confuse them",
    description:
      "A token can have a huge market cap and almost no liquidity. Why the two are different, and why liquidity is what determines whether you can actually exit.",
    eyebrow: "Learn · Fundamentals",
    topic: "market cap versus liquidity",
  },
  {
    kind: "learn",
    h1: "How order routing finds the best price",
    description:
      "Single-hop, multi-hop, and split routes. How an aggregator searches the graph of pools to maximize your output, and when more hops help or hurt.",
    eyebrow: "Learn · Execution",
    topic: "order routing",
  },
  {
    kind: "learn",
    h1: "Understanding aggregator and protocol fees",
    description:
      "The fees on a DEX trade: LP fee, aggregator/platform fee, and gas. How each is calculated, where it shows in the quote, and how to minimize total cost.",
    eyebrow: "Learn · Fees",
    topic: "aggregator fees",
  },
  {
    kind: "learn",
    h1: "What is a multi-hop swap?",
    description:
      "When no direct pool exists, trades route through an intermediate token. How multi-hop swaps work, why each hop adds cost, and when they're unavoidable.",
    eyebrow: "Learn · Execution",
    topic: "multi-hop swaps",
  },
  {
    kind: "learn",
    h1: "What happens when you sign a swap",
    description:
      "Connect vs approve vs swap: what each wallet signature authorizes on XAUConnect, and what a compromised site still cannot do without you.",
    eyebrow: "Learn · Security",
    topic: "wallet signatures",
    slug: "what-happens-when-you-sign-a-swap",
  },
  {
    kind: "learn",
    h1: "Native USDC vs bridged USDC",
    description:
      "Circle native USDC versus bridged USDC.e across seven chains — why tickers lie, how quotes pick a contract, and how not to bridge into the wrong token.",
    eyebrow: "Learn · Stablecoins",
    topic: "native vs bridged USDC",
    slug: "native-usdc-vs-bridged-usdc",
  },
  {
    kind: "learn",
    h1: "Non-custodial aggregator vs centralized exchange",
    description:
      "DEX aggregator vs CEX: custody, KYC, net price after withdrawals, finality, and when self-custody is the wrong tool.",
    eyebrow: "Learn · Fundamentals",
    topic: "aggregator vs CEX",
    slug: "non-custodial-aggregator-vs-cex",
  },
  {
    kind: "learn",
    h1: "Why swap quotes expire and transactions fail",
    description:
      "Stale quotes, explorer revert strings, allowance bugs, fee-on-transfer tokens, and a retry order that does not feed sandwich bots.",
    eyebrow: "Learn · Execution",
    topic: "failed swaps",
    slug: "why-swap-quotes-expire-and-failed-transactions",
  },
  {
    kind: "learn",
    h1: "Ethereum L2 vs Solana swap costs",
    description:
      "All-in swap cost across Ethereum, Arbitrum, Base, Polygon, BNB, Avalanche, and Solana — gas, depth, bridges, and quote-card behavior.",
    eyebrow: "Learn · Fees",
    topic: "chain swap costs",
    slug: "ethereum-l2-vs-solana-swap-costs",
  },
  {
    kind: "learn",
    h1: "How AI agents swap tokens without holding keys",
    description:
      "Planner vs policy vs signer: how agents should call the XAUConnect API without turning the model into a custodian.",
    eyebrow: "Learn · AI agents",
    topic: "AI agent swaps",
    slug: "how-ai-agents-swap-tokens-without-holding-keys",
  },
  {
    kind: "learn",
    h1: "How XAUConnect Discover ranks tokens",
    description:
      "Indexer plus GeckoTerminal plus DexScreener: how the Discover board is built, why trending is not a buy rating, and how to verify a card.",
    eyebrow: "Learn · Markets",
    topic: "Discover ranking",
    slug: "how-xauconnect-discovery-ranks-tokens",
  },
  {
    kind: "learn",
    h1: "What is a token swap?",
    description:
      "A DEX swap is a pool trade, not a send and not a bridge. How aggregators quote minimum received on XAUConnect.",
    eyebrow: "Learn · Fundamentals",
    topic: "what is a token swap",
    slug: "what-is-a-token-swap",
  },
  {
    kind: "learn",
    h1: "What is a multi-chain token?",
    description:
      "Official issuance vs bridged wrappers vs fake tickers. Why USDC on seven chains is seven contracts, not one balance.",
    eyebrow: "Learn · Multi-chain",
    topic: "multi-chain tokens",
    slug: "what-is-a-multi-chain-token",
  },
  {
    kind: "learn",
    h1: "How to choose which chain to swap on",
    description:
      "Start from inventory and home liquidity, then compare gas plus impact. Do not bridge $200 to save forty cents of gas.",
    eyebrow: "Learn · Multi-chain",
    topic: "choosing a swap chain",
    slug: "how-to-choose-which-chain-to-swap-on",
  },
  {
    kind: "learn",
    h1: "Cheapest chain to swap crypto",
    description:
      "Solana, L2s, BNB, and Ethereum each win different trades. All-in cost is gas plus impact plus any bridge.",
    eyebrow: "Learn · Fees",
    topic: "cheapest swap chain",
    slug: "cheapest-chain-to-swap-crypto",
  },
  {
    kind: "learn",
    h1: "How to swap the same ticker on multiple chains",
    description:
      "Keep an address book, paste contracts, only bridge official mappings. Same ticker is not the same token.",
    eyebrow: "Learn · Multi-chain",
    topic: "same ticker multiple chains",
    slug: "how-to-swap-the-same-ticker-on-multiple-chains",
  },
  {
    kind: "learn",
    h1: "Token mint, freeze, and blacklist permissions",
    description:
      "How mint/freeze/blacklist trap swappers, what LaunchedToken removes, and what to read on the explorer before you buy.",
    eyebrow: "Learn · Risk",
    topic: "token permissions",
    slug: "token-mint-freeze-and-blacklist-permissions",
  },
  {
    kind: "learn",
    h1: "ERC-20 vs SPL token standards",
    description:
      "Approvals versus simulation, 0x versus base58, which standard to create on, and how XAUConnect swaps each.",
    eyebrow: "Learn · Fundamentals",
    topic: "ERC-20 vs SPL",
    slug: "erc-20-vs-spl-token-standards",
  },
  {
    kind: "learn",
    h1: "How bonding-curve launches work on XAUConnect",
    description:
      "createLaunch versus TokenFactory, graduation to an AMM pool, and when the main Swap page can route the token.",
    eyebrow: "Learn · Launchpad",
    topic: "bonding-curve launches",
    slug: "how-bonding-curve-launches-work-on-xauconnect",
  },
  {
    kind: "learn",
    h1: "What happens after you generate a crypto token",
    description:
      "Publish the address, lock LP, test swaps, survive clones, refuse fake multi-chain, and treat Discover as tape.",
    eyebrow: "Learn · Launchpad",
    topic: "after generating a token",
    slug: "what-happens-after-you-generate-a-crypto-token",
  },
];

export function generateLearnEntries(): LearnEntry[] {
  const entries: LearnEntry[] = [];
  const seen = new Set<string>();

  for (const seed of [...GUIDES, ...CONCEPTS]) {
    const slug = seed.slug ?? learnSlug(seed.h1.replace(/XAUConnect/gi, "xauconnect"));
    if (seen.has(slug)) continue;
    seen.add(slug);
    entries.push({
      slug,
      kind: seed.kind,
      title: seed.title ?? `${seed.h1} | ${BRAND_NAME}`,
      h1: seed.h1,
      description: seed.description,
      eyebrow: seed.eyebrow,
      topic: seed.topic,
    });
  }

  saveLearnEntries(entries);
  log(
    "learn entries",
    `${entries.length} curated (${entries.filter((e) => e.kind === "guide").length} guides, ${entries.filter((e) => e.kind === "learn").length} concepts)`,
  );
  return entries;
}
