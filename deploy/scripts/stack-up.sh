#!/bin/bash
# Runs at login: waits for Colima's Docker, then makes sure the stack is up. The containers also restart on
# their own (restart: unless-stopped); this covers a stack that was never started or was stopped by hand.
. "$(dirname "$0")/lib.sh"

take_lock stack-up
load_env
wait_for_docker

docker compose up -d
log "stack up: $(docker compose ps --format '{{.Service}}={{.Status}}' | tr '\n' ' ')"
