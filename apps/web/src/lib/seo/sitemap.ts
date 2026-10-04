import { getAllSeoPages } from "@/lib/seo/pages";
import { SITE_URL } from "@xauconnect/seo";

export function sitemapEntriesForKinds(kinds: string[]): { url: string; lastModified?: Date }[] {
  return getAllSeoPages()
    .filter((p) => kinds.includes(p.kind) && !p.noindex)
    .map((p) => ({
      url: `${SITE_URL}${p.path}`,
      lastModified: new Date(),
    }));
}

export function sitemapXml(entries: { url: string; lastModified?: Date }[]): string {
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${escapeXml(e.url)}</loc>${e.lastModified ? `\n    <lastmod>${e.lastModified.toISOString()}</lastmod>` : ""}
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sitemapIndexXml(childNames: string[]): string {
  const entries = childNames
    .map(
      (name) => `  <sitemap>
    <loc>${SITE_URL}/sitemaps/${name}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}
