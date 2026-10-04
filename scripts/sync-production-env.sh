#!/usr/bin/env bash
#
# Sync production .env from repo root .local/production.env to both VMs.
# Create .local/production.env from .local/ops-credentials.md template first.
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/load-deploy-env.sh
source "$ROOT/scripts/load-deploy-env.sh"
load_deploy_env "$ROOT"

ENV_FILE="${1:-$ROOT/.local/production.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .local/ops-credentials.md and add RPC_* keys"
  exit 1
fi

APP_HOST="${XAU_DEPLOY_HOST:?Set XAU_DEPLOY_HOST in .local/deploy.env}"
APP_USER="${XAU_DEPLOY_USER:?Set XAU_DEPLOY_USER in .local/deploy.env}"
APP_KEY="${XAU_DEPLOY_KEY:-$HOME/.ssh/xauconnect_deploy}"
INDEXER_HOST="${INDEXER_HOST:?Set INDEXER_HOST in .local/deploy.env}"
INDEXER_USER="${INDEXER_DEPLOY_USER:?Set INDEXER_DEPLOY_USER in .local/deploy.env}"
INDEXER_KEY="${INDEXER_SSH_KEY:-$HOME/.ssh/xauconnect_indexer_deploy}"

echo "==> App VM"
scp -i "$APP_KEY" "$ENV_FILE" "$APP_USER@$APP_HOST:C:/xauconnect/.env"
ssh -i "$APP_KEY" "$APP_USER@$APP_HOST" "copy C:\\xauconnect\\.env C:\\xauconnect\\backend\\.env /Y"

# Sync NEXT_PUBLIC_* into apps/web/.env.production (Next.js bakes these at build time on deploy machine).
WEB_ENV="$(mktemp)"
grep -E '^NEXT_PUBLIC_|^GOOGLE_SITE_VERIFICATION=|^BING_SITE_VERIFICATION=' "$ENV_FILE" > "$WEB_ENV" || true
if [[ -s "$WEB_ENV" ]]; then
  scp -i "$APP_KEY" "$WEB_ENV" "$APP_USER@$APP_HOST:C:/xauconnect/apps/web/.env.production"
  echo "    synced apps/web/.env.production ($(wc -l < "$WEB_ENV" | tr -d ' ') vars)"
fi
rm -f "$WEB_ENV"

echo "==> Indexer VM"
scp -i "$INDEXER_KEY" "$ENV_FILE" "$INDEXER_USER@$INDEXER_HOST:/opt/xauconnect/.env"

echo "==> Restart services"
ssh -i "$APP_KEY" "$APP_USER@$APP_HOST" "C:\\tools\\nssm\\nssm.exe restart xauconnect-backend"
ssh -i "$INDEXER_KEY" "$INDEXER_USER@$INDEXER_HOST" "sudo systemctl restart xauconnect-indexer"

echo "==> sync complete"
