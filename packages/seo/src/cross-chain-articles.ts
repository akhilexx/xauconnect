/**
 * Cross-chain pages. The route class changes the argument.
 * A stablecoin move, a rollup hop, a Solana mint, and a volatile swap
 * are not the same article with the names replaced.
 */
import type { SeoPageConfig } from "./types.js";
import { chainFacts } from "./content-blocks.js";

type ChainId = {
  id: string;
  note: string;
};

const CHAIN: Record<string, ChainId> = {
  ethereum: { id: "1", note: "mainnet, the deepest blue-chip books" },
  bsc: { id: "56", note: "BNB gas, USDT is usually the deep pair" },
  polygon: { id: "137", note: "POL gas, bridged assets are often thinner than mainnet" },
  arbitrum: { id: "42161", note: "Arbitrum One, not Nova" },
  base: { id: "8453", note: "an Ethereum L2, gas still paid in ETH" },
  avalanche: { id: "43114", note: "C-Chain only, not X-Chain or P-Chain" },
  solana: { id: "not an EVM id", note: "SPL mints, Phantom or Solflare, no ERC-20 approval" },
};

const ROLLUPS = new Set(["base", "arbitrum"]);
const STABLES = new Set(["USDC", "USDT", "DAI"]);
const WRAPS: Record<string, string> = { ETH: "WETH", WETH: "ETH", BTC: "WBTC", WBTC: "BTC" };

type RouteClass = "solana" | "rollup" | "stable-same" | "stable-switch" | "wrap" | "volatile";

function routeClass(fromKey: string, toKey: string, send: string, recv: string): RouteClass {
  if (fromKey === "solana" || toKey === "solana") return "solana";
  if (WRAPS[send] === recv) return "wrap";
  if (STABLES.has(send) && send === recv) return "stable-same";
  if (STABLES.has(send) && STABLES.has(recv)) return "stable-switch";
  if (
    (fromKey === "ethereum" && ROLLUPS.has(toKey)) ||
    (toKey === "ethereum" && ROLLUPS.has(fromKey))
  ) {
    return "rollup";
  }
  return "volatile";
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** First paragraph starts with the H1 and stays inside 20 to 28 words. */
function opening(h1: string, rest: string): string {
  let sentence = `${h1.replace(/\.+$/, "")}. ${rest}`.replace(/\s+/g, " ").trim();
  if (!/[.!?]$/.test(sentence)) sentence += ".";
  let w = words(sentence);
  if (w.length > 28) sentence = `${w.slice(0, 28).join(" ")}.`;
  w = words(sentence);
  if (w.length < 20) {
    sentence = `${sentence.replace(/\.$/, "")} Read the quote before you sign.`;
  }
  w = words(sentence);
  if (w.length > 30) sentence = `${w.slice(0, 28).join(" ")}.`;
  return sentence;
}

export function writeCrossChain(page: SeoPageConfig): {
  intro: string;
  description: string;
  sections: { heading: string; body: string }[];
  faqs: { question: string; answer: string }[];
  figure: { src: string; alt: string; caption: string };
} | null {
  if (!page.fromChainKey || !page.toChainKey) return null;
  const from = chainFacts(page.fromChainKey);
  const to = chainFacts(page.toChainKey);
  const fromMeta = CHAIN[page.fromChainKey];
  const toMeta = CHAIN[page.toChainKey];
  if (!fromMeta || !toMeta) return null;

  const { send, recv } = bridgeSides(page);
  const klass = routeClass(page.fromChainKey, page.toChainKey, send, recv);
  const inAddr = page.swapPreset?.tokenIn ?? "the source contract";
  const outAddr = page.swapPreset?.tokenOut ?? "the destination contract";
  const h1 = page.h1.replace(/\.+$/, "");

  const gasLine = `You pay ${from.native} on ${from.name} (chain ${fromMeta.id}) and you need ${to.native} on ${to.name} (chain ${toMeta.id}) after arrival.`;

  const introRest: Record<RouteClass, string> = {
    solana: `One side is an SPL mint and the other is an EVM contract, so the wallet has to change.`,
    rollup: `This is a rollup hop, and the ${from.native} balance on ${from.name} is not the balance on ${to.name}.`,
    "stable-same": `The ticker stays ${send}, but ${from.explorer} and ${to.explorer} list two different contracts.`,
    "stable-switch": `You change issuer as well as chain, from ${send} to ${recv}.`,
    wrap: `Wrapping ${send} into ${recv} on one chain is a different job from this bridge.`,
    volatile: `The asset changes from ${send} to ${recv} while the bridge wait is still open.`,
  };

  const sections = sectionsFor(klass, {
    send,
    recv,
    fromName: from.name,
    toName: to.name,
    fromNative: from.native,
    toNative: to.native,
    fromExp: from.explorer,
    toExp: to.explorer,
    fromId: fromMeta.id,
    toId: toMeta.id,
    fromNote: fromMeta.note,
    toNote: toMeta.note,
    inAddr,
    outAddr,
    blocksFrom: from.avgBlockTime,
    blocksTo: to.avgBlockTime,
    fromKey: page.fromChainKey,
    toKey: page.toChainKey,
  });

  return {
    intro: `${opening(h1, introRest[klass])}\n\n${gasLine} Source address ${inAddr}. Destination address ${outAddr}.`,
    description: `${h1}. Gas in ${from.native} then ${to.native}. Match both contracts before you sign.`,
    sections,
    faqs: [
      {
        question: `How long does ${send} from ${from.name} to ${recv} on ${to.name} take?`,
        answer: `${from.name} blocks are ${from.avgBlockTime}. ${to.name} blocks are ${to.avgBlockTime}. The bridge adds its own wait on top of both. If the quote expires, request a new one. There is no fixed clock.`,
      },
      {
        question: `Can this ${send} to ${recv} transfer be reversed here?`,
        answer: `No. You sign on ${from.name}. A confirmed bridge is not something this site can undo. The received ${recv} lives at ${outAddr} on ${to.name}.`,
      },
    ],
    figure: {
      src: "/seo/cross-chain-bridge.jpg",
      alt: `Bridge picture for sending ${send} from ${from.name} to ${recv} on ${to.name}`,
      caption: `${send} leaves ${from.name}. ${recv} is what can arrive on ${to.name}.`,
    },
  };
}

function bridgeSides(page: SeoPageConfig): { send: string; recv: string } {
  const titled = page.h1.match(/^Swap (\S+) from .+ to (\S+) on /);
  if (titled) return { send: titled[1]!, recv: titled[2]! };
  return { send: (page.tokenSymbol ?? "the token").toUpperCase(), recv: "the destination token" };
}

function sectionsFor(
  klass: RouteClass,
  f: {
    send: string;
    recv: string;
    fromName: string;
    toName: string;
    fromNative: string;
    toNative: string;
    fromExp: string;
    toExp: string;
    fromId: string;
    toId: string;
    fromNote: string;
    toNote: string;
    inAddr: string;
    outAddr: string;
    blocksFrom: string;
    blocksTo: string;
    fromKey: string;
    toKey: string;
  },
): { heading: string; body: string }[] {
  const link = `The mechanism is [how cross-chain bridges work](/learn/how-do-cross-chain-bridges-work). The click-path is [how to bridge](/learn/guides/how-to-bridge-assets-between-chains). Chain notes: [trade on ${f.fromName}](/chains/${f.fromKey}) and [trade on ${f.toName}](/chains/${f.toKey}).`;

  if (klass === "solana") {
    return [
      {
        heading: "The wallet has to change",
        body: `${f.fromName} uses ${f.fromNote}. ${f.toName} uses ${f.toNote}. MetaMask cannot hold an SPL mint, and Phantom cannot sign an Ethereum transaction. You send ${f.send} from ${f.fromName} and you receive ${f.recv} on ${f.toName} in the wallet that matches that chain.`,
      },
      {
        heading: "Two addresses, two explorers",
        body: `Check ${f.send} on ${f.fromExp}: ${f.inAddr}. Check ${f.recv} on ${f.toExp}: ${f.outAddr}. ${f.fromName} blocks are ${f.blocksFrom}. ${f.toName} blocks are ${f.blocksTo}. The bridge wait is extra. ${link}`,
      },
      {
        heading: "When this hop is the wrong job",
        body: `If both tokens already trade on ${f.fromName}, swap there and skip the bridge. A Solana hop is worth it only when you need the mint on Solana or you are leaving it. This site will not promise the arrival time.`,
      },
    ];
  }

  if (klass === "rollup") {
    return [
      {
        heading: "A rollup hop, not a new coin",
        body: `${f.fromName} is chain ${f.fromId} (${f.fromNote}). ${f.toName} is chain ${f.toId} (${f.toNote}). The ${f.fromNative} you hold on ${f.fromName} does not pay gas on ${f.toName}. You still need ${f.toNative} after ${f.recv} arrives.`,
      },
      {
        heading: "Contracts to match",
        body: `${f.send} leaves from ${f.inAddr} on ${f.fromExp}. ${f.recv} is checked at ${f.outAddr} on ${f.toExp}. Blocks: ${f.blocksFrom} on the way out, ${f.blocksTo} on the way in. ${link}`,
      },
      {
        heading: "When mainnet depth wins",
        body: `If the size is large and the deep pool is on Ethereum, cheaper L2 gas does not create that depth. Stay on the chain that can absorb the order. Bridging ${f.send} to ${f.toName} only to swap and bridge back pays gas twice.`,
      },
    ];
  }

  if (klass === "stable-same") {
    return [
      {
        heading: "Same ticker, two contracts",
        body: `${f.send} on ${f.fromName} is ${f.inAddr} (${f.fromExp}). ${f.recv} on ${f.toName} is ${f.outAddr} (${f.toExp}). The peg can match and the token still be a different contract. Do not approve the address from the other chain.`,
      },
      {
        heading: "Gas before the coins can move",
        body: `${f.fromNative} on chain ${f.fromId}, then ${f.toNative} on chain ${f.toId}. ${f.fromName}: ${f.fromNote}. ${f.toName}: ${f.toNote}. ${link}`,
      },
      {
        heading: "When not to move it",
        body: `If you only wanted to trade ${f.send} for something else on ${f.fromName}, a same-chain swap is the whole job. Bridging ${f.send} to ${f.toName} adds a wait and a second contract you must check on ${f.toExp}.`,
      },
    ];
  }

  if (klass === "stable-switch") {
    return [
      {
        heading: "Issuer and chain both change",
        body: `${f.send} and ${f.recv} are not the same dollar token. You are leaving ${f.send} at ${f.inAddr} on ${f.fromExp} and arriving in ${f.recv} at ${f.outAddr} on ${f.toExp}. A local ${f.send} to ${f.recv} swap on ${f.fromName} may already do the issuer change without a bridge.`,
      },
      {
        heading: "What you must hold",
        body: `Gas is ${f.fromNative} on chain ${f.fromId} (${f.fromNote}) and ${f.toNative} on chain ${f.toId} (${f.toNote}). ${link}`,
      },
      {
        heading: "The case that does not belong here",
        body: `If the pool on ${f.fromName} is deep enough, swap ${f.send} to ${f.recv} there and bridge only the coin you will spend on ${f.toName}. Doing both in one hop is for when you need ${f.recv} on ${f.toName} and you accept the wait.`,
      },
    ];
  }

  if (klass === "wrap") {
    return [
      {
        heading: "Wrapping is a same-chain action",
        body: `Turning ${f.send} into ${f.recv} on one network does not use this route. This page sends ${f.send} from ${f.fromName} (${f.inAddr} on ${f.fromExp}) and receives ${f.recv} on ${f.toName} (${f.outAddr} on ${f.toExp}).`,
      },
      {
        heading: "Gas on each side",
        body: `${f.fromNative}, chain ${f.fromId}. Then ${f.toNative}, chain ${f.toId}. ${f.fromNote}. ${f.toNote}. ${link}`,
      },
      {
        heading: "Stay put if you only needed the wrapper",
        body: `If you are already on ${f.fromName} and a pool wants the wrapped form, wrap there. Crossing to ${f.toName} is a second decision. Do not pay the bridge to solve a local wrapper.`,
      },
    ];
  }

  return [
    {
      heading: "The asset changes during the wait",
      body: `${f.send} can move in price before ${f.recv} is released on ${f.toName}. The minimum on the quote is the floor. If that floor is worse than you will take, do not sign. Source ${f.inAddr} on ${f.fromExp}. Destination ${f.outAddr} on ${f.toExp}.`,
    },
    {
      heading: "Gas coins are not optional",
      body: `${f.fromName} is chain ${f.fromId}, ${f.fromNote}, blocks ${f.blocksFrom}, gas in ${f.fromNative}. ${f.toName} is chain ${f.toId}, ${f.toNote}, blocks ${f.blocksTo}, gas in ${f.toNative}. ${link}`,
    },
    {
      heading: "A same-chain trade may be the whole job",
      body: `Bridge ${f.send} to ${f.toName} only when you need ${f.recv} there. If both already pool on ${f.fromName}, swap locally. This site will not promise a fill or a clock.`,
    },
  ];
}
