#!/usr/bin/env bash
#
# Deploy indexer worker to Azure Linux VM xauconnect-indexer.
#
#   ./scripts/deploy-indexer.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=scripts/load-deploy-env.sh
source "$ROOT/scripts/load-deploy-env.sh"
load_deploy_env "$ROOT"

HOST="${INDEXER_HOST:?Set INDEXER_HOST in .local/deploy.env}"
USER="${INDEXER_DEPLOY_USER:?Set INDEXER_DEPLOY_USER in .local/deploy.env}"
KEY="${INDEXER_SSH_KEY:-$HOME/.ssh/xauconnect_indexer_deploy}"
REMOTE_DIR="/opt/xauconnect"
SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)

echo "==> typecheck"
pnpm -w turbo run typecheck --filter='!@xauconnect/contracts'

echo "==> packaging"
TARBALL="$(mktemp -t xauconnect-indexer).tgz"
tar -czf "$TARBALL" \
  --exclude='.git' \
  --exclude='*node_modules*' \
  --exclude='apps/web/.next' \
  --exclude='.env' \
  --exclude='.azure' \
  --exclude='logs' \
  .

echo "==> uploading to $USER@$HOST"
ssh "${SSH_OPTS[@]}" "$USER@$HOST" "mkdir -p $REMOTE_DIR/logs"
scp "${SSH_OPTS[@]}" "$TARBALL" "$USER@$HOST:$REMOTE_DIR/deploy.tgz"
rm -f "$TARBALL"

ssh "${SSH_OPTS[@]}" "$USER@$HOST" bash -s <<REMOTE
set -euo pipefail
cd $REMOTE_DIR
tar -xzf deploy.tgz
rm -f deploy.tgz
pnpm install --frozen-lockfile
pnpm db:generate
set -a
source .env
set +a
pnpm --filter @xauconnect/backend db:push
sudo sed "s/^User=.*/User=${USER}/" deploy/xauconnect-indexer.service | sudo tee /etc/systemd/system/xauconnect-indexer.service >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable xauconnect-indexer
sudo systemctl restart xauconnect-indexer
REMOTE

echo "==> health check"
sleep 3
INDEXER_IP=$(ssh "${SSH_OPTS[@]}" "$USER@$HOST" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:4100/health || echo fail")
echo "indexer health: $INDEXER_IP"
echo "==> deploy-indexer complete"
