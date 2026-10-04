/**
 * Ensures each indexable article has a unique title, h1, and meta description
 * so Google treats pages as distinct documents rather than duplicates.
 */
import { BRAND_NAME } from "@xauconnect/utils";
import type { SeoPageConfig } from "./types.js";
import type { RichContent } from "./content-expand.js";
import { chainFacts, hashSeed, pickVariant } from "./content-blocks.js";

function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max - 1)}…`;
}

function routeLabel(page: SeoPageConfig): string | null {
  if (!page.fromChainKey || !page.toChainKey) return null;
  const from = chainFacts(page.fromChainKey);
  const to = chainFacts(page.toChainKey);
  return `${from.name} to ${to.name}`;
}

function h1MentionsChain(h1: string, chainName: string): boolean {
  return h1.toLowerCase().includes(chainName.toLowerCase());
}

function tokenPairLabel(page: SeoPageConfig): string | null {
  const slug = page.slug ?? page.path.split("/").pop() ?? "";
  const pair = slug.match(/-([a-z0-9]{2,12})-([a-z0-9]{2,12})$/i);
  if (pair) {
    return `${pair[1]!.toUpperCase()} → ${pair[2]!.toUpperCase()}`;
  }
  return page.tokenSymbol ? page.tokenSymbol.toUpperCase() : null;
}

function h1IncludesPair(h1: string, pair: string): boolean {
  const lower = h1.toLowerCase();
  const [a, b] = pair.split("→").map((s) => s.trim().toLowerCase());
  return Boolean(a && b && lower.includes(a) && lower.includes(b));
}

export function uniqueH1(page: SeoPageConfig): string {
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;

  if (page.kind === "cross-chain-search" && page.fromChainKey && page.toChainKey) {
    const from = chainFacts(page.fromChainKey);
    const to = chainFacts(page.toChainKey);
    const hasFullRoute =
      h1MentionsChain(page.h1, from.name) && h1MentionsChain(page.h1, to.name);
    let h = hasFullRoute ? page.h1 : `${page.h1}: ${from.name} to ${to.name}`;
    const pair = tokenPairLabel(page);
    if (pair && !h1IncludesPair(h, pair)) {
      h = `${h} (${pair})`;
    }
    return h;
  }

  if (page.kind === "search" && chain && !h1MentionsChain(page.h1, chain.name)) {
    if (page.tokenSymbol && !page.h1.toLowerCase().includes(page.tokenSymbol.toLowerCase())) {
      return `${page.h1} on ${chain.name}`;
    }
    if (!page.h1.toLowerCase().includes("multi-chain") && !page.h1.toLowerCase().includes("cross chain")) {
      return `${page.h1} on ${chain.name}`;
    }
  }

  if (page.kind === "learn" && chain && !h1MentionsChain(page.h1, chain.name)) {
    return `${page.h1} on ${chain.name}`;
  }

  if (page.kind === "learn" && page.slug?.includes("-guide") && !page.h1.toLowerCase().includes("overview")) {
    return `${page.h1} — overview`;
  }

  return page.h1;
}

export function uniqueTitle(page: SeoPageConfig, h1: string): string {
  return `${h1} | ${BRAND_NAME}`;
}

export function buildUniqueDescription(page: SeoPageConfig, base: string): string {
  const seed = hashSeed(`${page.id}:desc`);
  const chain = page.chainKey ? chainFacts(page.chainKey) : null;
  const route = routeLabel(page);
  const parts: string[] = [base.replace(/\s+/g, " ").trim()];

  if (route && page.kind === "cross-chain-search") {
    parts.push(`Route: ${route}.`);
  } else if (chain && page.kind === "search") {
    parts.push(`${chain.name} DEX routes.`);
  } else if (chain && page.kind === "learn") {
    parts.push(`Guide for ${chain.name} traders.`);
  }

  if (page.tokenSymbol && !base.includes(page.tokenSymbol)) {
    parts.push(`${page.tokenSymbol} swaps.`);
  }

  parts.push(
    pickVariant(
      [
        "Non-custodial execution.",
        "Transparent fees and slippage control.",
        "Compare live routes before signing.",
        "Wallet-signed swaps on XAUConnect.",
      ],
      seed,
      1,
    ),
  );

  const merged = parts.join(" ");
  return clampDescription(merged.includes(BRAND_NAME) ? merged : `${merged} ${BRAND_NAME}.`);
}

/** Apply unique h1, title, description after content generation. */
export function applyIndexingMetadata(page: SeoPageConfig, content: RichContent): void {
  const h1 = uniqueH1(page);
  page.h1 = h1;
  page.title = uniqueTitle(page, h1);
  page.description = buildUniqueDescription(page, content.description || page.description);

  const extras = new Set(page.keywords.map((k) => k.toLowerCase()));
  if (page.fromChainKey) extras.add(page.fromChainKey);
  if (page.toChainKey) extras.add(page.toChainKey);
  if (page.chainKey) extras.add(page.chainKey);
  if (page.tokenSymbol) extras.add(page.tokenSymbol.toLowerCase());
  extras.add(page.slug ?? page.path.split("/").pop() ?? "");
  page.keywords = [...extras].filter(Boolean).slice(0, 12);

  if (page.kind === "cross-chain-search" && page.fromChainKey && page.toChainKey) {
    const route = routeLabel(page)!;
    page.eyebrow = `Cross-chain · ${route}`;
  }
}
