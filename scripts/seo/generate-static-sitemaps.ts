/**
 * Write static sitemap XML files to apps/web/public for reliable serving.
 */
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPages, SITE_URL, type SeoPageConfig } from "@xauconnect/seo";
import { BLOG_POSTS } from "../../apps/web/src/lib/developers/blog-posts.js";
import { log } from "./lib/env.js";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "../../apps/web/public");
const SITEMAP_DIR = join(PUBLIC, "sitemaps");
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlsetXml(entries: Array<{ path: string; lastmod?: string }>): string {
  const urls = entries
    .map(({ path, lastmod }) => {
      return `  <url>
    <loc>${escapeXml(`${SITE_URL}${path}`)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ""}
  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function indexXml(names: string[]): string {
  const entries = names
    .map(
      (name) => `  <sitemap>
    <loc>${escapeXml(`${SITE_URL}/sitemaps/${name}.xml`)}</loc>
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

export function generateStaticSitemaps(): void {
  const pages = loadPages();
  if (!pages.length) throw new Error("Cannot publish sitemaps with an empty registry");
  const modified = new Map(pages.map(p => [p.path, p.editorial?.modified]));
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
      "/developers/gold-curve",
      "/developers/api/authentication",
      "/developers/api/cross-chain",
      "/developers/api/solana",
      "/developers/api/swap",
      "/developers/api/tracking",
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
      ...BLOG_POSTS.map(post => `/developers/blog/${post.slug}`),
    ],
  };

  for (const [name, paths] of Object.entries(groups)) {
    const entries = paths.map((path) => ({ path, lastmod: modified.get(path) }));
    writeFileSync(join(SITEMAP_DIR, `${name}.xml`), urlsetXml(entries) + "\n", "utf8");
    log("sitemap file", `${name}.xml (${paths.length} urls)`);
  }

  writeFileSync(join(PUBLIC, "sitemap.xml"), indexXml(Object.keys(groups)) + "\n", "utf8");

  const keep = new Set(Object.keys(groups).map((name) => `${name}.xml`));
  for (const file of readdirSync(SITEMAP_DIR)) {
    if (file.endsWith(".xml") && !keep.has(file)) {
      unlinkSync(join(SITEMAP_DIR, file));
      log("sitemap prune", file);
    }
  }

  const robots = `User-agent: *
Allow: /
Disallow: /xaxmd5/
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;
  writeFileSync(join(PUBLIC, "robots.txt"), robots, "utf8");
  log("static sitemaps", "written to apps/web/public");
}

if (process.argv[1]?.includes("generate-static-sitemaps")) {
  generateStaticSitemaps();
}
