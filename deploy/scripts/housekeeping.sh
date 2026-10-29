#!/bin/bash
# Daily job: node dist/cli/housekeeping.js in a throwaway container. It reuses the migrate service, which is
# the only service that has the owner role's URL.
. "$(dirname "$0")/lib.sh"

take_lock housekeeping
load_env
wait_for_docker

docker compose run --rm --no-deps migrate node dist/cli/housekeeping.js
