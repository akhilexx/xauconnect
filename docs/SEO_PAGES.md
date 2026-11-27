# XAUConnect search and discovery runbook

## Where the content comes from

The Next.js server renders the Learn library, network hubs, guides and route pages in the same SiteShell as the app. Articles, source links and network directories must be readable in the server HTML. A wallet connection is unnecessary for reading.

- Edit the researched articles in `packages/seo/src/editorial-library.ts`. Reuse an existing canonical URL when the reader's question is the same. Each entry contains the actual prose, section headings, FAQs, checked sources and a date of substantive change. A first publication date is optional; do not invent one for an existing page.
- The generator merges these entries into the Learn catalog before generic enrichment. Authored paragraphs and sources are preserved; optional LLM enrichment skips the library. Article metadata, visible attribution and sitemap dates use the same data.
- Other articles live in `packages/seo/src/learn-content*.ts`. Entity pages are built from the token catalog and route registry. The network hubs group available route pages by destination. These are routes for which a user may request a quote, not a live liquidity or fulfilment guarantee.
- The generated registry under `packages/seo/registry/*.json` is ignored by Git and included in the release package. The XML index and seven child sitemaps in `apps/web/public` are generated and tracked. Use an official public HTTPS domain for production canonicals.
- Developer pages and blog posts own their canonical, title and description. Do not put a landing-page canonical in a nested layout: Next will otherwise inherit it on child pages.

## Generate and release

For an editorial change with an established token catalog:

```sh
pnpm seo:articles
pnpm seo:build:full
```

On a fresh checkout without a token catalog, or to intentionally update the asset universe, use `pnpm seo:generate` first. The editorial command reuses the current catalog and its original market snapshot dates. Review changes to URL inventory before shipping a new catalog. The full build prerenders the registry; a fast app build is insufficient for an editorial release.

The existing production release command is `./scripts/deploy.sh --seo` after generation. It uploads the build and runs the repository's remote release procedure. Verify representative **public HTTPS URLs** and the sitemap after release before asking a search engine to crawl them. Use URL Inspection on changed canonical articles, a developer child and a route reached from a chain hub. Leave private pages private and intentionally removed URLs gone; redirect only when there is a relevant replacement.

## Current editorial and technical decisions

1. **Start with demonstrated questions.** Read Search Console’s Pages and Queries together. A page with impressions and no clicks at position 70 has a visibility and intent problem; changing punctuation in the title is not a sufficient diagnosis. Separate native assets from wrappers, same-chain swaps from bridges, and estimates from settlement. Label worked numbers as examples.
2. **Give evidence for consequential claims.** Match product behavior to the current wizard, public API and chain documentation. Explain how to check a receipt. Identify the publisher and sources; distinguish AI assistance from human review. A real change in fees, product behavior or guidance merits a date change. Regenerating a site does not.
3. **Publish one useful answer per intent.** Keep coherent plain-text paragraphs, informative headings and ordinary internal links. There is no required word count or exact-match opening for Google AI. Avoid automatic questions, keyword variants and fabricated freshness. Unused classifications or a schema type do not qualify a URL for ranking.
4. **Keep signals consistent.** Robots rules permit public pages to Googlebot and search assistants, including OAI-SearchBot under the wildcard group. API and admin paths retain crawl exclusions. Training agents have distinct controls: do not change training permissions as a search tactic. The index sitemap points to canonical, indexable URLs. Pages without a reliable modification date omit lastmod.
5. **Choose the image that represents the page.** When a relevant editorial illustration exists, use it in the article, Open Graph and Article markup. Current editorial figures are 1280 × 720. Large previews are allowed on indexable registry pages. Eligibility for Discover does not guarantee distribution.
6. **Measure each surface separately.** Compare Web clicks, impressions, CTR and position for edited URLs. Use Search Console’s **Generative AI features** report for Google AI impressions. Discover is a separate feed and has its own reporting threshold. For Bing/Copilot, use Bing Webmaster Tools’ AI Performance when available; for ChatGPT, use identifiable referral traffic as a partial measure. None of these counts imply coverage on the others.

## Official guidance consulted on 27 November 2026

- [Google Search documentation changelog](https://developers.google.com/search/updates): November 24 ranking, AI controls and attribution updates.
- [Google: attribution and factuality](https://developers.google.com/search/docs/fundamentals/gen-ai-attribution-factuality) and [AI controls](https://developers.google.com/search/docs/fundamentals/gen-ai-controls): indexed, snippet-eligible pages and the property's generative AI inclusion setting matter. Clear claims and sourcing support accurate attribution.
- [Google: optimizing for generative AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [spam policies](https://developers.google.com/search/docs/essentials/spam-policies): focus on useful, distinctive content. Adding schema, an AI text file or more URL permutations is not a substitute.
- [Google: Discover](https://developers.google.com/search/docs/appearance/google-discover): descriptive titles and relevant large images; avoid generic logos, clickbait and exaggerated promises. An indexed page can qualify without a special tag.
- [Google: sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) and [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): list preferred URLs; use accurate lastmod when known; keep links, redirects, sitemap and canonical aligned.
- [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots) and [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/): crawler access, referral traffic and reported citations are different things.

## After shipping

Record the release date and changed URLs. After the next crawl, compare user-declared and Google-selected canonicals using URL Inspection. At roughly 7 and 28 days check the edited cohort and compare equivalent windows, country, device and search type. Distinguish previously indexed URLs from the two new guides. Keep a separate record of intentionally retired pages; a falling total of 404s is not the goal. Expand a topic only when query or support evidence identifies a question the current page does not answer.
