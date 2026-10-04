/**
 * Validate SEO registry content quality — word counts and duplicate intros.
 */
import { loadPages } from "../../packages/seo/src/registry.ts";
import { MIN_BODY_WORDS } from "../../packages/seo/src/content-expand.ts";
import { wordCount } from "../../packages/seo/src/content-blocks.ts";
import { log } from "./lib/env.js";

export function validateSeoContent(): void {
  const pages = loadPages();
  if (!pages.length) {
    log("validate-seo", "no pages");
    return;
  }

  let belowMin = 0;
  let aboveMax = 0;
  const introCounts = new Map<string, number>();
  let dupIntros = 0;
  const banned = [
    /search engines?\s+surface/i,
    /high-intent search/i,
    /you searched for/i,
    /indexed for/i,
    /this url/i,
    /search intent/i,
    /X-Client-Id/i,
    /POST \/swap\/record/i,
    /·\s*\w+\s*·/,
  ];
  let bannedHits = 0;

  for (const page of pages) {
    const body = [page.intro, ...page.sections.map((s) => s.body)].join(" ");
    const words = wordCount(body);
    if (words < MIN_BODY_WORDS) belowMin++;
    if (words > 750) aboveMax++;

    if (banned.some((re) => re.test(body))) bannedHits++;

    const introKey = page.intro.slice(0, 100);
    const prev = introCounts.get(introKey) ?? 0;
    if (prev > 0) dupIntros++;
    introCounts.set(introKey, prev + 1);
  }

  const dupRate = ((dupIntros / pages.length) * 100).toFixed(1);
  log("validate-seo", `${pages.length} pages`);
  log("validate-seo", `<${MIN_BODY_WORDS} words: ${belowMin} | >750 words: ${aboveMax}`);
  log("validate-seo", `duplicate intro prefixes: ${dupIntros} (${dupRate}%)`);
  log("validate-seo", `banned SEO/meta phrases: ${bannedHits}`);

  if (belowMin > 0) {
    console.error(`FAIL: ${belowMin} pages below ${MIN_BODY_WORDS} words — re-run pnpm seo:enrich`);
    process.exit(1);
  }
  if (bannedHits > 0) {
    console.error(`FAIL: ${bannedHits} pages contain SEO meta-commentary — fix content engine`);
    process.exit(1);
  }

  const articleKinds = new Set(["learn", "guide"]);
  const articles = pages.filter((p) => articleKinds.has(p.kind));
  for (const field of ["title", "h1", "description"] as const) {
    const counts = new Map<string, number>();
    let dupPages = 0;
    for (const p of articles) {
      const v = p[field];
      if (counts.has(v)) dupPages++;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    const unique = counts.size;
    log("validate-seo", `articles ${field}: ${unique}/${articles.length} unique (${dupPages} dup pages)`);
    if (dupPages > 0) {
      const worst = [...counts.entries()]
        .filter(([, c]) => c > 1)
        .sort((a, b) => b[1] - a[1])[0];
      console.error(`FAIL: duplicate article ${field} — ${worst?.[1]} pages share "${worst?.[0]?.slice(0, 80)}"`);
      process.exit(1);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  validateSeoContent();
}
