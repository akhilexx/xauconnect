#!/usr/bin/env bash
# Optional local deploy targets. The file is gitignored (.local/).
# shellcheck disable=SC1091
load_deploy_env() {
  local root="${1:-}"
  if [[ -z "$root" ]]; then
    root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  fi
  if [[ -f "$root/.local/deploy.env" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$root/.local/deploy.env"
    set +a
  fi
}
