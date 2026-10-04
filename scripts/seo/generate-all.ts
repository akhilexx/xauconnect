#!/usr/bin/env tsx
/**
 * SEO pipeline orchestrator — runs all generators in order.
 */
import { loadEnv, log } from "./lib/env.js";
import { fetchTokenCatalog } from "./fetch-token-catalog.js";
import { generateLearnEntries } from "./generate-learn-pages.js";
import { syncSlugRegistry } from "./sync-slug-registry.js";
import { enrichAllPagesLocal } from "./enrich-all-pages.js";
import { llmEnrichTopPages } from "./llm-enrich-top-pages.js";
import { generateStaticSitemaps } from "./generate-static-sitemaps.js";
import { validateSeoContent } from "./validate-seo-content.js";
import { loadPages, buildManifest } from "@xauconnect/seo";

/** Sanity floor — real curated pages, not a 25k doorway target. */
const MIN_PAGES = 150;

async function main(): Promise<void> {
  loadEnv();
  log("generate-all", "starting");

  const catalog = await fetchTokenCatalog();
  generateLearnEntries();
  await syncSlugRegistry(catalog);
  enrichAllPagesLocal();
  validateSeoContent();
  if (process.env.SEO_LLM === "1") {
    await llmEnrichTopPages();
  } else {
    log("generate-all", "skipped LLM enrich (set SEO_LLM=1 + OPENAI_API_KEY to enable)");
  }
  generateStaticSitemaps();

  const pages = loadPages();
  const manifest = buildManifest(pages);

  if (manifest.pageCount < MIN_PAGES) {
    console.error(`[seo] ERROR: page count ${manifest.pageCount} < ${MIN_PAGES}`);
    process.exit(1);
  }

  log("generate-all", `complete — ${manifest.pageCount} pages`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
