#!/usr/bin/env bash
#
# XAUConnect — direct-to-server deployment (no git pull on the server).
#
#   ./scripts/deploy.sh            # fast: typecheck + web build (no 15k SEO prerender)
#   ./scripts/deploy.sh --seo      # full SEO: regenerate + prerender all ~20k pages
#   ./scripts/deploy.sh --no-build # upload + restart only (web build reused)
#
# Builds the web app locally (build output is platform-independent JS),
# packages the repo (sources + apps/web/.next, minus node_modules/secrets),
# uploads it over SSH, extracts on the host, installs deps, and restarts
# the app services. Server env files are never touched by the upload.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=scripts/load-deploy-env.sh
source "$ROOT/scripts/load-deploy-env.sh"
load_deploy_env "$ROOT"

HOST="${XAU_DEPLOY_HOST:?Set XAU_DEPLOY_HOST in .local/deploy.env}"
USER="${XAU_DEPLOY_USER:?Set XAU_DEPLOY_USER in .local/deploy.env}"
KEY="${XAU_DEPLOY_KEY:-$HOME/.ssh/xauconnect_deploy}"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)

BUILD_MODE="fast"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --no-build) SKIP_BUILD=1 ;;
    --seo) BUILD_MODE="full" ;;
    --fast) BUILD_MODE="fast" ;;
  esac
done

if [[ "$SKIP_BUILD" != "1" ]]; then
  # Bake NEXT_PUBLIC_* web vars into the local build (server .env.production is not used at build time).
  if [[ -f "$ROOT/.local/production.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/.local/production.env"
    set +a
  fi
  if [[ -f "$ROOT/apps/web/.env.production" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/apps/web/.env.production"
    set +a
  fi

  if ! [[ "${NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:-}" =~ ^[a-f0-9]{32}$ ]]; then
    echo "ERROR: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID missing or invalid — mobile WalletConnect will fail."
    echo "       Set it in .local/production.env or apps/web/.env.production (https://cloud.walletconnect.com)"
    exit 1
  fi

  echo "==> typecheck"
  pnpm -w turbo run typecheck --filter='!@xauconnect/contracts'
  echo "==> web build ($BUILD_MODE)"
  chmod +x "$ROOT/scripts/seo-build.sh" "$ROOT/scripts/seo-publish.sh"
  if [[ "$BUILD_MODE" == "full" ]]; then
    "$ROOT/scripts/seo-build.sh" --full
  else
    "$ROOT/scripts/seo-build.sh" --fast
  fi
fi

echo "==> packaging"
TARBALL="$(mktemp -t xauconnect-deploy).tgz"
tar -czf "$TARBALL" \
  --exclude='.git' \
  --exclude='*node_modules*' \
  --exclude='apps/web/.next/cache' \
  --exclude='*.turbo*' \
  --exclude='.env' \
  --exclude='*.env.local' \
  --exclude='.azure' \
  --exclude='logs' \
  --exclude='packages/contracts/artifacts' \
  --exclude='packages/contracts/cache' \
  --exclude='packages/contracts/typechain-types' \
  .
du -h "$TARBALL"

echo "==> uploading to $USER@$HOST"
scp "${SSH_OPTS[@]}" "$TARBALL" "$USER@$HOST:C:/xauconnect/deploy.tgz"
rm -f "$TARBALL"

echo "==> extract + install + restart services"
scp "${SSH_OPTS[@]}" "$ROOT/deploy/remote-apply.ps1" "$USER@$HOST:C:/xauconnect/remote-apply.ps1"
ssh "${SSH_OPTS[@]}" "$USER@$HOST" \
  "powershell -NoProfile -ExecutionPolicy Bypass -File C:\\xauconnect\\remote-apply.ps1"

echo "==> verifying public endpoints"
curl -s -o /dev/null -w 'app host /        -> %{http_code}\n' "http://$HOST/"
curl -s -o /dev/null -w 'app host /api/health -> %{http_code}\n' "http://$HOST/api/health"
curl -s -o /dev/null -w 'sitemap.xml -> %{http_code}\n' "http://$HOST/sitemap.xml"
echo "==> verifying SEO page + chunks"
SEO_SAMPLE="http://$HOST/learn/what-is-a-token-approval-and-why-does-it-matter"
SEO_HTML="$(curl -s "$SEO_SAMPLE")"
SEO_LAYOUT="$(echo "$SEO_HTML" | grep -oE 'layout-[a-f0-9]+\.js' | head -1 || true)"
if [[ -z "$SEO_LAYOUT" ]]; then
  echo "WARN: could not find layout chunk in SEO sample HTML"
else
  curl -s -o /dev/null -w "SEO chunk /_next/static/chunks/app/${SEO_LAYOUT} -> %{http_code}\n" \
    "http://$HOST/_next/static/chunks/app/${SEO_LAYOUT}"
fi
echo "==> verifying live feeds"
"$ROOT/scripts/verify-live-feed.sh" "http://$HOST"
if [[ "$BUILD_MODE" == "full" ]]; then
  echo "==> Cloudflare cache purge (post full SEO deploy)"
  "$ROOT/scripts/seo-publish.sh" || echo "WARN: seo-publish failed (non-fatal if zone not configured)"
else
  echo "==> skipping Cloudflare purge (fast deploy — use --seo after SEO content changes)"
fi
echo "==> deploy complete ($BUILD_MODE)"
