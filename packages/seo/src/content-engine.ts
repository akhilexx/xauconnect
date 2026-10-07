/**
 * Generates unique 400+ word article bodies per SEO page from page metadata.
 * Deterministic — no external API. Used by enrich.ts during registry build.
 */
import { BRAND_NAME } from "@xauconnect/utils";
import type { SeoFaq, SeoPageConfig, SeoSection } from "./types.js";
import {
  RISK_FOOTER,
  chainFacts,
  hashSeed,
  joinParagraphs,
  marketSummarySentence,
  pickVariant,
} from "./content-blocks.js";
import { getLearnContent } from "./learn-content.js";
import { getChainProfile, type ChainProfile } from "./chain-content.js";
import { getTokenProfile, resolveTokenProfile } from "./token-content.js";
import {
  expandContentToMinimum,
  MIN_BODY_WORDS,
  type RichContent,
} from "./content-expand.js";
import { applyIndexingMetadata } from "./content-unique.js";
import { isTradingTipPage, tipNumber, TRADING_TIPS } from "./trading-tips.js";

export type { RichContent };

function disclaimerSection(): SeoSection {
  return { heading: "Risk disclosure", body: RISK_FOOTER };
}

function chainProfileFor(key?: string): ChainProfile {
  return getChainProfile(key) ?? getChainProfile("ethereum")!;
}

function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max - 1)}…`;
}

function searchIntent(phrase: string): {
  isHowTo: boolean;
  isBest: boolean;
  isFee: boolean;
  isCrossChain: boolean;
  isMeme: boolean;
  isP2p: boolean;
  isSafety: boolean;
  isWallet: boolean;
  isStable: boolean;
} {
  const p = phrase.toLowerCase();
  return {
    isHowTo: /\bhow to\b/.test(p),
    isBest: /\bbest\b|\btop\b|\bcompare\b|\bcheapest\b|\blowest\b/.test(p),
    isFee: /\bfee\b|\bslippage\b|\bgas\b|\bcheap/.test(p),
    isCrossChain: /\bcross[- ]chain\b|\bbridge\b|\bmultichain\b|\bmulti chain\b/.test(p),
    isMeme: /\bmeme\b|\bmemecoin\b/.test(p),
    isP2p: /\bp2p\b|\bpeer to peer\b|\botc\b|\bwithout escrow\b/.test(p),
    isSafety: /\bsafe\b|\bscam\b|\bavoid\b|\bsecure\b/.test(p),
    isWallet: /\bwallet\b|\bmetamask\b|\bphantom\b/.test(p),
    isStable: /\busdc\b|\busdt\b|\bstablecoin\b|\bdai\b/.test(p),
  };
}

function learnCategory(topic: string): string {
  const t = topic.toLowerCase();
  if (/slippage|price impact|spread/.test(t)) return "execution";
  if (/fee|gas|cost/.test(t)) return "fees";
  if (/bridge|cross|multichain|multi-chain/.test(t)) return "cross-chain";
  if (/wallet|seed|phishing|scam|security|approve/.test(t)) return "security";
  if (/liquidity|pool|amm|dex/.test(t)) return "liquidity";
  if (/limit order|order book/.test(t)) return "orders";
  if (/launch|meme|fair launch/.test(t)) return "launchpad";
  if (/tax|tokenomics|holder/.test(t)) return "tokenomics";
  return "general";
}

function workedSwapCost(facts: ReturnType<typeof chainFacts>, tradeLabel: string): string {
  if (facts.kind === "solana") {
    return `A typical ${tradeLabel} on ${facts.name} costs a fraction of a cent in base fee plus an optional priority fee during congestion. Keep a little ${facts.native} in the wallet so the swap is never blocked; the expensive part of a bad trade is almost always price impact, not the network fee.`;
  }
  if (facts.name === "Ethereum") {
    return `A typical ${tradeLabel} on Ethereum can cost several dollars in gas when the base fee is calm, and much more during congestion — often more than ${BRAND_NAME}'s 30 bps platform fee on a small clip. That is why many traders execute the same pair on an L2 and only use mainnet when the pool they need actually lives there.`;
  }
  return `A typical ${tradeLabel} on ${facts.name} is cheap in ${facts.native} gas compared with Ethereum mainnet. On this network the number that usually dominates all-in cost is price impact in the pool, not the gas line — which is why comparing minimum received still matters even when fees look tiny.`;
}

function multiChainIdentityNote(
  sym: string,
  facts: ReturnType<typeof chainFacts>,
  token: ReturnType<typeof resolveTokenProfile>,
): string {
  if (token?.category === "stablecoin") {
    return `${sym} exists on multiple networks, but each chain has its own contract. Native issuance and bridged copies are different tokens with different pools. When you “swap ${sym}” on ${facts.name} you are trading the ${facts.name} contract — not a global balance that follows you automatically. Confirm decimals and the explorer address before a large stablecoin rotation.`;
  }
  if (token?.category === "wrapped") {
    return `Wrapped ${sym} on ${facts.name} is a local representation. Unwrapping it does not move value to another chain; bridging does. If you need ${sym} on a different network, use the cross-chain flow rather than wrapping twice and hoping the tickets match.`;
  }
  if (token?.category === "meme") {
    return `Memecoins that share the ${sym} ticker on other chains are almost always unrelated contracts. There is no canonical multi-chain ${sym} unless the team published matching addresses and a real bridge. Treat every other-chain ${sym} as a separate, high-risk token until proven otherwise.`;
  }
  if (facts.kind === "solana") {
    return `${sym} on Solana is an SPL mint. The same ticker on Ethereum or Base is a different contract. You cannot send this mint to a 0x address. To hold a related asset on an EVM chain you must bridge through a supported route and then swap the representation that actually arrives.`;
  }
  return `${sym} on ${facts.name} is identified by its contract on this chain only. The same ticker on another network is a different asset unless a documented canonical bridge minted it. Use XAUConnect’s chain selector — not the ticker search alone — when you intend to trade a multi-chain name.`;
}

function buildTokenContent(page: SeoPageConfig): RichContent {
  const facts = chainFacts(page.chainKey);
  const profile = chainProfileFor(page.chainKey);
  const sym = (page.tokenSymbol ?? "TOKEN").toUpperCase();
  const name = page.tokenName ?? sym;
  const addr = page.tokenAddress ?? "";
  const addrShort = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
  const token = resolveTokenProfile(sym, page.tokenName);
  const isMeme = page.kind === "meme-token" || token?.category === "meme";
  const marketSentence = marketSummarySentence(sym, page.marketData);

  const verb = page.kind === "buy" ? "Buy" : page.kind === "sell" ? "Sell" : "Swap";
  const mark = addrShort ? ` (${addrShort})` : "";
  const lead =
    page.kind === "meme-token"
      ? `Swap **${sym}** meme coin on ${facts.name}${mark} by comparing pool depth, the route, and the minimum you receive before your wallet signs on ${BRAND_NAME}.`
      : `${verb} **${name} (${sym})** on ${facts.name}${mark} by comparing live routes, fees, and the minimum you receive before your wallet signs on ${BRAND_NAME}.`;

  const intro = joinParagraphs(
    token
      ? `${lead} ${token.summary}`
      : `${lead} This token trades through decentralized liquidity pools${addrShort ? ` at contract \`${addrShort}\`` : ""}. On-chain a token's contract address — not its ticker — is its only reliable identity, so verify the full address on ${facts.explorer} against an official source before trading. The ${sym} symbol can be reused by unrelated tokens, so the contract is the detail that matters.`,
    marketSentence,
    `On ${BRAND_NAME} you compare live routes for ${sym} across indexed pools and aggregators, seeing the minimum received, platform fee, and estimated gas before your wallet ever prompts you to sign. Execution is fully non-custodial: the funds stay in your wallet until you approve the transaction yourself.`,
  );

  const sections: SeoSection[] = [
    {
      heading: `Trading ${sym} on ${facts.name}`,
      body: joinParagraphs(
        token?.trading ??
          `Liquidity for ${sym} depends on the pools available on ${facts.name}. Check pool depth and 24-hour volume in Discover before sizing a position — thin markets produce heavy price impact and can make exits difficult, regardless of how the price chart looks.`,
        profile.liquidity,
      ),
    },
    {
      heading: `How to swap ${sym} step by step`,
      body: joinParagraphs(
        facts.kind === "solana"
          ? `1. Connect a Solana wallet such as Phantom.\n2. Select ${sym} as the token you pay or receive.\n3. Enter an amount and let the quote refresh.\n4. Review the route and the minimum received.\n5. Confirm — Solana simulates the transaction and shows the balance changes before you sign, with no separate approval step.`
          : `1. Connect an EVM wallet on ${facts.name}.\n2. Select ${sym} as the token you pay or receive.\n3. Enter an amount and let the quote refresh.\n4. Review the route, minimum received, and fee breakdown.\n5. Approve token spending once if prompted, then confirm the swap.`,
        profile.gas,
      ),
    },
    {
      heading: `Verifying ${sym} before you trade`,
      body: joinParagraphs(
        addr
          ? `The contract address for this token is \`${addr}\`. Compare the full string on ${facts.explorer} before approving anything — copycat and address-poisoning scams deliberately match the first and last characters, so checking only the ends is not enough.`
          : `Paste a verified ${sym} contract from an official source into the token field rather than selecting by ticker, which can surface look-alike tokens reusing the same symbol.`,
        profile.security,
      ),
    },
    {
      heading: `Wallets and risk on ${facts.name}`,
      body: joinParagraphs(
        profile.wallets,
        token?.risk ??
          `Treat ${sym} as carrying the full range of token risk until you have verified its contract, confirmed real liquidity, and checked that ordinary wallets can sell it. Size any position for the possibility of total loss.`,
        isMeme
          ? `As a memecoin, ${sym} can swing double digits while your transaction confirms. Treat early trades as small tests, confirm the token is sellable in both directions, and never commit more than you can afford to lose.`
          : null,
      ),
    },
    {
      heading: `${sym} across chains`,
      body: joinParagraphs(
        multiChainIdentityNote(sym, facts, token),
        `If your goal is to move ${sym} to another network rather than trade it here, open the cross-chain flow, confirm destination address format (${facts.kind === "solana" ? "base58 on Solana versus 0x on EVM" : "0x on EVM chains; Solana destinations are base58"}), and keep gas on both sides. A same-chain swap never bridges funds.`,
      ),
    },
    {
      heading: `What a ${sym} swap actually costs`,
      body: joinParagraphs(
        workedSwapCost(facts, `${sym} swap`),
        `${BRAND_NAME} shows the platform fee (typically 30 bps on configured EVM routers), estimated ${facts.native} gas, and the minimum received after pool fees. Rank routes by that floor, not by a headline rate. On thin ${sym} pools, splitting size across a few blocks often beats one aggressive clip.`,
      ),
    },
    {
      heading: isMeme ? `Creating a copy of ${sym} vs buying this contract` : `After you swap ${sym}`,
      body: joinParagraphs(
        isMeme
          ? `Anyone can deploy a token that reuses the ${sym} ticker. That is not this asset. If you want to generate your own token, use the Launchpad (EVM: TokenFactory for a fixed-supply ERC-20 with no mint, tax, or blacklist, or a bonding-curve launch). Then add locked liquidity and paste the new address into Swap. Buying this ${sym} page’s contract is a different action from minting a lookalike.`
          : `After confirmation, check the receipt on ${facts.explorer}. If you received a stablecoin, confirm it is the native or deepest variant before you bridge it. If you plan a second hop — for example ${sym} into another token — re-quote rather than chaining stale numbers. Generating a new crypto token is a Launchpad flow, not this swap page.`,
        `To trade ${sym} now, open Swap on ${facts.name}, paste the verified contract if the ticker is crowded, and start with a size you can afford to lose.`,
      ),
    },
    disclaimerSection(),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `What is ${sym}?`,
      answer: token
        ? token.summary
        : `${name} (${sym}) is a token trading on ${facts.name}. Because tickers can be copied, verify the contract on ${facts.explorer} against an official source before trading — the address, not the symbol, identifies the asset.`,
    },
    {
      question: `How do I swap ${sym} on ${BRAND_NAME}?`,
      answer: `Connect your wallet on ${facts.name}, select ${sym}, enter an amount, and compare the routes. ${facts.kind === "solana" ? "Review the simulated balance changes" : "Approve token spending if prompted"}, then confirm. The minimum received and all fees are shown before you sign.`,
    },
    {
      question: `What does it cost to trade ${sym}?`,
      answer: `${BRAND_NAME} shows its platform fee directly in the quote, and network gas is paid separately in ${facts.native} on ${facts.name}. On thin pools, price impact from your own trade size is usually the larger cost — compare the minimum received across routes.`,
    },
    {
      question: `Is ${sym} safe to trade?`,
      answer: token
        ? token.risk
        : `${BRAND_NAME} does not audit tokens. Verify the contract, check liquidity depth and holder concentration, and confirm ordinary wallets have sold it before committing size. Start with a small test trade.`,
    },
    { question: `Which wallet should I use on ${facts.name}?`, answer: profile.wallets },
    {
      question: `Can I swap ${sym} on other chains?`,
      answer: `Only if a verified contract or mint exists there with real liquidity. The ${sym} ticker is not a global account. On ${facts.name} you are always trading the address shown on this page. Use cross-chain mode to move value; do not send ${facts.kind === "solana" ? "SPL tokens to an EVM 0x address" : "ERC-20s to a Solana base58 address"}.`,
    },
    {
      question: `How do I generate or launch my own token instead?`,
      answer: `Open Launchpad, pick an EVM chain, choose a standard fixed-supply ERC-20 (no mint/tax/blacklist) or a bonding-curve launch, then add and lock liquidity. After deploy, traders swap it by pasting the new contract — they should not hunt by ticker. Solana SPL mints use the Solana token programs; XAUConnect then routes those mints through Jupiter once liquidity exists.`,
    },
  ];

  return {
    intro,
    sections,
    faqs,
    description: clampDescription(
      `Swap ${sym} (${name}) on ${facts.name}: compare live DEX routes, slippage, and fees on ${BRAND_NAME}. Verify the contract and check liquidity before you trade.`,
    ),
  };
}

function buildSearchContent(page: SeoPageConfig, seed: number): RichContent {
  const topic = page.h1;
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;
  const intent = searchIntent(topic);

  const intro = joinParagraphs(
    intent.isBest
      ? `Choosing the **${topic.toLowerCase()}** comes down to net output, custody, and how clearly fees are shown before you sign. ${BRAND_NAME} compares routes from multiple liquidity sources across seven networks and ranks them by minimum received after platform fees — not by marketing headlines alone.`
      : intent.isHowTo
        ? `This guide covers **${topic.toLowerCase()}** step by step using ${BRAND_NAME}. You keep custody of your wallet keys throughout; the platform aggregates quotes and builds transactions for you to approve.`
        : chain
          ? `**${topic}** on ${chain.name} is straightforward with a non-custodial aggregator: connect your wallet, pick tokens, compare routes, and sign when the quote looks right. ${BRAND_NAME} shows fees, gas estimates, and minimum received before any transaction is sent.`
          : `**${topic}** is easier when one interface covers Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche. ${BRAND_NAME} aggregates DEX liquidity, displays transparent fees, and executes only after your wallet approves each step.`,
    intent.isFee
      ? `Remember that "low fee" interfaces can still deliver worse output if price impact is high or the pool is thin. Always compare minimum received across routes.`
      : intent.isSafety
        ? `Self-custody means you are responsible for verifying contracts and URLs. The checklist below covers the habits that prevent most preventable losses.`
        : `${BRAND_NAME} does not require account registration to obtain quotes — connect a wallet only when you are ready to trade.`,
  );

  const sections: SeoSection[] = [
    {
      heading: intent.isBest ? "What makes a DEX worth using" : intent.isHowTo ? "Before you start" : "Key points",
      body: joinParagraphs(
        intent.isBest
          ? `Reliable aggregators show route sources, minimum received, platform fees, and estimated gas in one view. Custody stays in your wallet — there is no deposit address or omnibus balance.`
          : `Decentralized swaps settle against on-chain pools, not a centralized order book. Prices move every block as other traders execute, which is why quotes expire and should be refreshed before signing.`,
        chain
          ? `On ${chain.name}, ${chain.liquidityNote}`
          : `Pick the network where your tokens already live before quoting. Moving assets between chains requires a separate bridge flow.`,
        intent.isCrossChain
          ? `Cross-chain moves add bridge time and smart-contract risk on top of ordinary swap mechanics. Use dedicated cross-chain mode to see each step and estimated arrival time.`
          : intent.isMeme
            ? `Memecoins often have thin liquidity and copycat contracts. Verify the full address on the block explorer before approving spending.`
            : intent.isStable
              ? `Stablecoin pairs should show tight spreads. If output deviates materially from input, check pool depth and whether you selected the correct token variant.`
              : null,
      ),
    },
    {
      heading: intent.isHowTo ? "Step-by-step" : intent.isSafety ? "Safety checklist" : "What to check before you swap",
      body: joinParagraphs(
        intent.isHowTo
          ? `1. Select network and tokens in the swap widget\n2. Connect a compatible wallet\n3. Enter amount and wait for quotes to refresh\n4. Compare routes by minimum received\n5. Set slippage appropriate to pool depth\n6. Approve token spending once if required\n7. Confirm the swap and verify receipt on the explorer`
          : `• Compare minimum received, not just the displayed rate\n• Read platform and routing fees in the quote breakdown\n• Confirm token contract on the official explorer\n• Keep native gas available for approvals and the swap\n• Start with a small test amount on unfamiliar tokens`,
        intent.isFee
          ? `Price impact can cost more than explicit fees on large trades. Split orders when impact exceeds your comfort level.`
          : intent.isWallet
            ? `Confirm the site URL, add the correct network in your wallet, and never share your recovery phrase with anyone claiming to be support.`
            : `If quotes fail, reduce size slightly, nudge slippage up incrementally, or retry after network congestion eases.`,
      ),
    },
    {
      heading: `Using ${BRAND_NAME}`,
      body: joinParagraphs(
        `${BRAND_NAME} supports spot swaps and cross-chain routes with wallet-signed execution. Quotes refresh as pool reserves change — if you wait more than a minute between preview and signature, request a fresh quote.`,
        chain
          ? `For ${chain.name}, ${chain.walletNote} ${chain.gasProfile}`
          : `Switch networks from the chain selector without leaving the app. Each network uses its own gas token and block explorer.`,
      ),
    },
    {
      heading: pickVariant(["Common mistakes to avoid", "Why traders get poor fills", "Execution pitfalls"], seed, 7),
      body: joinParagraphs(
        pickVariant(
          [
            "Copying token addresses from social media without verifying every character on the explorer.",
            "Setting slippage to maximum on the first attempt — this invites sandwich losses on public mempools.",
            "Assuming bridge receipts will match previews when destination chain congestion spikes.",
          ],
          seed,
          8,
        ),
        `When in doubt, run a small test trade before committing size.`,
      ),
    },
    disclaimerSection(),
  ];

  return {
    intro,
    sections,
    faqs: [
      {
        question: intent.isHowTo ? `How do I ${topic.toLowerCase()}?` : `Can I ${topic.toLowerCase()} on ${BRAND_NAME}?`,
        answer: `Yes. Connect your wallet${chain ? ` on ${chain.name}` : ""}, enter tokens and amount, pick a route, and confirm. Fees and minimum received are shown before you sign.`,
      },
      { question: "Do I need an account or KYC?", answer: "No. Connect a wallet only when you want to execute a swap." },
      {
        question: chain ? `Which wallet works on ${chain.name}?` : "Which networks are supported?",
        answer: chain ? chain.walletNote : "Ethereum, BNB Chain, Polygon, Arbitrum, Base, Avalanche, and Solana.",
      },
      { question: "Is this financial advice?", answer: "No. This is educational content about decentralized trading mechanics." },
    ],
    description: clampDescription(
      chain
        ? `${topic} on ${chain.name}: compare DEX routes, fees, and slippage on ${BRAND_NAME}. Non-custodial execution.`
        : `${topic}: compare multi-chain DEX routes with transparent fees on ${BRAND_NAME}.`,
    ),
  };
}

function buildTradingTipContent(page: SeoPageConfig, seed: number): RichContent {
  const n = tipNumber(page.h1);
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;
  const tips = [
    TRADING_TIPS[(n + seed) % TRADING_TIPS.length]!,
    TRADING_TIPS[(n * 3 + seed) % TRADING_TIPS.length]!,
    TRADING_TIPS[(n * 7 + seed + 11) % TRADING_TIPS.length]!,
    TRADING_TIPS[(n * 13 + seed + 23) % TRADING_TIPS.length]!,
  ];

  const intro = joinParagraphs(
    `**${page.h1}** — a practical habit for traders using ${BRAND_NAME} across seven networks. Good execution is mostly discipline: verify contracts, compare routes, and sign only what you understand.`,
    tips[0]!,
    chain
      ? `On **${chain.name}**, ${chain.gasProfile}`
      : "These habits apply on Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche alike.",
  );

  const sections: SeoSection[] = [
    {
      heading: `Tip ${n}: core idea`,
      body: joinParagraphs(
        tips[1]!,
        `Apply this on your next live quote in the swap widget — change one variable at a time so you see how it affects minimum received.`,
      ),
    },
    {
      heading: "How to practice this today",
      body: joinParagraphs(
        tips[2]!,
        chain
          ? `${chain.walletNote} Verify receipts on ${chain.explorer} after each test trade.`
          : "Pick the network you use most often, connect a wallet, and run a small test swap before scaling size.",
      ),
    },
    {
      heading: "Related habits",
      body: joinParagraphs(
        tips[3]!,
        pickVariant(
          [
            "Pair this tip with the slippage and price impact guides linked below.",
            "Bookmark this page if you rotate chains often — gas and wallet details differ by network.",
            "Revoke old approvals quarterly; it is the cheapest security upgrade in DeFi.",
          ],
          seed,
          n,
        ),
      ),
    },
    {
      heading: pickVariant(["Common mistakes", "What to avoid", "Pitfalls"], seed, n + 2),
      body: joinParagraphs(
        pickVariant(
          [
            "Treating tips as rules without reading the quote card — context always matters.",
            "Skipping test trades because gas feels expensive — one mistake costs more.",
            "Chasing tips from social media without verifying on official docs.",
          ],
          seed,
          n + 4,
        ),
        `${BRAND_NAME} shows fees and minimum received before you sign — use that data to validate each habit.`,
      ),
    },
    disclaimerSection(),
  ];

  return {
    intro,
    sections,
    faqs: [
      {
        question: `What is ${page.h1}?`,
        answer: `${tips[0]!.replace(/\.$/, "")}. Part of a numbered series of practical DeFi execution habits on ${BRAND_NAME}.`,
      },
      {
        question: "Should I use this on mainnet?",
        answer: "Yes, but start with amounts you can afford to lose while learning.",
      },
      {
        question: chain ? `Does this apply on ${chain.name}?` : "Which chains does this apply to?",
        answer: chain
          ? `Yes — ${chain.name} traders face the same execution principles with ${chain.native} gas and ${chain.explorer} verification.`
          : "All seven supported networks — wallet and gas details differ, habits do not.",
      },
      { question: "Is this financial advice?", answer: "No — educational trading mechanics only." },
    ],
    description: clampDescription(
      `${page.h1}: ${tips[0]!.slice(0, 90)}… Practical DeFi habits on ${BRAND_NAME}.`,
    ),
  };
}

function buildLearnContent(page: SeoPageConfig, seed: number): RichContent {
  // Prefer hand-written long-form content when an author has supplied it.
  const authored = getLearnContent(page.slug ?? page.path.split("/").pop() ?? "");
  if (authored) return authored;

  if (isTradingTipPage(page.h1)) return buildTradingTipContent(page, seed);

  const topic = page.h1;
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;
  const category = learnCategory(topic);
  const isGuide = page.kind === "guide";

  const categoryBodies: Record<string, string> = {
    execution: `Slippage tolerance tells the smart contract how far price may move while your transaction confirms. On ${BRAND_NAME}, start near 0.5% for liquid pairs and increase only when quotes fail simulation.`,
    fees: `Users pay platform/routing fees (shown in the quote card) and network gas. Paying platform fees in USDC where supported reduces native-token dust.`,
    "cross-chain": `Cross-chain trades combine bridge messaging with destination swaps. ${BRAND_NAME} shows steps so you know when you sign on source versus receive on destination.`,
    security: `Approvals let routers spend tokens — revoke allowances you no longer need. ${BRAND_NAME} cannot recover lost seed phrases.`,
    liquidity: `AMMs price assets based on pool reserves. ${BRAND_NAME}'s Discover feed helps gauge depth before committing size.`,
    orders: `Limit orders defer execution until price crosses your target — unlike spot swaps that fill immediately.`,
    launchpad: `Launchpad tokens may start with thin liquidity — treat early trades as high risk.`,
    tokenomics: `Tax tokens and fee-on-transfer mechanics can cause unexpected fills — read contract docs on the explorer first.`,
    general: `${topic} influences how you configure trades across seven networks on ${BRAND_NAME}.`,
  };

  const intro = joinParagraphs(
    isGuide
      ? `This guide explains **${topic}** for traders using ${BRAND_NAME}. Work through each section, then validate the steps on a small live quote.`
      : chain
        ? `**${topic}** on **${chain.name}** affects how you configure swaps, gas, and wallet approvals on ${BRAND_NAME}. This article ties the concept to ${chain.native} fees, ${chain.explorer} verification, and live routing on that network.`
        : `**${topic}** shapes how you trade on decentralized markets. This explainer connects the concept to ${BRAND_NAME}'s quote card — minimum received, route labels, and fee lines you see before signing.`,
    categoryBodies[category] ?? categoryBodies.general!,
    pickVariant(
      [
        chain ? `${chain.liquidityNote}` : "Multi-chain traders should learn the concept once, then apply it per network.",
        "Use the swap widget after reading to confirm behavior with a minimal test trade.",
        "None of this is investment advice — it is execution mechanics for self-custody trading.",
      ],
      seed,
      1,
    ),
  );

  const sections: SeoSection[] = [
    {
      heading: topic,
      body: joinParagraphs(
        categoryBodies[category] ?? categoryBodies.general!,
        `${BRAND_NAME} shows route sources and fee decomposition on every quote so you can see how ${topic.toLowerCase()} affects minimum received in practice, not just in theory.`,
        pickVariant(
          [
            "Misconfiguration shows up as failed simulations — adjust one variable at a time.",
            "When learning on mainnet, use amounts you can afford to lose entirely.",
            "Pair this article with chain hub pages for network-specific gas notes.",
          ],
          seed,
          9,
        ),
      ),
    },
    {
      heading: `Why ${topic.toLowerCase()} matters`,
      body: joinParagraphs(
        `Ignoring ${topic.toLowerCase()} leads to failed transactions or fills far from the preview you accepted.`,
        `Discover and indexed pool data help contextualize market conditions before you size a trade.`,
        category === "execution"
          ? `On volatile pairs, a tight slippage setting that works for ETH/USDC may fail completely on a thin memecoin pool — context matters more than a single default number.`
          : category === "fees"
            ? `Platform fees and gas are separate line items. Paying a routing fee in USDC where supported can simplify bookkeeping if you already hold stablecoins on that chain.`
            : category === "security"
              ? `Security mistakes are irreversible. One wrong approval or pasted address can drain a wallet faster than any trading mistake.`
              : `The swap widget applies these concepts live — use it to validate what you read here with a minimal test amount.`,
      ),
    },
    {
      heading: isGuide ? "Walkthrough" : chain ? `${topic} on ${chain.name}` : "How this applies on each network",
      body: joinParagraphs(
        isGuide
          ? `Walk through connect → quote → approve → confirm with a minimal amount on the network you use most often. Repeat on a second chain if you trade cross-network regularly.`
          : chain
            ? `${chain.walletNote} ${chain.gasProfile} Average block time on ${chain.name} is ${chain.avgBlockTime}.`
            : `Ethereum mainnet has the deepest liquidity but higher gas. L2s like Arbitrum and Base reduce fees; Solana uses priority fees during congested mints.`,
        `${BRAND_NAME} supports Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche — ${topic.toLowerCase()} applies on all of them even when gas and wallet details differ.`,
      ),
    },
    {
      heading: isGuide ? "Hands-on checklist" : "Practical checklist",
      body: joinParagraphs(
        "• Confirm chain and token contract\n• Set slippage for pool depth\n• Review fees and minimum received\n• Keep native gas available\n• Store recovery phrases offline",
        isGuide
          ? "Complete the checklist on a small live trade, then scale size only after receipts match the quote preview."
          : "Use related links below for chain hubs and complementary guides.",
      ),
    },
    {
      heading: "Examples and edge cases",
      body: joinParagraphs(
        pickVariant(
          [
            `Large trades move the pool curve — ${topic.toLowerCase()} settings that work for $100 may fail for $10,000 on the same pair.`,
            `Bridge inflows can temporarily drain local liquidity on L2s, widening spreads until market makers rebalance.`,
            `Fee-on-transfer and tax tokens break some routers — always read contract notes on the explorer before swapping exotic assets.`,
          ],
          seed,
          10,
        ),
        `If something fails, change one setting at a time: slippage, size, or token — not all three at once.`,
      ),
    },
    {
      heading: "Go deeper",
      body: joinParagraphs(
        `Related guides and chain hub pages linked below cover network-specific gas, wallet setup, and adjacent topics.`,
      ),
    },
    disclaimerSection(),
  ];

  return {
    intro,
    sections,
    faqs: [
      { question: `What is ${topic}?`, answer: `A DeFi concept explained for ${BRAND_NAME} users.` },
      { question: "Need an account?", answer: "No — connect a wallet only when you want live quotes." },
      { question: "Which chains?", answer: "Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche." },
      { question: "Financial advice?", answer: "No — educational content only." },
    ],
    description: clampDescription(
      `${topic}: ${isGuide ? "step-by-step guide" : "explainer"} for ${BRAND_NAME} — slippage, fees, wallets, multi-chain swaps.`,
    ),
  };
}

function buildCrossChainSwapContent(page: SeoPageConfig): RichContent {
  const fromFacts = chainFacts(page.fromChainKey ?? page.chainKey);
  const toFacts = chainFacts(page.toChainKey);
  const fromProfile = chainProfileFor(page.fromChainKey ?? page.chainKey);
  const toProfile = chainProfileFor(page.toChainKey);
  const sym = (page.tokenSymbol ?? "TOKEN").toUpperCase();
  const token = resolveTokenProfile(sym, page.tokenName);
  const crossesVm = fromFacts.kind !== toFacts.kind;

  const intro = joinParagraphs(
    `**${page.h1}** moves ${sym} from ${fromFacts.name} to ${toFacts.name}, combining a bridge with any swaps needed on either side. ${BRAND_NAME} bundles those steps into one workflow and shows the net amount received on ${toFacts.name}, the estimated transit time, and all fees before you sign on the source chain.`,
    token ? `${sym}: ${token.summary}` : null,
    crossesVm
      ? `This route crosses between Solana and EVM, which use completely different address formats. Confirm destination wallet compatibility before initiating — a wrong-format transfer is unrecoverable.`
      : `Both chains are EVM-compatible, but confirm the chain ID in your wallet before signing and check the ${sym} representation that arrives on ${toFacts.name}.`,
  );

  const sections: SeoSection[] = [
    {
      heading: `Why move ${sym} from ${fromFacts.name} to ${toFacts.name}?`,
      body: joinParagraphs(
        `Traders bridge ${sym} when the destination chain offers deeper liquidity, lower all-in cost, or access to assets and apps unavailable on the source. The right move depends on where you can actually execute and exit, which comes down to liquidity on ${toFacts.name}.`,
        toProfile.liquidity,
      ),
    },
    {
      heading: `Leaving ${fromFacts.name}`,
      body: joinParagraphs(fromProfile.bridging, fromProfile.gas),
    },
    {
      heading: `Arriving on ${toFacts.name}`,
      body: joinParagraphs(toProfile.bridging, toProfile.wallets),
    },
    {
      heading: "Execution timeline and status tracking",
      body: joinParagraphs(
        `1. Connect your wallet on ${fromFacts.name}.\n2. Approve ${sym} if prompted (EVM only).\n3. Review the composite quote — bridge provider, minimum received on ${toFacts.name}, and estimated time.\n4. Confirm and let the relayer work, typically a few minutes up to around fifteen.\n5. Verify arrival on ${toFacts.explorer} before considering the transfer complete.`,
        `Do not submit a second transfer while the first is in transit unless the interface clearly reports failure — duplicate bridges are a common and costly mistake.`,
      ),
    },
    {
      heading: `Handling ${sym} on both chains`,
      body: joinParagraphs(
        `What arrives on ${toFacts.name} may be a bridged or wrapped representation of ${sym} with its own contract address and possibly different decimals. Confirm it matches what your downstream app or pool expects before trading it onward.`,
        token?.risk ??
          `Verify the ${sym} contract on both chains, and on any unfamiliar route start with a small test amount before moving size.`,
      ),
    },
    {
      heading: "Address formats and destination checks",
      body: joinParagraphs(
        crossesVm
          ? `${fromFacts.name} and ${toFacts.name} do not share an address format. EVM uses 0x hex; Solana uses base58. Paste the destination from the wallet that actually sits on ${toFacts.name}. A “same seed, different chain” EVM address is not a Solana destination.`
          : `Both sides are EVM, so the hex address looks the same — and that is the trap. Confirm the wallet’s active chain ID is ${toFacts.name} after arrival, and that the ${sym} contract you see on ${toFacts.explorer} is the one your next swap expects.`,
        `Keep ${fromFacts.native} to pay for the source transaction and a little ${toFacts.native} on the destination so you are not stranded with tokens you cannot move.`,
      ),
    },
    {
      heading: `First swap after ${sym} arrives on ${toFacts.name}`,
      body: joinParagraphs(
        `Arrival is not the end of the job. The token you receive may be wrapped or bridged ${sym}. Open Swap on ${toFacts.name}, paste the arriving contract, and convert into the native or deepest variant if you plan to trade further. Do not assume the ticker matches the pool you wanted.`,
        workedSwapCost(toFacts, `${sym} follow-up swap on ${toFacts.name}`),
      ),
    },
    disclaimerSection(),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `How long does ${fromFacts.name} → ${toFacts.name} take?`,
      answer: `Most configured routes finalize within a few minutes up to around fifteen, depending on the bridge provider, security checkpoints, and congestion on both networks. Track progress in the cross-chain step interface and verify arrival on ${toFacts.explorer}.`,
    },
    {
      question: "Do I need gas on both chains?",
      answer: `Yes — ${fromFacts.native} on ${fromFacts.name} to initiate the bridge, and often ${toFacts.native} on ${toFacts.name} for any follow-up swap or transfer. Keep a small balance of each so you are never stranded with assets you cannot move.`,
    },
    {
      question: `What arrives on ${toFacts.name}?`,
      answer: `Often a bridged or wrapped representation of ${sym} with its own contract and possibly different decimals. Confirm the arriving token matches what your destination app expects before trading it further.`,
    },
    {
      question: "Is cross-chain bridging risk-free?",
      answer: "No. Bridge contracts and relayers carry real risk on top of ordinary swap risk, and bridges have historically been targets of large exploits. Use established routes, verify amounts and addresses, and test unfamiliar routes with a small amount first.",
    },
  ];

  return {
    intro,
    sections,
    faqs,
    description: clampDescription(
      `Swap ${sym} from ${fromFacts.name} to ${toFacts.name} on ${BRAND_NAME}: compare cross-chain routes, bridge fees, and arrival time with non-custodial execution.`,
    ),
  };
}

function buildCrossChainSearchContent(page: SeoPageConfig, seed: number): RichContent {
  const from = chainFacts(page.fromChainKey ?? page.chainKey);
  const to = chainFacts(page.toChainKey);
  const topic = page.h1;
  const intent = searchIntent(topic);
  const symIn = page.tokenSymbol;

  const intro = joinParagraphs(
    `**${topic}** means moving value from **${from.name}** to **${to.name}** through a bridge and, when needed, a destination swap. ${BRAND_NAME} bundles those steps into one workflow with labeled stages so you know when funds leave the source chain and when they are usable on the destination.`,
    `${from.gasProfile} Plan for ${to.native} on arrival if you will swap or transfer again locally.`,
    intent.isHowTo
      ? `The steps below walk through wallet setup, quoting, approval, and confirmation for this route.`
      : `Compare routes by minimum received on ${to.name}, not just the rate shown on the source side.`,
  );

  const sections: SeoSection[] = [
    {
      heading: "How this route works",
      body: joinParagraphs(
        `Cross-chain trades combine bridge messaging with optional swaps on either end. Total cost includes bridge fees, destination slippage, and gas on both networks.`,
        symIn
          ? `When ${symIn} is involved, confirm the token representation on ${from.name} and ${to.name} — bridged assets may use different wrapper contracts or decimals.`
          : `Select explicit source and destination tokens in the widget even if you only know the chains — routing requires both endpoints.`,
        from.kind !== to.kind
          ? `This path crosses Solana and EVM boundaries. Wallet address formats differ — double-check destination addresses before confirming.`
          : `Both sides are EVM-compatible — still verify chain ID in your wallet (${from.name} vs ${to.name}) before signing.`,
      ),
    },
    {
      heading: intent.isHowTo ? "Step-by-step" : "Checklist before you bridge",
      body: joinParagraphs(
        intent.isHowTo
          ? `1. Open cross-chain mode and select ${from.name} → ${to.name}\n2. Connect your wallet on the source chain\n3. Enter amount and review the composite quote\n4. Note bridge provider, minimum received, and estimated time\n5. Approve ${symIn ?? "the token"} if prompted\n6. Confirm and monitor until your destination balance updates`
          : `• Compare minimum received on ${to.name}\n• Budget ${from.native} and ${to.native} for gas\n• Test with a small amount first\n• Verify contracts on ${from.explorer} and ${to.explorer}`,
        `If quotes fail, try a smaller size, slightly higher slippage, or retry when bridge relayers are less congested.`,
      ),
    },
    {
      heading: `Why ${from.name} → ${to.name} quotes differ`,
      body: joinParagraphs(
        `${from.liquidityNote} ${to.liquidityNote}`,
        pickVariant(
          [
            "Some paths swap on source before bridging; others bridge first — total cost differs even when headline bridge fees match.",
            "Relayer load changes transit time by minutes during peak periods — re-quote if you wait long before signing.",
            "Thin pools on arrival can erase bridge savings — check destination liquidity in Discover.",
          ],
          seed,
          17,
        ),
      ),
    },
    {
      heading: `Execute on ${BRAND_NAME}`,
      body: joinParagraphs(
        `Use the cross-chain swap widget below for live quotes. ${BRAND_NAME} does not custody funds during transit — you sign on the source chain and receive on the destination when the bridge completes.`,
        `For same-chain activity on either network, see the chain hub pages linked at the bottom of this article.`,
      ),
    },
    disclaimerSection(),
  ];

  return {
    intro,
    sections,
    faqs: [
      {
        question: `Can I ${topic.toLowerCase()} with ${BRAND_NAME}?`,
        answer: `When bridge providers and liquidity are available for ${from.name} → ${to.name}, yes. Live quotes show current availability.`,
      },
      { question: "Do I need an account?", answer: "No — connect a wallet only when you are ready to execute." },
      { question: "How long does bridging take?", answer: "Most routes finalize within 1–15 minutes depending on provider load and network conditions." },
      { question: "Is this financial advice?", answer: "No — educational content about cross-chain trading mechanics." },
    ],
    description: clampDescription(
      `${topic}: ${from.name} to ${to.name} cross-chain swap on ${BRAND_NAME}. Compare bridge fees, timing, and net receive.`,
    ),
  };
}

/** Opening sentence matches the hub H1 so the query sits in the title and the first line. */
function hubLead(page: SeoPageConfig, facts: ReturnType<typeof chainFacts>): string {
  const name = facts.name;
  switch (page.kind) {
    case "chain":
      return `Trade on ${name} with ${BRAND_NAME} by comparing live DEX routes, gas, and the minimum you receive before your wallet signs.`;
    case "swap-hub":
      return `Swap tokens on ${name} by comparing live DEX routes, fees, and the minimum you receive before your wallet signs on ${BRAND_NAME}.`;
    case "meme-hub":
      return `Meme coins on ${name} trade through thin, fast pools, so compare the route and the minimum you receive before you sign on ${BRAND_NAME}.`;
    case "launch":
      return `Launch tokens on ${name} with the ${BRAND_NAME} launchpad, set supply, and share the contract address traders should swap before they buy it.`;
    case "discover":
      return `Discover ${name} tokens from live pools, new launches, and price charts on ${BRAND_NAME} before you pick a contract and swap.`;
    case "trade":
      return `Trade crypto on ${name} with aggregated liquidity, live route comparison, transparent fees, and wallet-signed swaps on ${BRAND_NAME} after you compare the quote.`;
    default:
      return `${page.h1}. Compare the live quote on ${BRAND_NAME}, then sign from your own wallet.`;
  }
}

function buildHubContent(page: SeoPageConfig): RichContent {
  const facts = chainFacts(page.chainKey);
  const profile = chainProfileFor(page.chainKey);
  const hubLabel = page.kind.replace(/-/g, " ");
  const isChainHub = page.kind === "chain";
  const hubAngle = isChainHub
    ? profile.summary
    : profile.hub[page.kind as keyof ChainProfile["hub"]] ?? profile.summary;

  const intro = joinParagraphs(hubLead(page, facts), isChainHub ? profile.summary : hubAngle);

  const sections: SeoSection[] = [
    {
      heading: `${facts.name} liquidity landscape`,
      body: profile.liquidity,
    },
    {
      heading: `Fees and gas on ${facts.name}`,
      body: profile.gas,
    },
    {
      heading: `Wallets and security on ${facts.name}`,
      body: joinParagraphs(profile.wallets, profile.security),
    },
    {
      heading: `Bridging to and from ${facts.name}`,
      body: profile.bridging,
    },
    {
      heading: "How execution works here",
      body: joinParagraphs(
        facts.kind === "solana"
          ? `Connect a Solana wallet, choose your tokens, and compare the routes ${BRAND_NAME} assembles across Jupiter and the major AMMs. There is no approval step — the wallet simulates the transaction and shows the balance changes before you sign, and you keep custody throughout.`
          : `Connect an EVM wallet on ${facts.name}, choose your tokens, and compare the routes ${BRAND_NAME} assembles across indexed pools and aggregators. Approve token spending once if prompted, confirm the swap, and verify the receipt on ${facts.explorer}. Funds never leave your wallet until you sign.`,
        `Quotes reflect live pool state and expire as others trade — re-quote if you pause before signing, and keep a small ${facts.native} balance for gas so a trade is never blocked.`,
      ),
    },
    {
      heading:
        page.kind === "launch"
          ? `Generating a token on ${facts.name}`
          : page.kind === "meme-hub"
            ? `Trading new tokens on ${facts.name}`
            : `How to swap tokens on ${facts.name}`,
      body: joinParagraphs(
        page.kind === "launch"
          ? facts.kind === "solana"
            ? `XAUConnect’s in-app Launchpad deploys EVM ERC-20s (fixed-supply TokenFactory or bonding-curve Launchpad). Solana token creation uses the SPL / Token-2022 programs outside that wizard. Once an SPL mint has liquidity, paste the mint into Swap — Jupiter routing covers Raydium, Orca, and related AMMs. Do not send a Solana mint to an EVM launch form.`
            : `On ${facts.name} you can generate a crypto token from Launchpad: standard fixed-supply ERC-20 (LaunchedToken: no owner mint, no tax, no blacklist — supply minted to you at deploy) or a bonding-curve fair launch. The wizard collects name, symbol (1–12 A–Z/0–9), supply, optional logo, LP and lock settings, then your wallet pays a small native launch fee and signs createToken or createLaunch. After deploy, add locked liquidity and share the contract — traders should paste that address, not hunt the ticker.`
          : page.kind === "meme-hub"
            ? `New tickers on ${facts.name} are easy to copy. Paste the contract from a primary source, check two-way sells, and size as if the token can go to zero. Creating your own memecoin is a Launchpad action; buying someone else’s is a Swap action. Do not mix those flows.`
            : `Open Swap, set the network to ${facts.name}, pick tokens (paste addresses when tickers collide), compare minimum received, ${facts.kind === "solana" ? "review simulation, then sign" : "approve once if needed, then confirm"}. Multi-chain names (USDC, ETH, the same memecoin ticker) are local contracts on this chain.`,
        workedSwapCost(facts, `swap on ${facts.name}`),
      ),
    },
    disclaimerSection(),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `Does ${BRAND_NAME} support ${facts.name}?`,
      answer: `Yes — ${BRAND_NAME} provides live quoting and wallet-signed, non-custodial execution on ${facts.name}, comparing routes across indexed pools and aggregators.`,
    },
    {
      question: `Which wallet should I use on ${facts.name}?`,
      answer: profile.wallets,
    },
    {
      question: `What does it cost to trade on ${facts.name}?`,
      answer: `${BRAND_NAME}'s platform fee is shown in the quote, and network gas is paid separately in ${facts.native}. ${profile.gas}`,
    },
    {
      question: `How is liquidity on ${facts.name}?`,
      answer: profile.liquidity,
    },
    {
      question: `Can I generate a token on ${facts.name}?`,
      answer:
        facts.kind === "solana"
          ? `Create SPL / Token-2022 mints with Solana tooling, then swap them on XAUConnect once a pool exists. The in-app Launchpad wizard deploys EVM ERC-20s.`
          : `Yes — Launchpad can deploy a fixed-supply ERC-20 or a bonding-curve launch on ${facts.name} when factory contracts are live. After deploy, add locked liquidity and share the contract address for swaps.`,
    },
  ];

  return {
    intro,
    sections,
    faqs,
    description: clampDescription(
      `${facts.name} ${hubLabel} on ${BRAND_NAME}: liquidity, fees, wallets, and how to swap with non-custodial, wallet-signed execution.`,
    ),
  };
}

function buildPairContent(page: SeoPageConfig): RichContent {
  const facts = chainFacts(page.chainKey);
  const profile = chainProfileFor(page.chainKey);
  const match = page.h1.match(/^(\w+)\s+to\s+(\w+)/i);
  const base = (match?.[1] ?? page.tokenSymbol ?? "BASE").toUpperCase();
  const quote = (match?.[2] ?? "USDC").toUpperCase();
  const baseTok = getTokenProfile(base);
  const quoteTok = getTokenProfile(quote);
  const isStableQuote = quoteTok?.category === "stablecoin" || /USDC|USDT|DAI|USD/i.test(quote);

  const intro = joinParagraphs(
    `${base} to ${quote} on ${facts.name} trades through decentralized pools, and ${BRAND_NAME} compares the live minimum you receive before your wallet signs.`,
    `${BRAND_NAME} compares executable paths for this pair across indexed pools and aggregators, including multi-hop routes through ${facts.native} or a major stablecoin when no deep direct pool exists.`,
    isStableQuote
      ? `Because ${quote} is a stablecoin leg, spreads on a liquid ${base} market should be tight — an unusually wide quote points to thin depth or the wrong token variant rather than the true price.`
      : `With ${quote} as a volatile quote leg, both sides of the pair move, which raises slippage sensitivity — size clips conservatively during fast markets.`,
  );

  const sections: SeoSection[] = [
    {
      heading: `About ${base}`,
      body: baseTok
        ? joinParagraphs(baseTok.summary, baseTok.trading)
        : `${base} is the asset you are trading in this pair. Verify its contract on ${facts.explorer} against an official source before trading, and check that its pools have enough depth to support your size.`,
    },
    {
      heading: `About ${quote}`,
      body: quoteTok
        ? joinParagraphs(quoteTok.summary, quoteTok.trading)
        : `${quote} is the quote asset for this pair. Confirm its contract on ${facts.explorer} — for stablecoins in particular, native and bridged variants differ in liquidity, so target the deepest variant on ${facts.name}.`,
    },
    {
      heading: `${base}/${quote} routing on ${facts.name}`,
      body: joinParagraphs(
        profile.liquidity,
        `When no deep direct ${base}/${quote} pool exists, ${BRAND_NAME} composes a path such as ${base} → ${facts.native} → ${quote} or ${base} → USDC → ${quote}. Each hop adds a pool fee and some price impact, so judge the route by the minimum received after all hops rather than the rate on any single leg.`,
      ),
    },
    {
      heading: `Executing ${base} → ${quote}`,
      body: joinParagraphs(
        facts.kind === "solana"
          ? `Open the swap widget with ${base} as input and ${quote} as output (reverse for the opposite direction). On Solana there is no approval step — the wallet simulates the trade and shows the balance changes before you sign. Keep some ${facts.native} for priority fees.`
          : `Open the swap widget with ${base} as input and ${quote} as output (reverse for the opposite direction). If ${base} is an ERC-20 token, approve the router once — prefer an exact allowance — then confirm the swap. Keep ${facts.native} for gas separate from your trade size.`,
        profile.gas,
      ),
    },
    {
      heading: `${base}/${quote} on other networks`,
      body: joinParagraphs(
        `The same ticker pair can exist on several chains with completely different depth. ${base}/${quote} on ${facts.name} is this chain’s pools only. If you hold ${base} on another network, switch the chain selector or use a bridge — a quote here cannot spend a balance that lives elsewhere.`,
        isStableQuote
          ? `When the quote leg is a dollar token, confirm you are routing into native ${quote} on ${facts.name} rather than a thinly bridged copy. Multi-chain stablecoins are the most common “I swapped the wrong USDC” mistake.`
          : `If ${base} is a chain-native asset, copies of the ticker on other networks are usually unrelated. Verify both contracts on ${facts.explorer} before you treat this as a “multi-chain pair.”`,
      ),
    },
    {
      heading: `Sizing and cost for ${base} → ${quote}`,
      body: joinParagraphs(
        workedSwapCost(facts, `${base} to ${quote} swap`),
        `Start with a clip that is a small fraction of visible pool depth. If the quote’s price impact jumps, split the order or pick a better-routed hop through ${facts.native} or a major stablecoin. Generating a new token is unrelated to this pair — Launchpad deploys a new contract; this page trades existing ${base} and ${quote} liquidity.`,
      ),
    },
    {
      heading: "Before you confirm",
      body: joinParagraphs(
        `Verify both the ${base} and ${quote} contracts on ${facts.explorer}, set slippage proportional to the pool depth you see, and compare the minimum received across routes when more than one is available. On unfamiliar tokens, start with a small test clip.`,
        profile.security,
      ),
    },
    disclaimerSection(),
  ];

  const faqs: SeoFaq[] = [
    {
      question: `How do I swap ${base} for ${quote} on ${facts.name}?`,
      answer: `Open the swap widget with ${base} as input and ${quote} as output, let the quote refresh, compare the routes, ${facts.kind === "solana" ? "review the simulated balance changes" : "approve spending if prompted"}, and confirm. The minimum received and fees are shown before you sign.`,
    },
    {
      question: `Why do ${base}/${quote} routes differ?`,
      answer: `Different venues hold different reserves and fee tiers, and some routes use intermediate hops. ${BRAND_NAME} ranks paths by net output at quote time, so the best route can change from moment to moment as pools rebalance.`,
    },
    {
      question: `What slippage should I use for ${base}/${quote}?`,
      answer: isStableQuote
        ? `For a liquid pair against a stablecoin like ${quote}, a tight setting near 0.5% usually works. Raise it gradually only if a deep-pool trade keeps failing, and shrink size instead if the issue is price impact.`
        : `Because ${quote} is volatile, both sides move during confirmation. Start conservative and raise slippage only as much as needed; on thin pools, reduce trade size rather than widening tolerance.`,
    },
    {
      question: `What does it cost to trade ${base}/${quote}?`,
      answer: `A pool fee on each hop, ${BRAND_NAME}'s platform fee shown in the quote, and network gas in ${facts.native}. On thin pools price impact from your size is often the largest cost — compare the minimum received.`,
    },
    {
      question: `Can I trade ${base}/${quote} as a multi-chain pair?`,
      answer: `You can trade equivalent tickers on other supported networks, but each chain has its own contracts and pools. This page is ${facts.name} only. To move ${base} onto another chain and then swap it, use the cross-chain flow, then trade the destination representation.`,
    },
  ];

  return {
    intro,
    sections,
    faqs,
    description: clampDescription(
      `Swap ${base} to ${quote} on ${facts.name}: compare live ${base}/${quote} routes, slippage, and fees on ${BRAND_NAME}. Non-custodial, wallet-signed execution.`,
    ),
  };
}

export function generateRichContent(page: SeoPageConfig): RichContent {
  const seed = hashSeed(page.id);
  const tokenKinds = new Set(["swap-token", "buy", "sell", "meme-token", "token-deep"]);

  // Kinds whose content is fully hand-authored or composed from hand-authored
  // chain/token blocks. These must never be padded with templated expansion
  // filler — the authored prose is the content.
  const authoredKinds = new Set([
    "swap-token",
    "buy",
    "sell",
    "meme-token",
    "token-deep",
    "pair",
    "learn",
    "guide",
    "cross-chain-swap",
    "chain",
    "swap-hub",
    "meme-hub",
    "launch",
    "discover",
    "trade",
  ]);

  let content: RichContent;
  if (tokenKinds.has(page.kind)) content = buildTokenContent(page);
  else if (page.kind === "pair") content = buildPairContent(page);
  else if (page.kind === "learn" || page.kind === "guide") content = buildLearnContent(page, seed);
  else if (page.kind === "search") content = buildSearchContent(page, seed);
  else if (page.kind === "cross-chain-swap") content = buildCrossChainSwapContent(page);
  else if (page.kind === "cross-chain-search") content = buildCrossChainSearchContent(page, seed);
  else content = buildHubContent(page);

  if (!authoredKinds.has(page.kind)) {
    content = expandContentToMinimum(content, page, MIN_BODY_WORDS);
  }

  return content;
}

export function applyRichContent(page: SeoPageConfig): void {
  const rich = generateRichContent(page);
  page.intro = rich.intro;
  page.sections = rich.sections;
  page.faqs = rich.faqs;
  applyIndexingMetadata(page, rich);
}
