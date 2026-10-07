#!/usr/bin/env bash
# Post-deploy SEO publish: Cloudflare cache purge + IndexNow ping.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-cloudflare-env.sh
source "$ROOT/scripts/load-cloudflare-env.sh"

SITE="${NEXT_PUBLIC_APP_URL:-https://xauconnect.com}"
# shellcheck source=scripts/load-deploy-env.sh
source "$ROOT/scripts/load-deploy-env.sh"
load_deploy_env "$ROOT"
DOMAIN="${SITE#https://}"
DOMAIN="${DOMAIN%%/*}"

echo "==> SEO publish for $SITE"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  if resolve_cloudflare_zone_id "$DOMAIN"; then
    echo "==> Cloudflare purge (zone ${CLOUDFLARE_ZONE_ID})"
    PURGE_RESULT="$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}')"
    echo "$PURGE_RESULT" | node -e "
      const j=JSON.parse(require('fs').readFileSync(0,'utf8'));
      if(j.success) console.log('Cloudflare purge OK');
      else console.error('Cloudflare purge failed:', JSON.stringify(j.errors||j));
      process.exit(j.success?0:1);
    "
  else
    echo "WARN: Could not resolve Cloudflare zone for ${DOMAIN}."
    echo "      Add the domain to account ${CLOUDFLARE_ACCOUNT_ID:-unknown} or set CLOUDFLARE_ZONE_ID in .local/cloudflare.env"
    exit 1
  fi
else
  echo "==> Cloudflare purge skipped — set CLOUDFLARE_API_TOKEN in .local/cloudflare.env"
fi

INDEXNOW_KEY="${INDEXNOW_KEY:-xauconnect-seo-key}"
SITEMAP_URL="${SITE}/sitemap.xml"
echo "==> IndexNow ping"
INDEXNOW_BODY="$(node --input-type=module -e "
  import { readFileSync } from 'node:fs';
  const root = process.argv[1];
  const files = ['core','learn','chains','swap'].map((n) => root + '/apps/web/public/sitemaps/' + n + '.xml');
  const locs = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/<loc>([^<]+)<\\/loc>/g)) locs.push(match[1]);
  }
  const urlList = [...new Set(locs)].slice(0, 200);
  process.stdout.write(JSON.stringify({ host: process.argv[2], key: process.argv[3], urlList }));
" "$ROOT" "$DOMAIN" "$INDEXNOW_KEY")"
curl -s -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  --data "$INDEXNOW_BODY" \
  || echo "IndexNow ping failed (non-fatal)"

echo "==> verify sitemap index"
curl -s -o /dev/null -w "sitemap.xml -> %{http_code}\n" "${SITE}/sitemap.xml" || true
if [[ -n "${XAU_DEPLOY_HOST:-}" ]]; then
  curl -s -o /dev/null -w "sitemap.xml (via origin) -> %{http_code}\n" "http://${XAU_DEPLOY_HOST}/sitemap.xml" || true
fi

echo "==> seo-publish complete"
