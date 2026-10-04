# XAUConnect SEO Pages — Operator Runbook

## Overview

Curated statically generated marketing pages (quality over volume) powered by:

- **Registry:** `packages/seo/registry/pages.json` (generated, gitignored, shipped in deploy tarball)
- **Static sitemaps:** `apps/web/public/sitemap.xml` + `apps/web/public/sitemaps/*.xml`
- **Prerendered HTML:** `apps/web/.next/server/app/**/*.html` (uploaded with each deploy)
- **Codegen:** `pnpm seo:generate` (only when registry missing or `SEO_REFRESH=1`)
- **Deploy:** `./scripts/deploy.sh` (fast) or `./scripts/deploy.sh --seo` (full prerender) → upload → CF purge on `--seo` only

Google’s 2024–2026 spam policies treat **scaled / doorway / keyword-stuffed pages** as site-wide risk. Do **not** regenerate tens of thousands of near-duplicate URLs. Grow the **hand-authored Learn/Guide library** (swap, multi-chain, token creation) and deepen **real entity pages** (tokens, pairs, cross-chain routes). Do **not** regenerate tens of thousands of near-duplicate URLs.

## Page kinds (current pipeline)

| Route | Kind | Role |
|-------|------|------|
| `/learn`, `/learn/guides` | hubs | Browseable library (CollectionPage) |
| `/learn/[slug]` | `learn` | Hand-authored explainers |
| `/learn/guides/[slug]` | `guide` | Hand-authored HowTo guides |
| `/search/[slug]` | `search` | Curated AEO answers; **canonical to Learn** when they overlap |
| `/cross-chain/...` | `cross-chain-swap` | Liquid major routes only |
| `/swap/...`, `/pairs/...`, hubs | entity pages | Real tokens/chains |

Retired doorway kinds (`buy`, `sell`, `token-deep`, `cross-chain-search`) 301 away in `next.config.mjs`.

## Commands

```bash
pnpm seo:generate          # Force regenerate registry + sitemaps
SEO_REFRESH=1 ./scripts/deploy.sh --seo   # required after Learn/content changes
./scripts/deploy.sh          # fast deploy (app JS) — does not refresh SEO HTML
./scripts/seo-publish.sh   # Cloudflare purge + IndexNow only
```

After every Learn/content change you **must** use `--seo` (and `SEO_REFRESH=1` if seeds/registry changed). Fast deploys leave prerendered HTML and sitemap `lastmod` stale.

## Google / AEO notes

- AI Overviews cite **indexed, snippet-eligible** pages. Schema does not unlock them.
- Do not stuff “Medium” / “Reddit” into titles or keywords (keyword stuffing + inauthentic mentions).
- Submit `https://xauconnect.com/sitemap.xml` in Search Console after deploy; request indexing on `/learn` and new guides.
- Private GitHub does not pass crawlable E-E-A-T. Prefer a public contracts/docs repo.

## Verification

```bash
node -e "console.log(require('./packages/seo/registry/manifest.json').pageCount)"
find apps/web/.next/server/app -name '*.html' | wc -l
curl -s https://xauconnect.com/sitemap.xml | head
curl -s -o /dev/null -w '%{http_code}\n' https://xauconnect.com/learn
```
