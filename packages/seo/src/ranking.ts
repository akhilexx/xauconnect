/**
 * On-page ranking placement from Whitespark Local Update E49 (Edward Sturm).
 *
 * The durable methods in that episode, applied here:
 * - The target query sits in the title, the URL, the H1, and the opening sentence.
 * - A 20–30 word opening can be copied into an AI retrieval check.
 * - Other indexed pages that already mention the query link that mention to the target.
 * - Page URLs win over in-page anchors. Anchors are only for a buried section.
 * - One FAQ answers the broader question models fan out to.
 *
 * Not applied, because the same episode said they are not worth doing:
 * indexers, NotebookLM / chat-share parasite pages, exact-match domain nets,
 * and invented press-release events.
 *
 * Operator notes: docs/SEO_RANKING_PLAYBOOK.md
 */
import type { SeoFaq, SeoPageConfig } from "./types.js";
import { hashSeed } from "./content-blocks.js";

export interface RankingStats {
  openingsAdded: number;
  fanOutsAdded: number;
  contextualLinks: number;
  targets: number;
}

const LEGAL_HEADINGS = new Set(["Risk disclosure", "Risk disclaimer"]);

/** Money URLs that should receive links when another page says the phrase. */
const PINNED_TARGETS: Array<{ path: string; needle: string }> = [
  { path: "/", needle: "launch a token on meteora" },
  { path: "/launchpad", needle: "gold curve on meteora" },
];

const LEADING =
  /^(how to|how do i|what is|what are|why|guide to|a guide to)\s+/i;
const LEADING_VERBS =
  /^(set|connect|buy|sell|read|verify|avoid|bridge|calculate|revoke|use|choose|add|create|launch|trade|swap|check|find|compare|move|send|get)\s+/i;

const NEEDLE_STOP = new Set([
  "to",
  "on",
  "for",
  "from",
  "with",
  "into",
  "onto",
  "a",
  "an",
  "the",
  "your",
  "and",
  "or",
  "of",
  "in",
  "at",
  "by",
]);

const SOURCE_RANK: Record<string, number> = {
  guide: 0,
  learn: 1,
  search: 2,
  chain: 3,
  "swap-hub": 4,
  trade: 4,
  launch: 4,
  discover: 4,
  "meme-hub": 4,
  pair: 5,
  "swap-token": 6,
  "meme-token": 6,
  "cross-chain-search": 7,
  "cross-chain-swap": 8,
};

const MAX_OUTBOUND = 3;
const MAX_INBOUND = 24;

const TAILS = [
  "Compare the live quote, the fee, and the minimum you receive, then sign from your own wallet.",
  "Read the route and the minimum you will receive before your wallet asks you to approve.",
  "Check the contract, the network, and the minimum received before you confirm the trade.",
  "Start with a small test trade, match the receipt to the quote, then increase size only after that.",
] as const;

export function headingAnchor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function stripMd(text: string): string {
  return normalizeSpace(
    text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/`/g, ""),
  );
}

export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function primaryQuery(page: SeoPageConfig): string {
  return page.h1.replace(/\s+[—–-]\s+overview$/i, "").trim();
}

export function firstSentence(text: string): string {
  const plain = normalizeSpace(text);
  const match = plain.match(/^[\s\S]*?[.!?](?=\s+[A-Z0-9]|\s*$)/);
  return (match?.[0] ?? plain).trim();
}

export function openingHasQuery(intro: string, query: string): boolean {
  const sentence = normalizePhrase(firstSentence(stripMd(intro.split(/\n\n+/)[0] ?? intro)));
  const needle = normalizePhrase(query);
  return needle.length > 0 && sentence.includes(needle);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** A single opening sentence of 20–30 words that begins with the query. */
export function buildCitationSentence(query: string, seedKey: string): string {
  const q = query.replace(/\s+/g, " ").trim().replace(/[.?!]+$/, "");
  const qWords = q.split(" ").filter(Boolean);
  if (qWords.length >= 20 && qWords.length <= 28) {
    return /[.!?]$/.test(q) ? q : `${q}.`;
  }
  if (qWords.length > 28) {
    return `${qWords.slice(0, 28).join(" ")}.`;
  }
  const tail = TAILS[hashSeed(seedKey) % TAILS.length]!;
  const room = 28 - qWords.length;
  let tailWords = tail.replace(/[.?!]+$/, "").split(/\s+/).filter(Boolean);
  if (tailWords.length > room) tailWords = tailWords.slice(0, Math.max(room, 0));
  const tailText = tailWords.join(" ");
  const tailClause = tailText ? `${tailText.charAt(0).toLowerCase()}${tailText.slice(1)}` : "";
  let sentence = tailClause ? `${q}: ${tailClause}` : q;
  if (!/[.!?]$/.test(sentence)) sentence += ".";
  const filler = ["Review", "fees", "before", "signing", "on", "XAUConnect"];
  let i = 0;
  while (wordCount(sentence) < 20 && i < filler.length) {
    sentence = `${sentence.replace(/\.$/, "")} ${filler[i]}.`;
    i++;
  }
  const words = sentence.split(/\s+/);
  if (words.length > 30) sentence = `${words.slice(0, 28).join(" ")}.`;
  return sentence;
}

export function deriveCitationSnippet(intro: string): string {
  const first = intro.split(/\n\n+/)[0] ?? intro;
  const plain = stripMd(first);
  const words = plain.split(" ").filter(Boolean);
  if (words.length >= 20 && words.length <= 30) return plain;
  if (words.length > 30) {
    let end = Math.min(28, words.length);
    for (let i = Math.min(28, words.length); i >= 20; i--) {
      if (/[.!?]$/.test(words[i - 1] ?? "")) {
        end = i;
        break;
      }
    }
    return words.slice(0, end).join(" ");
  }
  const all = stripMd(intro).split(" ").filter(Boolean);
  if (all.length <= 30) return all.join(" ");
  return all.slice(0, 24).join(" ");
}

export function bestWayQuestion(query: string): string {
  const q = query.replace(/\s+/g, " ").trim().replace(/[.?!]+$/, "");
  if (/^how to\s+/i.test(q)) {
    return `What is the best way to ${q.replace(/^how to\s+/i, "")}?`;
  }
  if (
    /^(swap|buy|sell|trade|bridge|launch|discover|connect|verify|avoid|calculate|revoke)\b/i.test(
      q,
    )
  ) {
    return `What is the best way to ${q.charAt(0).toLowerCase()}${q.slice(1)}?`;
  }
  if (/\bto\b/i.test(q)) return `What is the best way to swap ${q}?`;
  return `What is the best way to trade ${q.charAt(0).toLowerCase()}${q.slice(1)}?`;
}

function fanOutAnswer(page: SeoPageConfig): string {
  const parts = page.intro.split(/\n\n+/).map((part) => stripMd(part)).filter(Boolean);
  const source = parts[1] ?? parts[0] ?? "";
  const sentences = source.match(/[^.!?]+[.!?]+/g) ?? [source];
  let answer = normalizeSpace(sentences.slice(0, 2).join(" "));
  const words = answer.split(/\s+/).filter(Boolean);
  if (words.length > 48) answer = `${words.slice(0, 46).join(" ")}.`;
  if (wordCount(answer) < 12) {
    answer = normalizeSpace(
      `${answer} XAUConnect compares live routes and lets your own wallet sign.`,
    );
  }
  if (!/[.!?]$/.test(answer)) answer += ".";
  return answer;
}

function ensureOpening(page: SeoPageConfig): boolean {
  const query = primaryQuery(page);
  page.primaryQuery = query;
  if (!page.keywords.some((k) => k.toLowerCase() === query.toLowerCase())) {
    page.keywords = [query, ...page.keywords].slice(0, 12);
  }
  if (!openingHasQuery(page.intro, query)) {
    const parts = page.intro.split(/\n\n+/);
    const first = (parts[0] ?? "").trim();
    parts[0] = `${query}. ${first}`;
    page.intro = parts.join("\n\n");
    page.citationSnippet = deriveCitationSnippet(page.intro);
    return true;
  }
  page.citationSnippet = deriveCitationSnippet(page.intro);
  return false;
}

function ensureFanOut(page: SeoPageConfig): boolean {
  const query = page.primaryQuery ?? primaryQuery(page);
  const question = bestWayQuestion(query);
  if (question.length > 160) return false;
  const exists = page.faqs.some(
    (faq) => faq.question.toLowerCase() === question.toLowerCase() || /best way to/i.test(faq.question),
  );
  if (exists) return false;
  const answer = fanOutAnswer(page);
  if (wordCount(answer) < 8) return false;
  const faq: SeoFaq = { question, answer };
  page.faqs = [faq, ...page.faqs].slice(0, 8);
  return true;
}

function needlesFor(query: string): string[] {
  const base = normalizePhrase(query);
  const concept = base.replace(LEADING, "").trim();
  const out: string[] = [];
  const add = (value: string) => {
    const needle = normalizePhrase(value);
    const words = needle.split(" ").filter(Boolean);
    if (needle.length < 12 || words.length < 2) return;
    if (NEEDLE_STOP.has(words[0] ?? "")) return;
    const content = words.filter((word) => !NEEDLE_STOP.has(word) && word.length > 2);
    if (content.length < 2) return;
    if (!out.includes(needle)) out.push(needle);
  };
  add(concept);
  const stripped = concept.replace(LEADING_VERBS, "").trim();
  if (stripped !== concept) add(stripped);
  return out.sort((a, b) => b.length - a.length);
}

interface Target {
  href: string;
  path: string;
  needle: string;
}

function collectTargets(pages: SeoPageConfig[]): Target[] {
  const targets: Target[] = [];
  const seen = new Set<string>();
  const push = (needle: string, path: string, anchor?: string) => {
    const key = normalizePhrase(needle);
    if (!key || seen.has(key)) return;
    if (key.length < 12 || key.split(" ").length < 2) return;
    seen.add(key);
    const href = anchor ? `${path}#${anchor}` : path;
    targets.push({ href, path, needle: key });
  };

  for (const pinned of PINNED_TARGETS) push(pinned.needle, pinned.path);

  const editorial = pages
    .filter((page) => !page.noindex && (page.kind === "guide" || page.kind === "learn" || page.kind === "search"))
    .sort((a, b) => (SOURCE_RANK[a.kind] ?? 9) - (SOURCE_RANK[b.kind] ?? 9));

  for (const page of editorial) {
    for (const needle of needlesFor(primaryQuery(page))) {
      if (page.kind === "search" && needle.split(" ").length > 6) continue;
      push(needle, page.path);
    }
  }

  for (const page of pages) {
    if (page.noindex || page.kind === "search") continue;
    for (const section of page.sections) {
      if (LEGAL_HEADINGS.has(section.heading)) continue;
      for (const needle of needlesFor(section.heading)) {
        if (needle.split(" ").length < 4) continue;
        push(needle, page.path, headingAnchor(section.heading));
      }
    }
  }

  return targets.sort((a, b) => b.needle.length - a.needle.length);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insideLink(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const lastOpen = before.lastIndexOf("[");
  const lastClose = before.lastIndexOf("]");
  if (lastOpen > lastClose) return true;
  const lastHref = before.lastIndexOf("](");
  if (lastHref >= 0) {
    const end = text.indexOf(")", lastHref);
    if (end >= index) return true;
  }
  return false;
}

function linkNeedle(text: string, needle: string, href: string): string | null {
  const path = href.split("#")[0] ?? href;
  if (text.includes(`](${href})`) || text.includes(`](${path})`) || text.includes(`](${path}#`)) {
    return null;
  }
  const re = new RegExp(
    `(?<![A-Za-z0-9])(\\*{0,2})(${escapeRegExp(needle)})(\\*{0,2})(?![A-Za-z0-9])`,
    "i",
  );
  const match = re.exec(text);
  if (!match || match.index == null || !match[2]) return null;
  if (insideLink(text, match.index)) return null;
  const starsBefore = match[1] ?? "";
  const starsAfter = match[3] ?? "";
  const balanced = starsBefore === starsAfter && (starsBefore === "" || starsBefore === "**");
  const start = match.index + (balanced ? 0 : starsBefore.length);
  const end =
    start +
    (balanced ? starsBefore.length + match[2].length + starsAfter.length : match[2].length);
  return `${text.slice(0, start)}[${match[2]}](${href})${text.slice(end)}`;
}

interface SlotRef {
  pageIndex: number;
  slot: number;
  text: string;
}

function slotsFor(page: SeoPageConfig, pageIndex: number): SlotRef[] {
  const slots: SlotRef[] = [];
  const paras = page.intro.split(/\n\n+/);
  if (paras.length > 1) {
    slots.push({ pageIndex, slot: -1, text: paras.slice(1).join("\n\n") });
  }
  page.sections.forEach((section, index) => {
    if (LEGAL_HEADINGS.has(section.heading)) return;
    slots.push({ pageIndex, slot: index, text: section.body });
  });
  return slots;
}

function applyTopicalLinks(pages: SeoPageConfig[], targets: Target[]): number {
  interface Candidate {
    pageIndex: number;
    slot: number;
    needle: string;
    href: string;
    sourceRank: number;
  }

  const candidates: Candidate[] = [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex]!;
    if (page.noindex) continue;
    const rank = SOURCE_RANK[page.kind] ?? 6;
    for (const slot of slotsFor(page, pageIndex)) {
      const hay = slot.text.toLowerCase();
      for (const target of targets) {
        if (target.path === page.path) continue;
        if (!hay.includes(target.needle)) continue;
        candidates.push({
          pageIndex,
          slot: slot.slot,
          needle: target.needle,
          href: target.href,
          sourceRank: rank,
        });
      }
    }
  }

  candidates.sort(
    (a, b) => a.sourceRank - b.sourceRank || b.needle.length - a.needle.length || a.pageIndex - b.pageIndex,
  );

  const inbound = new Map<string, number>();
  const outbound = new Map<number, number>();
  const chosen = new Map<string, Candidate[]>();
  const usedHref = new Set<string>();

  for (const candidate of candidates) {
    if ((inbound.get(candidate.href) ?? 0) >= MAX_INBOUND) continue;
    if ((outbound.get(candidate.pageIndex) ?? 0) >= MAX_OUTBOUND) continue;
    const hrefKey = `${candidate.pageIndex}:${candidate.href}`;
    if (usedHref.has(hrefKey)) continue;
    const key = `${candidate.pageIndex}:${candidate.slot}`;
    const list = chosen.get(key) ?? [];
    if (list.some((item) => item.href === candidate.href || item.needle === candidate.needle)) continue;
    list.push(candidate);
    chosen.set(key, list);
    usedHref.add(hrefKey);
    inbound.set(candidate.href, (inbound.get(candidate.href) ?? 0) + 1);
    outbound.set(candidate.pageIndex, (outbound.get(candidate.pageIndex) ?? 0) + 1);
  }

  let linked = 0;
  for (const [key, list] of chosen) {
    const [indexText, slotText] = key.split(":");
    const page = pages[Number(indexText)]!;
    const slot = Number(slotText);
    const ordered = [...list].sort((a, b) => b.needle.length - a.needle.length);
    if (slot === -1) {
      const paras = page.intro.split(/\n\n+/);
      let rest = paras.slice(1).join("\n\n");
      for (const item of ordered) {
        const next = linkNeedle(rest, item.needle, item.href);
        if (!next || next === rest) continue;
        rest = next;
        linked++;
      }
      page.intro = `${paras[0]}\n\n${rest}`;
      continue;
    }
    const section = page.sections[slot];
    if (!section) continue;
    let body = section.body;
    for (const item of ordered) {
      const next = linkNeedle(body, item.needle, item.href);
      if (!next || next === body) continue;
      body = next;
      linked++;
    }
    section.body = body;
  }
  return linked;
}

export function applyRankingSystem(pages: SeoPageConfig[]): RankingStats {
  let openingsAdded = 0;
  let fanOutsAdded = 0;
  for (const page of pages) {
    if (page.noindex) continue;
    if (ensureOpening(page)) openingsAdded++;
    if (ensureFanOut(page)) fanOutsAdded++;
  }
  const targets = collectTargets(pages);
  const contextualLinks = applyTopicalLinks(pages, targets);
  return { openingsAdded, fanOutsAdded, contextualLinks, targets: targets.length };
}

export function rankingSelfCheck(): void {
  const samples = [
    ["How to set slippage tolerance", "/learn/guides/how-to-set-slippage-tolerance"],
    ["Swap Ether (ETH) on Ethereum", "/swap/ethereum/eth"],
    ["ETH to USDC on Ethereum", "/pairs/ethereum/eth-usdc"],
    ["Trade on Ethereum with XAUConnect", "/chains/ethereum"],
  ] as const;
  for (const [query, path] of samples) {
    const sentence = buildCitationSentence(query, path);
    const count = wordCount(sentence);
    if (count < 20 || count > 30) {
      throw new Error(`citation length ${count} for "${query}": ${sentence}`);
    }
    if (!normalizePhrase(sentence).includes(normalizePhrase(query))) {
      throw new Error(`citation dropped query "${query}": ${sentence}`);
    }
  }

  const howTo = bestWayQuestion("How to set slippage tolerance");
  if (howTo !== "What is the best way to set slippage tolerance?") {
    throw new Error(howTo);
  }
  const pair = bestWayQuestion("ETH to USDC on Ethereum");
  if (!pair.startsWith("What is the best way to swap ETH")) throw new Error(pair);

  const guide: SeoPageConfig = {
    id: "guide",
    kind: "guide",
    path: "/learn/guides/how-to-set-slippage-tolerance",
    title: "How to set slippage tolerance | XAUConnect",
    h1: "How to set slippage tolerance",
    description: "Set slippage tolerance before you sign a swap.",
    intro:
      "How to set slippage tolerance starts with the quoted minimum you will receive, then a small test trade before you raise size on XAUConnect today.",
    sections: [
      { heading: "What slippage tolerance really controls", body: "Slippage tolerance is a floor, not a fee you pay." },
    ],
    faqs: [{ question: "What slippage should I use?", answer: "Start near 0.5% on liquid pairs." }],
    relatedPaths: [],
    keywords: [],
  };
  const supporter: SeoPageConfig = {
    id: "support",
    kind: "swap-token",
    path: "/swap/ethereum/eth",
    title: "Swap Ether (ETH) on Ethereum | XAUConnect",
    h1: "Swap Ether (ETH) on Ethereum",
    description: "Swap Ether on Ethereum.",
    intro:
      "Swap Ether (ETH) on Ethereum by comparing live routes, fees, and the minimum you receive before your wallet signs on XAUConnect.",
    sections: [
      {
        heading: "Trading ETH on Ethereum",
        body: "Watch your slippage tolerance on thin pools before you size the clip.",
      },
    ],
    faqs: [{ question: "How?", answer: "Connect a wallet and compare the route." }],
    relatedPaths: [],
    keywords: [],
  };

  const stats = applyRankingSystem([guide, supporter]);
  if (!supporter.sections[0]?.body.includes("](/learn/guides/how-to-set-slippage-tolerance)")) {
    throw new Error(`topical link missing: ${supporter.sections[0]?.body}`);
  }
  if (stats.contextualLinks < 1) throw new Error("expected a contextual link");
  if (!openingHasQuery(guide.intro, "How to set slippage tolerance")) {
    throw new Error("guide opening lost its query");
  }

  const bare: SeoPageConfig = {
    ...guide,
    id: "bare",
    path: "/learn/guides/how-to-launch-a-token-on-xauconnect",
    h1: "How to launch a token on XAUConnect",
    title: "How to launch a token on XAUConnect | XAUConnect",
    intro:
      "XAUConnect’s launchpad is for teams that want a public, non-custodial listing surface next to the same swap aggregator traders already use.",
    sections: [{ heading: "Liquidity is the product", body: "A launch without locked liquidity is hard to trust." }],
    faqs: [{ question: "Does XAUConnect endorse launches?", answer: "No. Listing is tooling." }],
  };
  applyRankingSystem([bare]);
  if (!bare.intro.startsWith("How to launch a token on XAUConnect. XAUConnect")) {
    throw new Error(`opening was rewritten: ${bare.intro.slice(0, 120)}`);
  }
  if (!bare.citationSnippet?.includes("launchpad is for teams")) {
    throw new Error(`citation dropped the article: ${bare.citationSnippet}`);
  }
}
