#!/bin/bash
# Usage:
#   restore.sh check <dump>        restore into a scratch database, count rows, drop it (safe, any time)
#   restore.sh production <dump>   replace the live database with the dump (asks you to confirm)
# A backup you have never restored is a guess: run `check` after setting up backups and before judging.
. "$(dirname "$0")/lib.sh"

mode="${1:-}"
file="${2:-}"
[ -n "$mode" ] && [ -f "$file" ] || die "usage: restore.sh check|production <dump file>"

take_lock restore
load_env
wait_for_docker

psql_owner() { docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U foldback "$@"; }

counts() {
  psql_owner -d "$1" -At -c \
    "SELECT 'users ' || count(*) FROM users UNION ALL SELECT 'contracts ' || count(*) FROM contracts
     UNION ALL SELECT 'shares ' || count(*) FROM shares UNION ALL SELECT 'migrations ' || count(*) FROM schema_migrations"
}

case "$mode" in
  check)
    scratch=foldback_restore_check
    psql_owner -d postgres -q -c "DROP DATABASE IF EXISTS $scratch" -c "CREATE DATABASE $scratch"
    docker compose exec -T postgres pg_restore -U foldback -d "$scratch" --exit-on-error <"$file" ||
      die "restore into $scratch failed"
    log "restored $(basename "$file") into $scratch:"
    counts "$scratch"
    psql_owner -d postgres -q -c "DROP DATABASE $scratch"
    log "restore check PASSED, scratch database dropped"
    ;;
  production)
    echo "This REPLACES the live foldback database with $(basename "$file")."
    echo "Everything written since that backup is lost. A safety backup is taken first."
    printf 'Type "restore foldback" to continue: '
    read -r answer
    [ "$answer" = "restore foldback" ] || die "not confirmed, nothing changed"
    "$FOLDBACK_DIR/scripts/backup.sh"
    docker compose stop backend
    psql_owner -d postgres -q \
      -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'foldback' AND pid <> pg_backend_pid()" \
      -c "DROP DATABASE foldback" -c "CREATE DATABASE foldback"
    docker compose exec -T postgres pg_restore -U foldback -d foldback --exit-on-error <"$file" ||
      die "restore failed; the backend is stopped. Restore the safety backup the same way"
    counts foldback
    docker compose up -d
    log "production restore done, backend started"
    ;;
  *) die "usage: restore.sh check|production <dump file>" ;;
esac
