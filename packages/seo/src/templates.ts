import { BRAND_NAME, BRAND_TAGLINE, getChainByKey } from "@xauconnect/utils";
import type { ChainInfo } from "@xauconnect/utils";
import type { SeoFaq, SeoPageConfig, SeoSection, TokenCatalogEntry } from "./types.js";
import { SITE_URL } from "./types.js";

function faqs(items: [string, string][]): SeoFaq[] {
  return items.map(([question, answer]) => ({ question, answer }));
}

function disclaimer(): SeoSection {
  return {
    heading: "Risk disclaimer",
    body: `${BRAND_NAME} is a non-custodial swap aggregator. Token prices are volatile. Nothing on this page is financial advice. Always verify contract addresses on the official block explorer before trading.`,
  };
}

export function chainHubPage(chain: ChainInfo): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  return {
    chainKey: chain.key,
    title: `${chain.name} DEX Aggregator — Swap on ${chain.nativeSymbol} | ${BRAND_NAME}`,
    h1: `Trade on ${chain.name} with ${BRAND_NAME}`,
    description: `Swap tokens on ${chain.name} (${chain.nativeSymbol}) with ${BRAND_NAME}. Compare routes across DEXs, pay fees in USDC, and access deep liquidity on ${chain.name}.`,
    eyebrow: `${chain.name} · Multi-DEX routing`,
    intro: `${BRAND_NAME} routes your ${chain.name} swaps through the best available liquidity pools and aggregators. Pay platform fees in USDC, set slippage, and execute in one click — whether you are swapping ${chain.nativeSymbol}, stablecoins, or trending memecoins on ${chain.name}.`,
    sections: [
      {
        heading: `Why swap on ${chain.name}?`,
        body: `${chain.name} hosts deep on-chain liquidity across Uniswap-style AMMs, native DEXs, and aggregator paths. ${BRAND_NAME} compares quotes so you receive more output tokens without manually checking every venue.`,
      },
      {
        heading: "XAU routing on this chain",
        body: `Connect your wallet, pick ${chain.nativeSymbol} or any supported token, and ${BRAND_NAME} surfaces competitive routes with transparent fee breakdowns. Limit orders and launchpad listings are available where deployed.`,
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`Does ${BRAND_NAME} support ${chain.name}?`, `Yes — ${chain.name} is a first-class network in ${BRAND_NAME} with live quoting and swap execution.`],
      [`What wallet works on ${chain.name}?`, `Use any wallet that supports ${chain.kind === "solana" ? "Solana" : "EVM"} on ${chain.name}. Connect via the swap widget on this page.`],
      [`Are fees paid in ${chain.nativeSymbol}?`, `Platform fees can be paid in USDC on supported chains, reducing the need to keep extra ${chain.nativeSymbol} for gas-heavy fee payments.`],
    ]),
    relatedPaths: [`/swap/${chain.key}`, `/trade/${chain.key}`, `/discover/${chain.key}`],
    keywords: [`${chain.name} swap`, `${chain.nativeSymbol} DEX`, `${chain.key} aggregator`, BRAND_NAME],
  };
}

export function swapHubPage(chain: ChainInfo): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  return {
    chainKey: chain.key,
    title: `Swap on ${chain.name} — Best Price ${chain.nativeSymbol} & Token Trades | ${BRAND_NAME}`,
    h1: `Swap tokens on ${chain.name}`,
    description: `Instant ${chain.name} token swaps with ${BRAND_NAME}. Compare DEX routes, slippage-protected trades, and USDC fee payment on ${chain.nativeSymbol} pairs.`,
    eyebrow: `Swap · ${chain.name}`,
    intro: `Use the swap widget below to trade any supported asset on ${chain.name}. ${BRAND_NAME} ${BRAND_TAGLINE.toLowerCase()} Route through multiple liquidity sources in one interface.`,
    sections: [
      {
        heading: "How swapping works",
        body: `Enter an amount, review compared routes, approve the token if needed, and confirm. ${BRAND_NAME} handles quote aggregation; your wallet signs the on-chain transaction.`,
      },
      {
        heading: `Popular ${chain.name} pairs`,
        body: `Native ${chain.nativeSymbol} to USDC, stablecoin swaps, and trending meme tokens are all supported. Search by name or paste a contract address.`,
      },
      disclaimer(),
    ],
    faqs: faqs([
      ["What slippage should I use?", "For liquid pairs 0.5% is typical. Volatile memecoins may need 1–3% depending on pool depth."],
      ["Where do quotes come from?", `${BRAND_NAME} aggregates on-chain liquidity and third-party routing APIs where configured for ${chain.name}.`],
    ]),
    relatedPaths: [`/chains/${chain.key}`, `/buy/${chain.key}`, `/meme-coins/${chain.key}`],
    keywords: [`swap ${chain.key}`, `${chain.name} token swap`, BRAND_NAME],
  };
}

export function tokenIntentPage(
  intent: "swap" | "buy" | "sell",
  chain: ChainInfo,
  token: TokenCatalogEntry,
): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  const verb = intent === "swap" ? "Swap" : intent === "buy" ? "Buy" : "Sell";
  const path =
    intent === "swap"
      ? `/swap/${chain.key}/${token.slug}`
      : `/${intent}/${chain.key}/${token.slug}`;
  const preset = intent === "sell" ? { tokenIn: token.address } : { tokenOut: token.address };

  return {
    chainKey: chain.key,
    tokenSlug: token.slug,
    tokenAddress: token.address,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    swapPreset: preset,
    canonicalPath: intent === "swap" ? path : `/swap/${chain.key}/${token.slug}`,
    title: `${verb} ${token.symbol} on ${chain.name} — ${token.name} | ${BRAND_NAME}`,
    h1: `${verb} ${token.name} (${token.symbol}) on ${chain.name}`,
    description: `${verb} ${token.symbol} on ${chain.name} with ${BRAND_NAME}. Live quotes, multi-DEX routing, and slippage control for ${token.name}.`,
    eyebrow: `${verb} · ${chain.name}`,
    intro: `${verb} **${token.name} (${token.symbol})** on ${chain.name} through ${BRAND_NAME}. Compare routes before you confirm — ideal for ${intent === "buy" ? "accumulating" : intent === "sell" ? "taking profit on" : "trading"} ${token.symbol} against ${chain.nativeSymbol} or stablecoins.`,
    sections: [
      {
        heading: `${token.symbol} on ${chain.name}`,
        body: `${token.name} trades on ${chain.name} AMM pools and aggregator paths indexed by ${BRAND_NAME}. Verify the contract address ${token.address.slice(0, 10)}… on ${chain.explorerUrl} before swapping.`,
      },
      {
        heading: `${verb} ${token.symbol} in three steps`,
        body: `1. Connect wallet\n2. Set ${intent === "sell" ? "sell" : "buy"} amount for ${token.symbol}\n3. Review route and confirm`,
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`How do I ${intent} ${token.symbol} on ${chain.name}?`, `Connect your wallet in the swap widget, select ${token.symbol}, enter amount, and confirm the best route.`],
      [`Is ${token.symbol} safe to trade?`, "Always DYOR. Check liquidity, holder distribution, and contract verification on the block explorer."],
      [`What fees does ${BRAND_NAME} charge?`, "Platform fees are shown in the quote breakdown before you sign. Gas is paid separately to the network."],
    ]),
    relatedPaths: [`/swap/${chain.key}`, `/token/${chain.key}/${token.address}`, `/chains/${chain.key}`],
    keywords: [`${intent} ${token.symbol}`, `${token.symbol} ${chain.key}`, token.name, BRAND_NAME],
  };
}

export function memeHubPage(chain: ChainInfo): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  return {
    chainKey: chain.key,
    title: `${chain.name} Meme Coins — Swap Trending Memecoins | ${BRAND_NAME}`,
    h1: `Meme coins on ${chain.name}`,
    description: `Discover and swap trending meme coins on ${chain.name}. ${BRAND_NAME} aggregates liquidity for ${chain.nativeSymbol} memecoin pairs.`,
    eyebrow: `Meme coins · ${chain.name}`,
    intro: `Trade the latest ${chain.name} memecoins with slippage controls and transparent routing. ${BRAND_NAME} indexes trending pools so you can swap without hunting contracts manually.`,
    sections: [
      {
        heading: "Memecoin trading tips",
        body: "Check liquidity depth, avoid unaudited contracts, and use conservative slippage on thin pools. Never trade more than you can afford to lose.",
      },
      disclaimer(),
    ],
    faqs: faqs([
      ["What are meme coins?", "Community-driven tokens with high volatility. They can gain or lose value rapidly."],
      [`Does ${BRAND_NAME} list every ${chain.name} meme?`, "We index major pools and trending tokens; new launches appear as liquidity is detected."],
    ]),
    relatedPaths: [`/swap/${chain.key}`, `/launch/${chain.key}`, `/discover/${chain.key}`],
    keywords: [`${chain.name} meme coins`, "memecoin swap", BRAND_NAME],
  };
}

export function launchHubPage(chain: ChainInfo): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  return {
    chainKey: chain.key,
    title: `Launch a Token on ${chain.name} — Meme Launchpad | ${BRAND_NAME}`,
    h1: `Launch tokens on ${chain.name}`,
    description: `Create and launch tokens on ${chain.name} with ${BRAND_NAME} launchpad. Fair launches, liquidity zaps, and discover feed visibility.`,
    eyebrow: `Launchpad · ${chain.name}`,
    intro: `Deploy your token on ${chain.name} through the ${BRAND_NAME} launchpad. Configure supply, add initial liquidity, and reach traders on Discover.`,
    sections: [
      {
        heading: "Launch workflow",
        body: "Define token metadata, pay launch fee, seed liquidity, and publish to the live launch feed.",
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`Can I launch on ${chain.name}?`, `${BRAND_NAME} supports token launches on ${chain.name} where the launchpad contract is deployed.`],
    ]),
    relatedPaths: [`/launchpad`, `/discover/${chain.key}`, `/meme-coins/${chain.key}`],
    keywords: [`launch token ${chain.key}`, "meme launchpad", BRAND_NAME],
  };
}

export function discoverHubPage(chain: ChainInfo): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  return {
    chainKey: chain.key,
    title: `Discover Tokens on ${chain.name} — Live Charts & Launches | ${BRAND_NAME}`,
    h1: `Discover ${chain.name} tokens`,
    description: `Explore trending tokens, new launches, and live charts on ${chain.name}. ${BRAND_NAME} Discover surfaces indexed pools and launchpad listings.`,
    eyebrow: `Discover · ${chain.name}`,
    intro: `Browse ${chain.name} markets indexed by ${BRAND_NAME} — from established assets to fresh launchpad tokens with live price and liquidity data.`,
    sections: [
      {
        heading: "What Discover shows",
        body: "Pool snapshots, swap activity, launch feed entries, and token detail pages linked from each market.",
      },
      disclaimer(),
    ],
    faqs: faqs([
      ["How often is data updated?", "Indexer workers refresh pool and swap data continuously; charts may lag slightly during high network load."],
    ]),
    relatedPaths: [`/discover`, `/swap/${chain.key}`, `/launch/${chain.key}`],
    keywords: [`discover ${chain.key}`, "token scanner", BRAND_NAME],
  };
}

export function tradeHubPage(chain: ChainInfo): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  return {
    chainKey: chain.key,
    title: `Trade on ${chain.name} — DEX Aggregator & Charts | ${BRAND_NAME}`,
    h1: `Trade crypto on ${chain.name}`,
    description: `Trade tokens on ${chain.name} with aggregated liquidity, limit orders, and launchpad access via ${BRAND_NAME}.`,
    eyebrow: `Trade · ${chain.name}`,
    intro: `${BRAND_NAME} is your trading hub for ${chain.name}: spot swaps, route comparison, and access to newly launched tokens.`,
    sections: [
      {
        heading: "Trading features",
        body: "Multi-route quotes, slippage settings, optional limit orders, and wallet-native execution.",
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`How is trade different from swap?`, "Same engine — this hub emphasizes active trading workflows and pair discovery on " + chain.name + "."],
    ]),
    relatedPaths: [`/swap/${chain.key}`, `/pairs/${chain.key}`, `/discover/${chain.key}`],
    keywords: [`trade ${chain.key}`, `${chain.name} DEX`, BRAND_NAME],
  };
}

export function pairPage(
  chain: ChainInfo,
  base: TokenCatalogEntry,
  quote: TokenCatalogEntry,
  pairSlugValue: string,
): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  return {
    chainKey: chain.key,
    pairSlug: pairSlugValue,
    title: `${base.symbol}/${quote.symbol} on ${chain.name} — Live Swap | ${BRAND_NAME}`,
    h1: `${base.symbol} to ${quote.symbol} on ${chain.name}`,
    description: `Swap ${base.symbol} for ${quote.symbol} on ${chain.name}. Compare ${base.symbol}/${quote.symbol} routes and liquidity on ${BRAND_NAME}.`,
    eyebrow: `Pair · ${chain.name}`,
    intro: `Trade the **${base.symbol}/${quote.symbol}** pair on ${chain.name}. ${BRAND_NAME} finds the best path across indexed pools for this pair.`,
    swapPreset: { tokenIn: base.address, tokenOut: quote.address },
    sections: [
      {
        heading: "Pair overview",
        body: `${base.name} (${base.symbol}) against ${quote.name} (${quote.symbol}) is one of the most traded combinations on ${chain.name}. Use the widget to quote exact amounts.`,
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`How do I swap ${base.symbol} to ${quote.symbol}?`, "Select both tokens in the swap widget or use the preset loaded on this page."],
    ]),
    relatedPaths: [`/swap/${chain.key}/${base.slug}`, `/swap/${chain.key}/${quote.slug}`],
    keywords: [`${base.symbol} ${quote.symbol}`, `${chain.key} pair`, BRAND_NAME],
  };
}

export function learnPage(entry: {
  slug: string;
  title: string;
  h1: string;
  description: string;
  eyebrow?: string;
  topic?: string;
}): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  const topic = entry.topic ?? entry.title;
  return {
    slug: entry.slug,
    title: entry.title,
    h1: entry.h1,
    description: entry.description,
    eyebrow: entry.eyebrow ?? "Learn · DeFi",
    intro: `Learn about **${topic}** with ${BRAND_NAME}. This guide explains concepts, risks, and how to use ${SITE_URL} for safer multi-chain trading.`,
    sections: [
      {
        heading: topic,
        body: `${BRAND_NAME} helps traders swap across seven networks with aggregated liquidity. Understanding ${topic.toLowerCase()} helps you make informed decisions before connecting your wallet.`,
      },
      {
        heading: "Put knowledge into practice",
        body: "Use the swap widget on this page to apply what you learned with live quotes and transparent fees.",
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`What is ${topic}?`, `A core DeFi concept relevant to multi-chain swapping and liquidity on ${BRAND_NAME}.`],
      [`Does ${BRAND_NAME} support this?`, "Yes — features vary by chain; check in-app settings and chain hub pages for availability."],
    ]),
    relatedPaths: ["/swap", "/learn/guides/how-to-swap-tokens-on-xauconnect", "/discover"],
    keywords: [topic, "DeFi guide", BRAND_NAME],
  };
}

export function searchPhrasePage(entry: {
  slug: string;
  phrase: string;
  title: string;
  h1: string;
  description: string;
  eyebrow?: string;
  chainKey?: string;
  tokenSymbol?: string;
  keywords?: string[];
  swapPreset?: { tokenIn?: string; tokenOut?: string };
}): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  const phrase = entry.phrase;
  return {
    slug: entry.slug,
    chainKey: entry.chainKey,
    tokenSymbol: entry.tokenSymbol,
    swapPreset: entry.swapPreset,
    title: entry.title,
    h1: entry.h1,
    description: entry.description,
    eyebrow: entry.eyebrow ?? "Search · Swap",
    intro: `**${phrase}** is easier when you can compare live DEX routes, fees, and minimum received before you sign. ${BRAND_NAME} is a non-custodial aggregator across Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche — read the steps below, then open a live quote.`,
    sections: [
      {
        heading: phrase,
        body: `The practical goal behind **${phrase.toLowerCase()}** is the same: swap or trade tokens at a fair net price without giving up custody. ${BRAND_NAME} compares DEX and aggregator paths so you see spread, platform fees, and estimated gas before you confirm.`,
      },
      {
        heading: `How ${BRAND_NAME} helps`,
        body: "Connect your wallet once, pick tokens, review the best route, and sign. No account signup — quotes update with market conditions. Platform fees can be paid in USDC on supported chains.",
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`Can I do this on ${BRAND_NAME}?`, `${BRAND_NAME} aggregates liquidity across major networks and shows transparent quotes before you sign — no account required to read this page.`],
      ["Do I need to create an account?", "No. Connect a compatible wallet when you are ready to execute; reading this page requires no signup."],
      ["Which chains are supported?", "Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana."],
      ["Is this financial advice?", "No. Educational trading mechanics only — always verify contracts and do your own research."],
    ]),
    relatedPaths: ["/swap", "/discover", entry.chainKey ? `/chains/${entry.chainKey}` : "/chains/ethereum"],
    keywords: entry.keywords?.length ? entry.keywords : [phrase, "crypto swap", BRAND_NAME],
  };
}

export function crossChainSearchPhrasePage(entry: {
  slug: string;
  phrase: string;
  title: string;
  h1: string;
  description: string;
  eyebrow?: string;
  fromChainKey: string;
  toChainKey: string;
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
  keywords?: string[];
  swapPreset?: {
    tokenIn?: string;
    tokenOut?: string;
    fromChainKey?: string;
    toChainKey?: string;
  };
}): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  const fromChain = getChainByKey(entry.fromChainKey);
  const toChain = getChainByKey(entry.toChainKey);
  const fromName = fromChain?.name ?? entry.fromChainKey;
  const toName = toChain?.name ?? entry.toChainKey;
  const phrase = entry.phrase;

  return {
    slug: entry.slug,
    fromChainKey: entry.fromChainKey,
    toChainKey: entry.toChainKey,
    chainKey: entry.fromChainKey,
    tokenSymbol: entry.tokenInSymbol,
    swapPreset: entry.swapPreset,
    title: entry.title,
    h1: entry.h1,
    description: entry.description,
    eyebrow: entry.eyebrow ?? `Cross-chain search · ${fromName} → ${toName}`,
    intro: `Moving assets from **${fromName}** to **${toName}** without juggling multiple bridge UIs is the job of a cross-chain aggregator. **${BRAND_NAME}** compares cross-chain routes (0x Cross-Chain and fallbacks), shows net receive amount and fees, and lets you sign from one non-custodial swap screen.\n\nConnect your wallet on ${fromName} first. Keep a small amount of ${fromChain?.nativeSymbol ?? "native coin"} for gas on the source chain before you bridge.`,
    sections: [
      {
        heading: phrase,
        body: `Searchers typing "${phrase.toLowerCase()}" usually want a safe bridge plus swap path with transparent pricing. ${BRAND_NAME} surfaces cross-chain quotes side-by-side so you can compare arrival time, slippage, and platform fees before approving.`,
      },
      {
        heading: `Bridging ${fromName} → ${toName}`,
        body: entry.tokenInSymbol && entry.tokenOutSymbol
          ? `Typical flow: approve ${entry.tokenInSymbol} on ${fromName} if needed, confirm the bridge transaction, wait for the relayer (often 1–10 minutes), then receive ${entry.tokenOutSymbol} on ${toName}. Use **Swap cross-chain** below to open a pre-filled trade.`
          : `Pick source and destination tokens in the swap widget, review the bridge steps, and sign once from your wallet. No account signup required.`,
      },
      {
        heading: "Why use an aggregator for cross-chain swaps",
        body: "Single-bridge UIs often hide the full path cost. An aggregator compares multiple bridge and DEX combinations so you see the net amount you receive instead of guessing after fees.",
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`Can I ${phrase.toLowerCase()} on ${BRAND_NAME}?`, `Yes — ${BRAND_NAME} supports cross-chain routing between ${fromName} and ${toName} when liquidity and bridge providers are available.`],
      [`How long does ${fromName} to ${toName} take?`, "Most EVM bridges confirm in 1–10 minutes depending on congestion. Solana routes may differ."],
      ["Do I need gas on both chains?", `You need native gas on ${fromName} to start the bridge. After arrival, ${toName} native coin may be needed for further swaps.`],
      ["Is this financial advice?", "No. Cross-chain bridging carries smart-contract and bridge risk. Verify addresses before signing."],
    ]),
    relatedPaths: [
      `/cross-chain/${entry.fromChainKey}/${entry.toChainKey}`,
      `/chains/${entry.fromChainKey}`,
      `/chains/${entry.toChainKey}`,
      "/swap",
    ],
    keywords: entry.keywords?.length
      ? entry.keywords
      : [phrase, "cross chain swap", fromName, toName, BRAND_NAME],
  };
}

export function crossChainSwapPage(
  fromChain: ChainInfo,
  toChain: ChainInfo,
  tokenIn: TokenCatalogEntry,
  tokenOut: TokenCatalogEntry,
  pairSlugValue: string,
): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  const phrase = `Swap ${tokenIn.symbol} from ${fromChain.name} to ${tokenOut.symbol} on ${toChain.name}`;
  return {
    fromChainKey: fromChain.key,
    toChainKey: toChain.key,
    pairSlug: pairSlugValue,
    chainKey: fromChain.key,
    tokenSymbol: tokenIn.symbol,
    swapPreset: {
      fromChainKey: fromChain.key,
      toChainKey: toChain.key,
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
    },
    title: `${phrase} | ${BRAND_NAME}`,
    h1: phrase,
    description: `Bridge and swap ${tokenIn.symbol} on ${fromChain.name} to ${tokenOut.symbol} on ${toChain.name} with ${BRAND_NAME}. Compare cross-chain routes, fees, and estimated arrival time before you sign.`,
    eyebrow: `Cross-chain · ${fromChain.name} → ${toChain.name}`,
    intro: `Move **${tokenIn.symbol}** from **${fromChain.name}** to **${tokenOut.symbol}** on **${toChain.name}** through ${BRAND_NAME}'s cross-chain router. Quotes aggregate bridge paths (0x Cross-Chain and fallbacks) so you see net receive amount, slippage, and steps before approving in your wallet.\n\nConnect on the source chain first. You need a small amount of ${fromChain.nativeSymbol} for gas on ${fromChain.name} even when the destination token is the native asset on ${toChain.name}.`,
    sections: [
      {
        heading: `Why bridge ${tokenIn.symbol} to ${toChain.name}?`,
        body: `Traders bridge when liquidity, fees, or opportunities are better on the destination network. ${BRAND_NAME} compares bridge + swap paths instead of forcing you to use a single bridge UI.`,
      },
      {
        heading: "How cross-chain execution works",
        body: `1. Approve ${tokenIn.symbol} on ${fromChain.name} if required\n2. Confirm the bridge transaction on ${fromChain.name}\n3. Wait for the bridge relayer (typically 1–10 minutes)\n4. Receive ${tokenOut.symbol} in your wallet on ${toChain.name}`,
      },
      {
        heading: `${tokenIn.symbol} → ${tokenOut.symbol} route details`,
        body: `Source: ${tokenIn.name} (${tokenIn.address.slice(0, 10)}…) on ${fromChain.name}\nDestination: ${tokenOut.name} (${tokenOut.address.slice(0, 10)}…) on ${toChain.name}\nUse the swap widget or the **Swap now** button to open a pre-filled cross-chain trade.`,
      },
      disclaimer(),
    ],
    faqs: faqs([
      [
        `How long does ${fromChain.name} to ${toChain.name} take?`,
        "Most EVM bridges confirm in 1–10 minutes depending on network congestion and the bridge provider. Solana routes may differ.",
      ],
      [
        `Do I need ${fromChain.nativeSymbol} and ${toChain.nativeSymbol}?`,
        `You need ${fromChain.nativeSymbol} on ${fromChain.name} to pay gas for approve + bridge. After arrival, ${toChain.nativeSymbol} may be needed for swaps on ${toChain.name}.`,
      ],
      [
        `Can I swap ${tokenIn.symbol} to ${tokenOut.symbol} in one step?`,
        `${BRAND_NAME} bundles bridge routing where supported so you sign from one interface instead of juggling multiple apps.`,
      ],
      [
        "Is this page financial advice?",
        "No. Cross-chain bridging carries smart-contract and bridge risk. Verify addresses and amounts before signing.",
      ],
    ]),
    relatedPaths: [
      `/swap/${fromChain.key}`,
      `/swap/${toChain.key}`,
      `/chains/${fromChain.key}`,
      `/chains/${toChain.key}`,
      `/search/cross-chain-token-swap`,
    ],
    keywords: [
      `swap ${tokenIn.symbol} ${fromChain.key} to ${toChain.key}`,
      `bridge ${tokenIn.symbol} to ${toChain.name}`,
      `${tokenIn.symbol} to ${tokenOut.symbol} cross chain`,
      "cross chain crypto swap",
      BRAND_NAME,
    ],
  };
}

export function tokenDeepPage(chain: ChainInfo, token: TokenCatalogEntry): Omit<SeoPageConfig, "id" | "kind" | "path"> {
  const canonical = `/swap/${chain.key}/${token.slug}`;
  return {
    chainKey: chain.key,
    tokenAddress: token.address,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    canonicalPath: canonical,
    title: `${token.name} (${token.symbol}) on ${chain.name} — Price & Swap | ${BRAND_NAME}`,
    h1: `${token.name} (${token.symbol})`,
    description: `${token.name} (${token.symbol}) on ${chain.name}: live chart, liquidity, holders, and swap via ${BRAND_NAME}.`,
    eyebrow: `${chain.name} · Token`,
    intro: `View **${token.name}** on ${chain.name} and swap ${token.symbol} with aggregated DEX routing. Contract: \`${token.address}\`.`,
    swapPreset: { tokenOut: token.address },
    sections: [
      {
        heading: "Token details",
        body: `${token.symbol} trades on ${chain.name}. Open the chart tab for indexed price history where available.`,
      },
      disclaimer(),
    ],
    faqs: faqs([
      [`Where can I swap ${token.symbol}?`, `Use the ${BRAND_NAME} swap widget on this page or visit ${canonical}.`],
    ]),
    relatedPaths: [canonical, `/chains/${chain.key}`, `/discover/${chain.key}`],
    keywords: [token.symbol, token.name, chain.key, BRAND_NAME],
  };
}

export function finalizePage(
  kind: SeoPageConfig["kind"],
  path: string,
  partial: Omit<SeoPageConfig, "id" | "kind" | "path">,
): SeoPageConfig {
  return {
    id: path.replace(/^\//, "").replace(/\//g, ":"),
    kind,
    path,
    ...partial,
  };
}
