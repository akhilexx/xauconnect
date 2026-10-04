/**
 * Expands page bodies to MIN_BODY_WORDS with reader-facing prose only.
 * No SEO meta-commentary, no slug fragments, no developer API filler on retail pages.
 */
import { BRAND_NAME } from "@xauconnect/utils";
import type { SeoFaq, SeoPageConfig, SeoSection } from "./types.js";
import { chainFacts, hashSeed, joinParagraphs, pickVariant, wordCount } from "./content-blocks.js";

export interface RichContent {
  intro: string;
  sections: SeoSection[];
  faqs: SeoFaq[];
  description: string;
}

export const MIN_BODY_WORDS = 400;

function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max - 1)}…`;
}

export function uniqueDescription(page: SeoPageConfig, base: string): string {
  const seed = hashSeed(`${page.id}:desc`);
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;
  const suffixes = [
    chain ? `Live ${chain.name} quotes.` : "Multi-chain DEX aggregation.",
    "Non-custodial wallet execution.",
    page.tokenSymbol ? `${page.tokenSymbol} routes with transparent fees.` : "Compare routes before you sign.",
    "Slippage control and fee breakdown included.",
  ];
  const suffix = pickVariant(suffixes, seed, 0);
  const merged = base.includes(BRAND_NAME) ? `${base} ${suffix}` : `${base} — ${suffix}`;
  return clampDescription(merged);
}

function bodyText(content: RichContent): string {
  return [content.intro, ...content.sections.map((s) => s.body)].join(" ");
}

function expandFaqAnswers(faqs: SeoFaq[], seed: number, chainKey?: string): SeoFaq[] {
  const chain = chainKey ? chainFacts(chainKey) : null;
  return faqs.map((faq, i) => {
    if (wordCount(faq.answer) >= 40) return faq;
    const extra = pickVariant(
      [
        chain
          ? ` After confirmation, verify the transaction on ${chain.explorer}.`
          : " Compare at least two routes when the trade size is meaningful.",
        ` ${BRAND_NAME} never holds your funds — each step requires a wallet signature.`,
        " Re-quote if more than a minute passes before you sign; pool prices move continuously.",
        " Start with a small test amount when trying a new token or route for the first time.",
      ],
      seed,
      i + 3,
    );
    return { ...faq, answer: faq.answer + extra };
  });
}

type SectionTemplate = { heading: string; body: string };

function searchExpansionPool(page: SeoPageConfig): SectionTemplate[] {
  const topic = page.h1;
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;
  const p = topic.toLowerCase();

  return [
    {
      heading: "Understanding DEX aggregators",
      body: joinParagraphs(
        `A decentralized exchange aggregator pulls quotes from multiple liquidity venues and ranks them by what you actually receive after fees and price impact. That matters because a headline exchange rate can look attractive while delivering less output once the pool is thin or the route includes hidden hops.`,
        `${BRAND_NAME} shows the route label, minimum received, platform fee, and estimated gas before you approve anything in your wallet. You stay in custody of your keys throughout.`,
      ),
    },
    {
      heading: "Fees, slippage, and price impact",
      body: joinParagraphs(
        `Three separate costs affect every swap: the platform or routing fee (shown in the quote card), network gas paid to validators, and price impact from moving the pool curve with your trade size.`,
        `Slippage tolerance tells the contract how far the price may move while your transaction confirms. Start conservatively on unfamiliar pairs — widening slippage invites worse fills on public mempools.`,
        chain
          ? `On ${chain.name}, ${chain.gasProfile}`
          : "Gas varies widely by network — Ethereum mainnet costs more than most L2s, while Solana uses priority fees during congested periods.",
      ),
    },
    {
      heading: chain ? `Trading on ${chain.name}` : "Multi-chain trading",
      body: joinParagraphs(
        chain
          ? `${chain.liquidityNote} ${chain.walletNote}`
          : `${BRAND_NAME} supports Ethereum, Solana, BNB Chain, Polygon, Arbitrum, Base, and Avalanche from one interface. Pick the network that matches where your tokens already live before requesting quotes.`,
        chain
          ? `Block times on ${chain.name} average ${chain.avgBlockTime}. If a transaction stalls, check ${chain.explorer} before sending a duplicate — resubmitting can waste gas.`
          : "Switching networks in the app does not move tokens automatically; you bridge separately when assets live on a different chain.",
      ),
    },
    {
      heading: "Security habits every trader should follow",
      body: joinParagraphs(
        `Verify token contract addresses on the official block explorer — never copy addresses from social media without checking every character. Phishing sites often change one hex digit.`,
        `Revoke token approvals you no longer need, especially unlimited ERC-20 allowances. Never share seed phrases or sign transactions you do not understand.`,
        `Bookmark the official ${BRAND_NAME} domain and confirm the URL bar before connecting a wallet.`,
      ),
    },
    {
      heading: "How to get the best fill",
      body: joinParagraphs(
        `Compare minimum received across routes, not just the displayed exchange rate. On large trades, split into two transactions if price impact exceeds your comfort level.`,
        `Stablecoin pairs (USDC, USDT, DAI) usually offer the tightest spreads. Volatile altcoins may route through ETH or USDC hops — the quote card lists each hop explicitly.`,
        p.includes("best") || p.includes("compare")
          ? `When evaluating venues for "${topic.toLowerCase()}", weight net output, confirmation speed, and whether you keep self-custody — not marketing slogans about zero fees.`
          : `If a quote fails simulation, reduce trade size first, then adjust slippage incrementally rather than setting it to maximum immediately.`,
      ),
    },
    {
      heading: "Stablecoins and volatile assets",
      body: joinParagraphs(
        `Swapping into or out of stablecoins simplifies accounting because the quote leg stays near one dollar. Investigate unusual spreads — they often mean low pool depth or the wrong token variant (e.g., bridged vs native USDC).`,
        `Memecoins and newly launched tokens can move 10–20% while your transaction confirms. Treat the first trade as a small test size and confirm liquidity in Discover before committing serious capital.`,
      ),
    },
    {
      heading: "After you confirm a swap",
      body: joinParagraphs(
        `Open your wallet's transaction history or the relevant block explorer to confirm the output amount matches the quote's minimum received. Discrepancies usually mean slippage exceeded tolerance or the pool moved during confirmation.`,
        `${BRAND_NAME} does not produce tax reports — export history from your wallet or explorer for accounting if needed.`,
      ),
    },
    {
      heading: "When quotes fail or look wrong",
      body: joinParagraphs(
        `Failed simulations typically mean insufficient liquidity, slippage set too tight, or a wallet/network mismatch. Confirm your wallet is on the correct chain before retrying.`,
        `During network congestion, pending transactions can block later attempts on EVM chains until confirmed or replaced. On Solana, raising priority fees modestly often clears stuck routes.`,
      ),
    },
  ];
}

function tokenExpansionPool(page: SeoPageConfig): SectionTemplate[] {
  const chain = chainFacts(page.chainKey);
  const sym = page.tokenSymbol ?? "this token";
  const name = page.tokenName ?? sym;

  return [
    {
      heading: `Liquidity and spreads for ${sym}`,
      body: joinParagraphs(
        `${name} trades against automated market maker pools on ${chain.name}. Depth determines how much you can swap before price impact erodes the quote you accepted.`,
        `${chain.liquidityNote} Use Discover to check indexed volume and pool activity before sizing a large ${sym} position.`,
      ),
    },
    {
      heading: "Approvals and wallet permissions",
      body: joinParagraphs(
        `ERC-20 and SPL tokens require a one-time approval so the router can move tokens on your behalf. Prefer exact allowances when your wallet supports them instead of unlimited approvals.`,
        `${chain.walletNote} Keep ${chain.native} separate from the ${sym} amount you intend to trade — gas is paid in the native asset.`,
      ),
    },
    {
      heading: "Verifying the correct contract",
      body: joinParagraphs(
        `Ticker symbols collide across chains and scam projects. Always match the full contract or mint address on ${chain.explorer} against official project announcements before approving spending.`,
        `Copy-paste errors and look-alike addresses are the most common cause of lost funds in token trading.`,
      ),
    },
    {
      heading: `Gas and timing on ${chain.name}`,
      body: joinParagraphs(
        chain.gasProfile,
        `Average block time on ${chain.name} is ${chain.avgBlockTime}. Re-quote if you wait more than a minute between preview and signature — pool state changes every block.`,
      ),
    },
    {
      heading: "Tax and record-keeping",
      body: joinParagraphs(
        `Swapping ${sym} for another asset is often a taxable event depending on jurisdiction. ${BRAND_NAME} does not provide tax advice or export formatted gain/loss reports.`,
        `Save transaction hashes from ${chain.explorer} for your records.`,
      ),
    },
    {
      heading: "Reducing execution risk",
      body: joinParagraphs(
        `Split large ${sym} orders when price impact exceeds 1–2%. Compare at least two routes inside ${BRAND_NAME} during volatile periods.`,
        `If ${sym} is newly listed, treat early trades as high risk — liquidity can disappear quickly after initial hype cycles.`,
      ),
    },
  ];
}

function crossChainExpansionPool(page: SeoPageConfig): SectionTemplate[] {
  const from = chainFacts(page.fromChainKey ?? page.chainKey);
  const to = chainFacts(page.toChainKey);

  return [
    {
      heading: "Why bridge timing matters",
      body: joinParagraphs(
        `Cross-chain transfers are not instant. Relayers batch proofs, validators confirm messages, and destination chains may queue deposits during peak load. Budget 1–15 minutes for most configured routes, longer during outages.`,
        `Do not submit a second bridge transaction while the first is in transit unless the UI reports failure.`,
      ),
    },
    {
      heading: `Gas on ${from.name} and ${to.name}`,
      body: joinParagraphs(
        `${from.gasProfile}`,
        `${to.gasProfile}`,
        `You need ${from.native} on the source chain to initiate and often ${to.native} on arrival for follow-up swaps or transfers.`,
      ),
    },
    {
      heading: "Wrapped and bridged tokens",
      body: joinParagraphs(
        `Assets arriving on ${to.name} may be wrapped representations of the source token. Confirm decimals, symbol, and contract address match what your downstream app expects.`,
        from.kind !== to.kind
          ? "Solana and EVM use different address formats — never send to the wrong address type."
          : "Even on two EVM chains, verify chain ID in your wallet before signing.",
      ),
    },
    {
      heading: "Comparing bridge routes",
      body: joinParagraphs(
        `Evaluate minimum received on the destination chain, not just the source-side rate. Some paths swap before bridging; others swap on arrival — total cost differs.`,
        `${from.liquidityNote} ${to.liquidityNote}`,
      ),
    },
    {
      heading: "Bridge risk in plain terms",
      body: joinParagraphs(
        `Bridge smart contracts and relayers introduce counterparty and contract risk separate from DEX pool risk. Start with a test amount on any route you have not used before.`,
        `Verify receipts on ${from.explorer} and ${to.explorer} independently of the UI status indicator.`,
      ),
    },
  ];
}

function learnExpansionPool(page: SeoPageConfig): SectionTemplate[] {
  const topic = page.h1;
  return [
    {
      heading: "Putting this into practice",
      body: joinParagraphs(
        `Apply what you learned about ${topic.toLowerCase()} on a small live quote in the swap widget. Change one variable at a time — slippage, size, or token — so you can see how each affects minimum received.`,
        `Misconfiguration usually shows up as a failed simulation before any funds move.`,
      ),
    },
    {
      heading: "Common beginner mistakes",
      body: joinParagraphs(
        `Setting maximum slippage on the first attempt, ignoring price impact on large sizes, and approving unlimited token spending are the three most costly habits new traders pick up.`,
        `Keep recovery phrases offline and never enter them on any website, including support impersonators.`,
      ),
    },
    {
      heading: "Network differences",
      body: joinParagraphs(
        `EVM chains share wallet tooling but differ in gas cost and block time. Solana uses different address formats and priority fees during hot mints.`,
        `The concept of ${topic.toLowerCase()} applies everywhere — only the wallet setup and fee mechanics change.`,
      ),
    },
    {
      heading: "When things go wrong",
      body: joinParagraphs(
        `Failed transactions still consume gas on most EVM networks. If a swap fails repeatedly, reduce size, increase slippage modestly, or pick a deeper pair through a stablecoin leg.`,
        `Check the block explorer receipt even when the UI shows an error — sometimes partial steps confirm on-chain.`,
      ),
    },
    {
      heading: "Related concepts to study next",
      body: joinParagraphs(
        `Slippage, price impact, and gas interact on every trade. Pair this article with chain-specific hub pages for network fees and wallet setup details.`,
      ),
    },
    {
      heading: "When to re-read this guide",
      body: joinParagraphs(
        `Revisit ${topic.toLowerCase()} when you switch networks, trade illiquid tokens, or start using cross-chain routes — each scenario stresses different parts of the execution stack.`,
      ),
    },
  ];
}

function pairExpansionPool(page: SeoPageConfig): SectionTemplate[] {
  const chain = chainFacts(page.chainKey);
  const match = page.h1.match(/^(\w+)\s+to\s+(\w+)/i);
  const base = match?.[1] ?? "BASE";
  const quote = match?.[2] ?? "QUOTE";

  return [
    {
      heading: "Reading the quote card",
      body: joinParagraphs(
        `For ${base}/${quote}, the quote card shows each hop in multi-step routes, estimated gas, platform fee, and minimum received. A good rate on the first hop can be erased by a thin second pool.`,
        `Compare two routes when notional exceeds a few thousand dollars — aggregation exists precisely because venues differ.`,
      ),
    },
    {
      heading: "Slippage for this pair",
      body: joinParagraphs(
        `Deep pairs like ${base}/USDC often work with 0.5% slippage. Thin altcoin legs need higher tolerance or smaller clip sizes — raise slippage gradually, never jump to 49%.`,
        chain.gasProfile,
      ),
    },
    {
      heading: "Liquidity cycles",
      body: joinParagraphs(
        `${chain.liquidityNote} Spreads widen on weekends and thin out around major bridge inflows — re-quote immediately before signing large ${base}/${quote} trades.`,
      ),
    },
  ];
}

function hubExpansionPool(page: SeoPageConfig): SectionTemplate[] {
  const chain = chainFacts(page.chainKey);
  return [
    {
      heading: `Wallet setup for ${chain.name}`,
      body: joinParagraphs(
        chain.walletNote,
        chain.kind === "solana"
          ? "Solana wallets use different address formats than EVM — confirm you imported or created the correct wallet type."
          : "Add the network to your EVM wallet and verify chain ID in the header before approving transactions.",
      ),
    },
    {
      heading: "Gas and network fees",
      body: joinParagraphs(chain.gasProfile, `Explorer reference: ${chain.explorer} for contract verification and receipt tracking.`),
    },
    {
      heading: "Finding tokens and pairs",
      body: joinParagraphs(
        `Discover surfaces indexed pools and recent activity on ${chain.name}. Token pages linked below preload swap presets for individual assets.`,
        chain.liquidityNote,
      ),
    },
  ];
}

function genericExpansionPool(page: SeoPageConfig): SectionTemplate[] {
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;
  return [
    {
      heading: "Non-custodial execution",
      body: joinParagraphs(
        `${BRAND_NAME} routes trades but never holds balances. You approve and sign each transaction in your own wallet.`,
        chain ? `${chain.walletNote}` : "Connect a wallet only when you are ready to execute — quotes work without login.",
      ),
    },
    {
      heading: "Before you trade",
      body: joinParagraphs(
        "Confirm network, token contract, slippage, and minimum received. Run a small test trade on unfamiliar assets.",
        chain ? `Verify receipts on ${chain.explorer}.` : "Keep native gas available for approvals and swaps in the same session.",
      ),
    },
  ];
}

function poolForPage(page: SeoPageConfig): SectionTemplate[] {
  if (page.kind === "search" || page.kind === "cross-chain-search") return searchExpansionPool(page);
  if (
    page.kind === "swap-token" ||
    page.kind === "buy" ||
    page.kind === "sell" ||
    page.kind === "meme-token" ||
    page.kind === "token-deep"
  )
    return tokenExpansionPool(page);
  if (page.kind === "cross-chain-swap") return crossChainExpansionPool(page);
  if (page.kind === "learn" || page.kind === "guide") return learnExpansionPool(page);
  if (page.kind === "pair") return pairExpansionPool(page);
  return hubExpansionPool(page).concat(genericExpansionPool(page));
}

function pickUniqueSections(page: SeoPageConfig, existing: SeoSection[], needed: number): SeoSection[] {
  const pool = poolForPage(page);
  const usedHeadings = new Set(existing.map((s) => s.heading.toLowerCase()));
  const seed = hashSeed(page.id);
  const out: SeoSection[] = [];
  let offset = 0;

  while (out.length < needed && offset < pool.length * 2) {
    const idx = (seed + offset * 11) % pool.length;
    const tpl = pool[idx]!;
    offset++;
    if (usedHeadings.has(tpl.heading.toLowerCase())) continue;
    usedHeadings.add(tpl.heading.toLowerCase());
    out.push({ heading: tpl.heading, body: tpl.body });
  }

  return out;
}

export function expandContentToMinimum(
  content: RichContent,
  page: SeoPageConfig,
  minWords = MIN_BODY_WORDS,
): RichContent {
  let words = wordCount(bodyText(content));
  const disclaimerIdx = content.sections.findIndex((s) => s.heading.toLowerCase().includes("risk"));
  const insertAt = disclaimerIdx >= 0 ? disclaimerIdx : content.sections.length;

  if (words < minWords) {
    const extra = pickUniqueSections(page, content.sections, 8);
    let guard = 0;
    for (const section of extra) {
      if (words >= minWords) break;
      content.sections.splice(insertAt + guard, 0, section);
      words = wordCount(bodyText(content));
      guard++;
    }
  }

  if (words < minWords) {
    content.intro = joinParagraphs(
      content.intro,
      pickVariant(
        [
          `${BRAND_NAME} refreshes quotes as pool state changes — numbers in the widget are live; re-quote before signing if you paused.`,
          `Use the swap widget on this page for current routes, fees, and minimum received after you finish reading.`,
        ],
        hashSeed(page.id),
        99,
      ),
    );
    words = wordCount(bodyText(content));
  }

  if (words < minWords) {
    const topic = page.h1;
    content.sections.splice(insertAt, 0, {
      heading: pickVariant(["Summary", "Quick reference", "Key takeaways"], hashSeed(page.id), 50),
      body: joinParagraphs(
        `${topic} comes down to preparation: correct network, verified token contract, sensible slippage, and comparing minimum received across routes before you sign.`,
        `${BRAND_NAME} is non-custodial — connect a wallet only when you are ready to execute, and verify every receipt on the block explorer.`,
      ),
    });
  }

  content.faqs = expandFaqAnswers(content.faqs, hashSeed(page.id), page.chainKey ?? page.fromChainKey);

  return content;
}
