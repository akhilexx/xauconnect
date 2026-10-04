#!/usr/bin/env bash
#
# Provision Azure Linux indexer VM + PostgreSQL Flexible Server (run locally with az CLI).
#
# Prerequisites:
#   az login
#   ssh-keygen -t ed25519 -f ~/.ssh/xauconnect_indexer_deploy
#
# Usage:
#   ./deploy/provision-azure-infra.sh
#   ./deploy/provision-azure-infra.sh --indexer-only
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=../scripts/load-deploy-env.sh
source "$ROOT/scripts/load-deploy-env.sh"
load_deploy_env "$ROOT"

RG="${AZURE_RG:?Set AZURE_RG in .local/deploy.env}"
LOCATION="${AZURE_LOCATION:-southeastasia}"
SUBSCRIPTION="${AZURE_SUBSCRIPTION:?Set AZURE_SUBSCRIPTION in .local/deploy.env}"
ADMIN_USER="${AZURE_ADMIN_USER:?Set AZURE_ADMIN_USER in .local/deploy.env}"
VM_NAME="${INDEXER_VM_NAME:-xauconnect-indexer}"
VM_SIZE="${INDEXER_VM_SIZE:-Standard_D4s_v5}"
PG_NAME="${PG_SERVER_NAME:?Set PG_SERVER_NAME in .local/deploy.env}"
ADMIN_IP="${ADMIN_IP:-$(curl -s https://ifconfig.me)}"
SSH_KEY="${INDEXER_SSH_KEY:-$HOME/.ssh/xauconnect_indexer_deploy.pub}"

az account set --subscription "$SUBSCRIPTION"

echo "==> Creating Linux indexer VM: $VM_NAME"
az vm create \
  --resource-group "$RG" \
  --name "$VM_NAME" \
  --location "$LOCATION" \
  --size "$VM_SIZE" \
  --image Ubuntu2404 \
  --admin-username "$ADMIN_USER" \
  --ssh-key-values "@${SSH_KEY}" \
  --public-ip-sku Standard \
  --tags displayName=xauconnect-indexer role=indexer

NSG=$(az network nic list --resource-group "$RG" --query "[?contains(name,'${VM_NAME}')].networkSecurityGroup.id" -o tsv | head -1)
NSG_NAME=$(basename "$NSG")

echo "==> NSG rule: SSH from $ADMIN_IP"
az network nsg rule create \
  --resource-group "$RG" \
  --nsg-name "$NSG_NAME" \
  --name AllowSSHAdmin \
  --priority 100 \
  --source-address-prefixes "${ADMIN_IP}/32" \
  --destination-port-ranges 22 \
  --access Allow \
  --protocol Tcp \
  2>/dev/null || true

if [[ "${1:-}" == "--indexer-only" ]]; then
  INDEXER_IP=$(az vm show -d -g "$RG" -n "$VM_NAME" --query publicIps -o tsv)
  echo "Indexer VM public IP: $INDEXER_IP"
  exit 0
fi

echo "==> Creating PostgreSQL Flexible Server: $PG_NAME"
PG_ADMIN="${PG_ADMIN_USER:-xauadmin}"
PG_PASS="${PG_ADMIN_PASSWORD:-$(openssl rand -base64 24)}"

az postgres flexible-server create \
  --resource-group "$RG" \
  --name "$PG_NAME" \
  --location "$LOCATION" \
  --sku-name Standard_B2ms \
  --tier Burstable \
  --storage-size 64 \
  --version 16 \
  --admin-user "$PG_ADMIN" \
  --admin-password "$PG_PASS" \
  --public-access "0.0.0.0" \
  --yes

APP_IP=""
if [[ -n "${APP_VM_NAME:-}" ]]; then
  APP_IP=$(az vm show -d -g "$RG" -n "$APP_VM_NAME" --query publicIps -o tsv 2>/dev/null || echo "")
fi
INDEXER_IP=$(az vm show -d -g "$RG" -n "$VM_NAME" --query publicIps -o tsv)

for IP in "$APP_IP" "$INDEXER_IP" "$ADMIN_IP"; do
  [[ -z "$IP" ]] && continue
  az postgres flexible-server firewall-rule create \
    --resource-group "$RG" \
    --name "$PG_NAME" \
    --rule-name "allow-${IP//./-}" \
    --start-ip-address "$IP" \
    --end-ip-address "$IP" \
    2>/dev/null || true
done

echo ""
echo "PostgreSQL admin: $PG_ADMIN / (password shown once — save it)"
echo "PG_PASS=$PG_PASS"
echo "DATABASE_URL=postgresql://${PG_ADMIN}:${PG_PASS}@${PG_NAME}.postgres.database.azure.com:5432/xauconnect?sslmode=require"
echo "Indexer VM IP: $INDEXER_IP"
