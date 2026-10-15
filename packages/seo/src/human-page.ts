/**
 * Human-page pass (Edward Sturm page playbook, adapted to XAUConnect).
 *
 * One job per kind. The answer is the first paragraph. A worked number and a
 * limit follow. Generated pages do not share one heading stack, and nothing
 * is padded to a word count.
 *
 * Learn and guide bodies stay hand-written. This pass only cleans their prose.
 */
import { BRAND_NAME } from "@xauconnect/utils";
import { authoredFor } from "./authored-rank-pages.js";
import { chainFacts, marketSummarySentence } from "./content-blocks.js";
import type { SeoFaq, SeoPageConfig, SeoSection } from "./types.js";

function clean(text: string): string {
  return text
    .replace(/[—–]/g, ", ")
    .replace(/\bit's important to note that\b/gi, "")
    .replace(/\bin today's world,?\s*/gi, "")
    .replace(/\b(delve|landscape|tapestry|actually)\b/gi, "")
    .replace(/\s+,/g, ",")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** First paragraph must be 20–30 words so the citation check can lift it. */
function open(query: string, rest: string): string {
  const q = query.replace(/[.?!]+$/, "").trim();
  let sentence = `${q}. ${rest}`.replace(/\s+/g, " ").trim();
  if (!/[.!?]$/.test(sentence)) sentence += ".";
  const filler = ["Check the fee line on the quote before you sign."];
  if (words(sentence).length < 20) sentence = `${sentence.replace(/\.$/, "")} ${filler[0]}`;
  const w = words(sentence);
  if (w.length > 30) sentence = `${w.slice(0, 28).join(" ")}.`;
  return sentence;
}

/** Spoken description in the 150 to 160 characters Google shows. Closers are full sentences. */
function clampMeta(text: string): string {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=\.)\s+/);
  let s = "";
  for (const part of sentences) {
    const next = s ? `${s} ${part}` : part;
    if (next.length > 160) break;
    s = next;
  }
  if (!s) s = (sentences[0] ?? text).slice(0, 160).trim();
  for (const closer of [
    " The quote shows the fee and the minimum before you sign.",
    " You keep the keys.",
    " Sign now.",
  ]) {
    if (s.length >= 150) break;
    if (s.length + closer.length <= 160) s += closer;
  }
  return s.trim();
}

type AssetClass = "meme" | "stable" | "wrapped" | "native";

function assetClass(sym: string, kind: string): AssetClass {
  if (kind === "meme-token") return "meme";
  const s = sym.toUpperCase();
  if (["USDC", "USDT", "DAI", "FDUSD", "USDE", "TUSD"].includes(s)) return "stable";
  if (["WETH", "WBTC", "WBNB", "WSOL", "WMATIC"].includes(s)) return "wrapped";
  return "native";
}

function feeMath(unit: string): string {
  return `A 30 bps platform fee on 1,000 ${unit} is 3 ${unit} before gas and the pool fee. The live quote can show a different bps, so use the fee line on that quote, not this example, as the amount you will pay.`;
}

function limitLine(): string {
  return `${BRAND_NAME} will not promise a fill, a price, or a bridge time. The minimum received on the quote is the floor. If that number is worse than you will accept, do not sign.`;
}

function marketLine(page: SeoPageConfig, sym: string): string | null {
  const line = marketSummarySentence(sym, page.marketData);
  return line ? clean(line) : null;
}

function pairSides(page: SeoPageConfig): { base: string; quote: string } {
  const titled = page.h1.match(/^(\S+) to (\S+) on /);
  if (titled) return { base: titled[1]!, quote: titled[2]! };
  const slug = page.pairSlug?.split("-") ?? [];
  return {
    base: (page.tokenSymbol ?? slug[0] ?? "the base").toUpperCase(),
    quote: (slug[1] ?? "the quote").toUpperCase(),
  };
}

function bridgeSides(page: SeoPageConfig): { send: string; recv: string } {
  const titled = page.h1.match(/^Swap (\S+) from .+ to (\S+) on /);
  if (titled) return { send: titled[1]!, recv: titled[2]! };
  return { send: (page.tokenSymbol ?? "the token").toUpperCase(), recv: "the destination token" };
}

function sectionsOf(page: SeoPageConfig): { intro: string; sections: SeoSection[]; faqs: SeoFaq[] } {
  const facts = chainFacts(page.chainKey ?? page.fromChainKey);
  const sym = (page.tokenSymbol ?? "the token").toUpperCase();
  const query = page.h1.replace(/\s+[—–-]\s+overview$/i, "").trim();

  if (page.kind === "cross-chain-swap" && page.fromChainKey && page.toChainKey) {
    const from = chainFacts(page.fromChainKey);
    const to = chainFacts(page.toChainKey);
    const { send, recv } = bridgeSides(page);
    return {
      intro: open(
        query,
        `You send ${send} on ${from.name} and receive ${recv} on ${to.name} in your own wallet.`,
      ),
      sections: [
        {
          heading: `What leaves ${from.name}`,
          body: `You need ${send} plus ${from.native} for gas on ${from.name}. ${from.gasProfile} Block time is about ${from.avgBlockTime}. A same-chain swap never moves funds to ${to.name}.`,
        },
        {
          heading: `What arrives on ${to.name}`,
          body: `The destination asset is the ${to.name} contract for ${recv}, not a balance that follows you. ${to.walletNote} Keep a little ${to.native} on ${to.name} or the received tokens can sit there with no gas to move them.`,
        },
        {
          heading: `When this route is the wrong one`,
          body: send === recv
            ? `If you only need to trade ${send} on ${from.name}, stay on that chain. Bridging the same ticker adds time and a second contract. ${limitLine()}`
            : `If both tokens already have a deep pool on one chain, a same-chain swap is simpler than a bridge. ${limitLine()}`,
        },
      ],
      faqs: [
        {
          question: `How long does ${send} from ${from.name} to ${to.name} take?`,
          answer: `There is no fixed clock. ${from.name} blocks are about ${from.avgBlockTime} and ${to.name} blocks are about ${to.avgBlockTime}, then the bridge has its own wait. The quote is the estimate. If it expires, request a new one.`,
        },
        {
          question: `Can ${BRAND_NAME} reverse a ${send} to ${recv} bridge?`,
          answer: `No. You sign from your wallet. A confirmed bridge is not something this site can undo.`,
        },
      ],
    };
  }

  if (page.kind === "pair") {
    const { base, quote: quoteSym } = pairSides(page);
    return {
      intro: open(
        query,
        `${base} is what you sell or buy, and ${quoteSym} is the other side of that pool on ${facts.name}.`,
      ),
      sections: [
        {
          heading: `A 1,000 ${quoteSym} clip of ${base}`,
          body: `${feeMath(quoteSym)} ${facts.gasProfile}`,
        },
        {
          heading: `When ${base}/${quoteSym} is the wrong pair`,
          body: `Use this pair when you want ${quoteSym} exposure on ${facts.name}. Do not use it to bridge to another network, and do not use it if the pool is too thin for your size. ${facts.liquidityNote} ${limitLine()}`,
        },
      ],
      faqs: [
        {
          question: `Is ${base}/${quoteSym} on ${facts.name} the same market as on another chain?`,
          answer: `No. Each chain has its own pool. A price here does not fill an order on a different network.`,
        },
      ],
    };
  }

  if (page.kind === "swap-token" || page.kind === "meme-token") {
    const market = marketLine(page, sym);
    const klass = assetClass(sym, page.kind);
    const contract = page.tokenAddress
      ? `The contract on this page is ${page.tokenAddress}. Match the full string on ${facts.explorer}. Copycats reuse the first and last characters.`
      : `Pick the contract on ${facts.explorer}, not the ticker. The same symbol can be a different token.`;
    const shapes: Record<AssetClass, { heads: [string, string, string]; bodies: [string, string, string] }> = {
      stable: {
        heads: ["What a 1,000 unit clip costs", "Native coin or a bridged copy", "When to stay on this chain"],
        bodies: [
          [feeMath(sym), facts.gasProfile, market].filter(Boolean).join(" "),
          `${sym} on ${facts.name} is this chain's contract, not a balance that follows you to another network. ${contract}`,
          `Bridge only if you need ${sym} somewhere else. A same-chain swap is enough when both tokens already pool here. ${limitLine()}`,
        ],
      },
      meme: {
        heads: ["What a thin pool does to the fill", "How to tell a copy apart", "Who should skip this"],
        bodies: [
          [market, feeMath(sym), "A thin book can move the price while the transaction confirms."].filter(Boolean).join(" "),
          contract,
          `Skip this if you need a stable balance. Size it as money you can lose. ${limitLine()}`,
        ],
      },
      wrapped: {
        heads: ["Unwrapping is not a bridge", "Gas on this network", "When the wrapper is the wrong tool"],
        bodies: [
          `Unwrapping ${sym} stays on ${facts.name}. Moving value to another chain is a bridge, and the asset that arrives is a different contract. ${market ?? ""}`.trim(),
          `${feeMath(sym)} ${facts.gasProfile}`,
          `${contract} ${limitLine()}`,
        ],
      },
      native: {
        heads: ["Gas versus the platform fee", "The explorer check", "When the size is too big"],
        bodies: [
          `${feeMath(sym)} ${facts.gasProfile} ${market ?? ""}`.trim(),
          contract,
          `${facts.liquidityNote} If the minimum received is worse than you will take, do not sign. ${limitLine()}`,
        ],
      },
    };
    const shape = shapes[klass];
    return {
      intro: open(
        query,
        `Connect a wallet on ${facts.name}, read the minimum you receive, and sign. About a minute when the quote is fresh.`,
      ),
      sections: shape.heads.map((heading, i) => ({ heading, body: shape.bodies[i]! })),
      faqs: [
        {
          question: `Does ${BRAND_NAME} hold ${sym} after the swap?`,
          answer: `No. The tokens stay in the wallet that signed. ${BRAND_NAME} does not take custody.`,
        },
        {
          question: `What does this swap on ${facts.name} cost?`,
          answer: feeMath(sym),
        },
      ],
    };
  }

  if (page.kind === "search") {
    const how = /^how to\b/i.test(query);
    const compare = /\b(best|cheapest|vs|compare|difference)\b/i.test(query);
    return {
      intro: open(
        query,
        how
          ? `The result is a signed swap on ${BRAND_NAME}, with the minimum received shown before you approve.`
          : compare
            ? `The useful difference is the minimum you receive after fees, not the headline rate.`
            : `It means you compare routes and sign from your own wallet, without giving custody to an exchange.`,
      ),
      sections: [
        {
          heading: how ? "Do this" : compare ? "How to tell them apart" : "The part that changes the decision",
          body: how
            ? `Open Swap, pick the chain, enter the amount, and read the minimum received. ${feeMath("units")} If the wallet asks for an approval, that approval is a separate transaction from the swap.`
            : `${feeMath("units")} Two routes with the same mid price can pay you different amounts once price impact is included. Keep the route with the higher minimum received.`,
        },
        {
          heading: "When this answer does not apply",
          body: `${limitLine()} This page is not a price feed and not a promise that a pool will have size for your order.`,
        },
      ],
      faqs: [
        {
          question: how ? `What is the best way to ${query.replace(/^how to\s+/i, "")}?` : `Does this guarantee the best ${query}?`,
          answer: `No guarantee. Compare the minimum received on the live quote and sign only if that floor is acceptable.`,
        },
      ],
    };
  }

  const hubJob: Record<string, { who: string; then: string; wrong: string }> = {
    chain: {
      who: `Traders who already hold ${facts.native} and want to swap on ${facts.name}.`,
      then: `${facts.liquidityNote} Blocks are about ${facts.avgBlockTime}. ${facts.gasProfile}`,
      wrong: `This is not a bridge guide and not a token listing. If you need another network, open that chain's page.`,
    },
    "swap-hub": {
      who: `Anyone swapping on ${facts.name} in the next few minutes.`,
      then: `${facts.walletNote} ${feeMath(facts.native)} ${facts.gasProfile}`,
      wrong: `Do not start here to launch a token or to bridge. Those are different jobs.`,
    },
    "meme-hub": {
      who: `People trading memecoins on ${facts.name}, not people looking for a stable balance.`,
      then: `${facts.liquidityNote} Match the contract on ${facts.explorer} before the first buy.`,
      wrong: `If you cannot afford a total loss on the position, do not use a memecoin pool. ${limitLine()}`,
    },
    launch: {
      who: `A deployer who wants a token on ${facts.name} and will pay gas in ${facts.native}.`,
      then: `The launch flow asks for a name, a symbol, and a supply, then your wallet signs the deploy. Add liquidity after the contract exists. ${facts.gasProfile}`,
      wrong: `Launching does not create buyers. A new contract with no pool cannot be swapped.`,
    },
    discover: {
      who: `Someone checking where liquidity sits on ${facts.name} before choosing a size.`,
      then: facts.liquidityNote,
      wrong: `A chart is not a quote. Open Swap and read the minimum received before you treat a pool as tradable.`,
    },
    trade: {
      who: `An active trader moving size on ${facts.name}.`,
      then: `${feeMath(facts.native)} ${facts.gasProfile} Re-quote if a minute passes before you sign.`,
      wrong: `If the pool cannot absorb your size, split the order or pick another venue. ${limitLine()}`,
    },
  };

  const job = hubJob[page.kind] ?? hubJob.chain!;
  return {
    intro: open(query, job.who),
    sections: [
      {
        heading: `${facts.name}: the number that matters`,
        body: job.then,
      },
      {
        heading: `What this ${facts.name} page will not do`,
        body: job.wrong,
      },
    ],
    faqs: [
      {
        question: `Which wallet works on ${facts.name}?`,
        answer: facts.walletNote,
      },
    ],
  };
}

export function applyHumanPage(page: SeoPageConfig): void {
  const authored = authoredFor(page);
  if (authored) {
    page.intro = clean(authored.intro);
    page.sections = authored.sections.map((s) => ({ heading: clean(s.heading), body: clean(s.body) }));
    page.faqs = authored.faqs.map((f) => ({ question: clean(f.question), answer: clean(f.answer) }));
    page.description = clampMeta(clean(authored.description));
    page.figure = authored.figure;
    return;
  }

  if (page.kind === "learn" || page.kind === "guide") {
    page.intro = clean(page.intro);
    page.description = clean(page.description);
    page.sections = page.sections.map((s) => ({ heading: clean(s.heading), body: clean(s.body) }));
    page.faqs = page.faqs.map((f) => ({ question: clean(f.question), answer: clean(f.answer) }));
    return;
  }

  const built = sectionsOf(page);
  page.intro = clean(built.intro);
  page.sections = built.sections.map((s) => ({ heading: clean(s.heading), body: clean(s.body) }));
  page.faqs = built.faqs.map((f) => ({ question: clean(f.question), answer: clean(f.answer) }));

  const facts = chainFacts(page.chainKey ?? page.fromChainKey);
  const query = page.h1.replace(/\s+[—–-]\s+overview$/i, "").trim();
  const reason =
    query.length > 72
      ? "The quote shows the fee and the minimum you receive before you sign."
      : `${facts.name} quotes on ${BRAND_NAME}, with the fee and the minimum you receive shown before you sign.`;
  page.description = clampMeta(`${query}. ${reason}`);
  const short = query.length <= 52 ? query : `${query.slice(0, 49).replace(/\s+\S*$/, "")}`;
  page.title = `${short} | ${BRAND_NAME}`;
}
