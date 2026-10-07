/**
 * Rich article enrichment for all SEO pages (no external API required).
 */
import { loadPages, savePages, buildManifest } from "../../packages/seo/src/registry.ts";
import { enrichAllPages } from "../../packages/seo/src/enrich.ts";
import { log } from "./lib/env.js";

export function enrichAllPagesLocal(): void {
  const pages = loadPages();
  if (!pages.length) {
    log("enrich", "no pages — run sync-slug-registry first");
    return;
  }
  const ranking = enrichAllPages(pages);
  savePages(pages);
  const manifest = buildManifest(pages);
  const enriched = pages.filter((p) => p.enriched).length;
  log("enrich", `${enriched}/${manifest.pageCount} pages enriched with article content`);
  log(
    "enrich",
    `ranking openings=${ranking.openingsAdded} fanout=${ranking.fanOutsAdded} contextualLinks=${ranking.contextualLinks} targets=${ranking.targets}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  enrichAllPagesLocal();
}
