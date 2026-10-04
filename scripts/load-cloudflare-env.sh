#!/usr/bin/env bash
# Source Cloudflare credentials from gitignored .local/cloudflare.env
# shellcheck disable=SC1091
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$ROOT/.local/cloudflare.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.local/cloudflare.env"
  set +a
fi

# Resolve zone ID from domain when token is set but zone ID is missing.
resolve_cloudflare_zone_id() {
  local domain="${1:-xauconnect.com}"
  domain="${domain#https://}"
  domain="${domain%%/*}"

  if [[ -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
    return 0
  fi
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    return 1
  fi

  local resp
  resp="$(curl -s "https://api.cloudflare.com/client/v4/zones?name=${domain}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")"
  local zone_id
  zone_id="$(node -e "
    const j=JSON.parse(process.argv[1]);
    const z=(j.result||[]).find(x=>x.name===process.argv[2]);
    if(z) console.log(z.id);
  " "$resp" "$domain" 2>/dev/null || true)"

  if [[ -n "$zone_id" ]]; then
    export CLOUDFLARE_ZONE_ID="$zone_id"
    return 0
  fi
  return 1
}
