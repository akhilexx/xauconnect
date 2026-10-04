import type { SeoPageConfig } from "./types.js";
import { getChainByKey } from "@xauconnect/utils";
import { applyRichContent } from "./content-engine.js";

export type SeoRelatedLink = {
  path: string;
  title: string;
  description: string;
  category: "token" | "article" | "chain" | "guide" | "pair" | "hub";
};

export interface EnrichContext {
  /** swap-token pages grouped by chainKey (top 12 per chain) */
  topTokensByChain: Map<string, SeoPageConfig[]>;
  learnArticles: SeoPageConfig[];
  guides: SeoPageConfig[];
  chainHubs: SeoPageConfig[];
}

function pick<T>(arr: T[], n: number, seed: number): T[] {
  if (arr.length <= n) return [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[(seed + i * 7) % arr.length]!);
  return out;
}

export function buildRelatedLinks(page: SeoPageConfig, ctx: EnrichContext): SeoRelatedLink[] {
  const links: SeoRelatedLink[] = [];
  const seed = page.id.length;

  if (page.chainKey) {
    const hub = ctx.chainHubs.find((p) => p.chainKey === page.chainKey);
    if (hub) {
      links.push({
        path: hub.path,
        title: `Trade on ${getChainByKey(page.chainKey)?.name ?? page.chainKey}`,
        description: "Chain overview, routing, and network-specific guides.",
        category: "chain",
      });
    }
    const tokens = ctx.topTokensByChain.get(page.chainKey) ?? [];
    for (const t of pick(tokens.filter((p) => p.path !== page.path), 4, seed)) {
      links.push({
        path: t.path,
        title: t.tokenSymbol ? `Swap ${t.tokenSymbol}` : t.h1,
        description: t.description.slice(0, 120),
        category: "token",
      });
    }
  }

  if (page.fromChainKey && page.toChainKey) {
    links.push({
      path: `/cross-chain/${page.fromChainKey}/${page.toChainKey}`,
      title: "Cross-chain routes",
      description: "Browse bridge and swap paths between these networks.",
      category: "hub",
    });
  }

  for (const g of pick(ctx.guides, 2, seed)) {
    if (g.path === page.path) continue;
    links.push({
      path: g.path,
      title: g.h1,
      description: g.description.slice(0, 120),
      category: "guide",
    });
  }

  for (const a of pick(ctx.learnArticles, 3, seed + 3)) {
    if (a.path === page.path) continue;
    links.push({
      path: a.path,
      title: a.h1,
      description: a.description.slice(0, 120),
      category: "article",
    });
  }

  if (page.chainKey && page.tokenSlug) {
    links.push({
      path: `/pairs/${page.chainKey}`,
      title: "Popular trading pairs",
      description: "Browse liquid pairs on this network.",
      category: "pair",
    });
  }

  links.push({
    path: "/learn",
    title: "Learn library",
    description: "Hand-authored guides on routing, fees, wallets, and self-custody.",
    category: "hub",
  });

  links.push({
    path: "/discover",
    title: "Discover live markets",
    description: "Charts, launches, and indexed pools across seven networks.",
    category: "hub",
  });

  const seen = new Set<string>();
  return links
    .filter((l) => {
      if (l.path === page.path || seen.has(l.path)) return false;
      seen.add(l.path);
      return true;
    })
    .slice(0, 10);
}

export function enrichPage(page: SeoPageConfig, ctx: EnrichContext): void {
  applyRichContent(page);
  page.relatedLinks = buildRelatedLinks(page, ctx);
  page.relatedPaths = page.relatedLinks.map((l) => l.path);
  page.enriched = true;
}

export function buildEnrichContext(pages: SeoPageConfig[]): EnrichContext {
  const topTokensByChain = new Map<string, SeoPageConfig[]>();
  for (const p of pages) {
    if (p.kind !== "swap-token" || !p.chainKey) continue;
    const list = topTokensByChain.get(p.chainKey) ?? [];
    if (list.length < 16) list.push(p);
    topTokensByChain.set(p.chainKey, list);
  }
  return {
    topTokensByChain,
    learnArticles: pages.filter((p) => p.kind === "learn").slice(0, 80),
    guides: pages.filter((p) => p.kind === "guide"),
    chainHubs: pages.filter((p) => p.kind === "chain"),
  };
}

export function enrichAllPages(pages: SeoPageConfig[]): void {
  const ctx = buildEnrichContext(pages);
  for (const page of pages) {
    enrichPage(page, ctx);
  }
}
