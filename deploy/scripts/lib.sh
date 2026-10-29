#!/bin/bash
# Shared setup for the deploy scripts. Sourced, never run. Works with macOS's bash 3.2.
# Expects the scripts to live in ~/foldback/scripts, next to compose.yml and .env.

set -euo pipefail

# launchd starts jobs with a bare PATH: add Homebrew (docker, colima) explicitly.
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/bin:/bin:/usr/sbin:/sbin"

FOLDBACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$FOLDBACK_DIR"

log() { printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*"; }
die() {
  log "ERROR: $*" >&2
  exit 1
}

# Reads .env into the environment without printing it. Values must be plain (no quotes or spaces).
load_env() {
  [ -f .env ] || die "missing $FOLDBACK_DIR/.env (copy env.production.example and fill it in)"
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
  local name
  for name in POSTGRES_PASSWORD APP_DB_PASSWORD JWT_SECRET CORS_ORIGINS APP_BASE_URL; do
    [ -n "${!name:-}" ] || die "$name is empty in $FOLDBACK_DIR/.env"
  done
}

# Waits up to two minutes for Docker (Colima starts at login, a little after this job may run).
wait_for_docker() {
  local i=0
  until docker info >/dev/null 2>&1; do
    i=$((i + 1))
    [ "$i" -le 24 ] || die "Docker is not running (is Colima up? colima status)"
    sleep 5
  done
}

# One run at a time per job name: a second copy exits quietly instead of racing the first.
take_lock() {
  local dir="$FOLDBACK_DIR/.lock-$1"
  if ! mkdir "$dir" 2>/dev/null; then
    log "another $1 run is in progress, skipping"
    exit 0
  fi
  trap 'rmdir "'"$dir"'"' EXIT
}
