#!/usr/bin/env bash
# SEO build modes:
#   --fast (default)  typecheck + next build without re-prerendering 15k SEO pages;
#                     reuses existing HTML from apps/web/.next/server/app/(seo) + token/
#   --full            regenerate registry (if needed) + full SSG with SEO_BUILD=1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Minimum acceptable page count. The SEO catalog was rebuilt from ~25k spun
# pages down to a curated set of genuinely-authored pages, so the old 20k floor
# no longer applies. This guards against an empty/broken registry, not volume.
MIN_PAGES="${SEO_MIN_PAGES:-500}"

MODE="fast"
if [[ "${1:-}" == "--full" ]] || [[ "${SEO_DEPLOY:-}" == "full" ]]; then
  MODE="full"
fi

MANIFEST="$ROOT/packages/seo/registry/manifest.json"
PAGE_COUNT=0
if [[ -f "$MANIFEST" ]]; then
  PAGE_COUNT="$(node -e "const m=require(process.argv[1]); console.log(m.pageCount||0)" "$MANIFEST" 2>/dev/null || echo 0)"
fi

count_prerendered_html() {
  find "$ROOT/apps/web/.next/server/app" -name '*.html' 2>/dev/null | wc -l | tr -d ' '
}

run_fast_build() {
  if [[ ! -f "$MANIFEST" ]] || [[ "$PAGE_COUNT" -lt "$MIN_PAGES" ]]; then
    echo "ERROR: SEO registry missing or below ${MIN_PAGES} pages. Run ./scripts/deploy.sh --seo first."
    exit 1
  fi

  echo "==> SEO registry cached: ${PAGE_COUNT} pages (set SEO_REFRESH=1 with --seo to regenerate)"

  if [[ ! -f "$ROOT/apps/web/public/sitemap.xml" ]]; then
    echo "==> static sitemaps missing — generating from registry"
    tsx "$ROOT/scripts/seo/generate-static-sitemaps.ts" 2>/dev/null || \
      node --import tsx "$ROOT/scripts/seo/generate-static-sitemaps.ts"
  fi

  echo "==> fast web build (no SEO prerender — requires existing HTML in .next)"
  pnpm --filter @xauconnect/web build

  local html_count
  html_count="$(count_prerendered_html)"
  echo "==> prerendered HTML files in .next: ${html_count}"
  if [[ "$html_count" -lt "$MIN_PAGES" ]]; then
    echo "ERROR: fast deploy would ship ${html_count} prerendered pages (need ${MIN_PAGES}+)."
    echo "       SEO HTML must match the current JS chunk hashes."
    echo "       Run: ./scripts/deploy.sh --seo"
    exit 1
  fi
}

run_full_build() {
  local need_generate=0
  if [[ "${SEO_REFRESH:-0}" == "1" ]]; then
    need_generate=1
    echo "==> SEO_REFRESH=1 — regenerating registry + sitemaps"
  elif [[ ! -f "$MANIFEST" ]] || [[ "$PAGE_COUNT" -lt "$MIN_PAGES" ]]; then
    need_generate=1
    echo "==> SEO registry missing or below ${MIN_PAGES} pages — running generate"
  else
    echo "==> SEO registry cached: ${PAGE_COUNT} pages (set SEO_REFRESH=1 to regenerate)"
  fi

  if [[ "$need_generate" == "1" ]]; then
    pnpm seo:generate
    PAGE_COUNT="$(node -e "const m=require('./packages/seo/registry/manifest.json'); console.log(m.pageCount||0)" )"
  fi

  if [[ "$PAGE_COUNT" -lt "$MIN_PAGES" ]]; then
    echo "ERROR: SEO page count ${PAGE_COUNT} < ${MIN_PAGES}"
    exit 1
  fi

  if [[ ! -f "$ROOT/apps/web/public/sitemap.xml" ]]; then
    echo "==> static sitemaps missing — generating from registry"
    tsx "$ROOT/scripts/seo/generate-static-sitemaps.ts" 2>/dev/null || \
      node --import tsx "$ROOT/scripts/seo/generate-static-sitemaps.ts"
  fi

  echo "==> full SEO SSG build (${PAGE_COUNT} pages in registry)"
  SEO_BUILD=1 pnpm --filter @xauconnect/web build

  local html_count
  html_count="$(count_prerendered_html)"
  echo "==> prerendered HTML files in .next: ${html_count}"
  if [[ "$html_count" -lt "$MIN_PAGES" ]]; then
    echo "ERROR: prerendered page count ${html_count} < ${MIN_PAGES}"
    exit 1
  fi
}

if [[ "$MODE" == "full" ]]; then
  run_full_build
else
  run_fast_build
fi
