#!/bin/bash
# Usage: deploy.sh [--force]
# Pulls the backend image named in .env (BACKEND_TAG, default latest). If it differs from the running one,
# runs migrate, restarts the backend, and smoke-tests it. On a failed smoke test it puts the previous image
# back and remembers the bad one, so the every-five-minutes check does not retry it in a loop.
# launchd runs this every five minutes; run it by hand with --force to redeploy the same image.
# Never builds anything: only CI-built images reach production (quality.md section 8).
. "$(dirname "$0")/lib.sh"

take_lock deploy
load_env
wait_for_docker

force="${1:-}"
image="${BACKEND_IMAGE:-ghcr.io/anujsaha0111/paypal-hackathon/backend}:${BACKEND_TAG:-latest}"

docker pull -q "$image" >/dev/null || die "could not pull $image (is the package public? docker pull it by hand)"
new_id="$(docker image inspect -f '{{.Id}}' "$image")"
container="$(docker compose ps -q backend 2>/dev/null || true)"
current_id=""
[ -n "$container" ] && current_id="$(docker inspect -f '{{.Image}}' "$container")"

if [ "$force" != "--force" ]; then
  [ "$new_id" = "$current_id" ] && exit 0
  if [ -f .bad-image ] && [ "$(cat .bad-image)" = "$new_id" ]; then
    exit 0
  fi
fi

sha="$(docker image inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$image" | sed -n 's/^GIT_SHA=//p')"
log "deploying $image (commit ${sha:-unknown})"
[ -n "$current_id" ] && docker tag "$current_id" foldback-backend:previous

rollback() {
  log "deploy FAILED: $1"
  printf '%s' "$new_id" >.bad-image
  if [ -n "$current_id" ]; then
    log "rolling the backend back to the previous image"
    BACKEND_IMAGE=foldback-backend BACKEND_TAG=previous docker compose up -d --no-deps backend
  fi
  exit 1
}

docker compose up -d --remove-orphans || rollback "docker compose up failed (see: docker compose logs migrate backend)"

# Wait for the container's own readiness check (database reachable, migrations current).
i=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q backend)")" = healthy ]; do
  i=$((i + 1))
  [ "$i" -le 24 ] || rollback "backend did not become healthy within two minutes"
  sleep 5
done

url="${PUBLIC_API_URL:-http://127.0.0.1:8787}"
if "$FOLDBACK_DIR/scripts/smoke.sh" "$url" "${CORS_ORIGINS%%,*}" "$sha"; then
  rm -f .bad-image
  log "deploy OK: commit ${sha:-unknown}"
else
  rollback "smoke test failed against $url"
fi
