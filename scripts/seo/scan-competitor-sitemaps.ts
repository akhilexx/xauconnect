/**
 * Competitor sitemap scan — extracts URL slug patterns for learn/article backlog.
 * Does NOT copy content; only topic keywords for gap analysis.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchJson, log } from "./lib/env.js";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../packages/seo/registry/competitor-topics.json");

const SITEMAPS = [
  "https://docs.uniswap.org/sitemap.xml",
  "https://blog.uniswap.org/sitemap.xml",
  "https://1inch.io/sitemap.xml",
  "https://jup.ag/sitemap.xml",
];

interface TopicEntry {
  source: string;
  slug: string;
  title: string;
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function extractUrls(xml: string): string[] {
  const urls: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    urls.push(m[1]!);
  }
  return urls;
}

function urlToTopic(url: string, source: string): TopicEntry | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];
    if (!slug || slug.length < 3 || slug.length > 80) return null;
    if (/\.(xml|json|png|jpg|css|js)$/i.test(slug)) return null;
    return { source, slug: slug.toLowerCase(), title: slugToTitle(slug) };
  } catch {
    return null;
  }
}

export async function scanCompetitorSitemaps(): Promise<TopicEntry[]> {
  const seen = new Set<string>();
  const topics: TopicEntry[] = [];

  for (const sitemapUrl of SITEMAPS) {
    log("scan", sitemapUrl);
    const res = await fetch(sitemapUrl, { headers: { Accept: "application/xml,text/xml,*/*" } });
    if (!res.ok) continue;
    const xml = await res.text();
    const urls = extractUrls(xml);
    const source = new URL(sitemapUrl).hostname;
    for (const url of urls.slice(0, 500)) {
      const topic = urlToTopic(url, source);
      if (!topic || seen.has(topic.slug)) continue;
      seen.add(topic.slug);
      topics.push(topic);
    }
  }

  // Curated DeFi topic seeds (always present)
  const seeds = [
    "how-to-swap-tokens",
    "dex-aggregator-guide",
    "slippage-explained",
    "impermanent-loss",
    "liquidity-pools",
    "meme-coin-trading",
    "cross-chain-swaps",
    "gas-fees-ethereum",
    "wallet-security-defi",
    "token-approval-risks",
    "limit-orders-dex",
    "launchpad-token-creation",
    "usdc-fee-payment",
    "best-dex-arbitrum",
    "solana-jupiter-alternative",
  ];
  for (const slug of seeds) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    topics.push({ source: "xauconnect-seed", slug, title: slugToTitle(slug) });
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(topics, null, 2) + "\n", "utf8");
  log("scan done", `${topics.length} topics`);
  return topics;
}
