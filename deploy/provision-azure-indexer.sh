#!/usr/bin/env bash
#
# One-time bootstrap for Azure Linux indexer VM (run via SSH after VM creation).
#
set -euo pipefail

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get update -y
sudo apt-get install -y nodejs git postgresql-client
sudo npm i -g pnpm

sudo mkdir -p /opt/xauconnect/logs
sudo chown -R "${SUDO_USER:-$USER}:${SUDO_USER:-$USER}" /opt/xauconnect

echo "Bootstrap complete. Copy .env to /opt/xauconnect/.env and run scripts/deploy-indexer.sh"
