/**
 * Write static sitemap XML files to apps/web/public for reliable serving.
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPages, SITE_URL, type SeoPageConfig } from "@xauconnect/seo";
import { log } from "./lib/env.js";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "../../apps/web/public");
const SITEMAP_DIR = join(PUBLIC, "sitemaps");
const REGISTRY_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../packages/seo/registry");

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function registryLastMod(): string {
  const manifestPath = join(REGISTRY_DIR, "manifest.json");
  if (existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { generatedAt?: string };
      if (manifest.generatedAt) return manifest.generatedAt.slice(0, 10);
    } catch {
      /* fall through */
    }
  }
  return new Date().toISOString().slice(0, 10);
}

function urlsetXml(entries: Array<{ path: string; lastmod?: string }>, defaultLastmod: string): string {
  const urls = entries
    .map(({ path, lastmod }) => {
      const mod = lastmod ?? defaultLastmod;
      return `  <url>
    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>
    <lastmod>${escapeXml(mod)}</lastmod>
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function indexXml(names: string[], lastmod: string): string {
  const entries = names
    .map(
      (name) => `  <sitemap>
    <loc>${escapeXml(`${SITE_URL}/sitemaps/${name}.xml`)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

/** Skip alternate URLs that canonicalize elsewhere; keep pages whose canonical is themselves. */
function isSitemapUrl(p: SeoPageConfig): boolean {
  if (p.noindex) return false;
  if (!p.canonicalPath) return true;
  return p.canonicalPath === p.path;
}

function pathsForKinds(pages: SeoPageConfig[], kinds: string[]): string[] {
  return pages.filter((p) => kinds.includes(p.kind) && isSitemapUrl(p)).map((p) => p.path);
}

const DEV_BLOG_SLUGS = [
  "introducing-swap-api-for-ai-agents",
  "autonomous-trading-bot",
  "cross-chain-ethereum-solana",
  "rate-limits-best-practices",
  "non-custodial-execution",
  "how-we-rank-swap-routes",
];

export function generateStaticSitemaps(): void {
  const pages = loadPages();
  const lastmod = registryLastMod();
  mkdirSync(SITEMAP_DIR, { recursive: true });

  const groups: Record<string, string[]> = {
    chains: pathsForKinds(pages, ["chain", "swap-hub", "launch", "discover", "trade"]),
    swap: pathsForKinds(pages, ["swap-token", "pair"]),
    "cross-chain": pathsForKinds(pages, ["cross-chain-swap"]),
    meme: pathsForKinds(pages, ["meme-hub", "meme-token"]),
    learn: ["/learn", "/learn/guides", ...pathsForKinds(pages, ["learn", "guide"])],
    search: pathsForKinds(pages, ["search"]),
    core: [
      "/",
      "/swap",
      "/buy-crypto",
      "/sell-crypto",
      "/discover",
      "/launchpad",
      "/liquidity",
      "/wallet",
      "/learn",
      "/learn/guides",
      "/developers",
      "/developers/quickstart",
      "/developers/api",
      "/developers/blog",
      "/developers/changelog",
      "/developers/examples",
      "/developers/sdks",
      "/about",
      "/terms",
      "/privacy",
      ...DEV_BLOG_SLUGS.map((slug) => `/developers/blog/${slug}`),
    ],
  };

  for (const [name, paths] of Object.entries(groups)) {
    const entries = paths.map((path) => ({ path, lastmod }));
    writeFileSync(join(SITEMAP_DIR, `${name}.xml`), urlsetXml(entries, lastmod) + "\n", "utf8");
    log("sitemap file", `${name}.xml (${paths.length} urls)`);
  }

  writeFileSync(join(PUBLIC, "sitemap.xml"), indexXml(Object.keys(groups), lastmod) + "\n", "utf8");

  const robots = `User-agent: *
Allow: /
Disallow: /xaxmd5/
Disallow: /api/

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/sitemaps/chains.xml
Sitemap: ${SITE_URL}/sitemaps/swap.xml
Sitemap: ${SITE_URL}/sitemaps/cross-chain.xml
Sitemap: ${SITE_URL}/sitemaps/meme.xml
Sitemap: ${SITE_URL}/sitemaps/learn.xml
Sitemap: ${SITE_URL}/sitemaps/search.xml
Sitemap: ${SITE_URL}/sitemaps/core.xml
`;
  writeFileSync(join(PUBLIC, "robots.txt"), robots, "utf8");
  log("static sitemaps", "written to apps/web/public");
}

if (process.argv[1]?.includes("generate-static-sitemaps")) {
  generateStaticSitemaps();
}
