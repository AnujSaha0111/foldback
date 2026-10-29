#!/bin/bash
# Daily database backup: pg_dump (custom format) into BACKUP_DIR, checked with pg_restore --list,
# older than BACKUP_KEEP_DAYS removed. If OFFSITE_DIR is set, an encrypted copy goes there too.
. "$(dirname "$0")/lib.sh"

take_lock backup
load_env
wait_for_docker

dir="${BACKUP_DIR:-$FOLDBACK_DIR/backups}"
keep="${BACKUP_KEEP_DAYS:-14}"
case "$dir" in
  /Volumes/*) [ -d "${dir%/foldback*}" ] || die "backup disk ${dir%/foldback*} is not mounted" ;;
esac
umask 077
mkdir -p "$dir"

file="$dir/foldback-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T postgres pg_dump -U foldback -d foldback -Fc >"$file.partial" || {
  rm -f "$file.partial"
  die "pg_dump failed"
}
# A dump that pg_restore cannot list is not a backup.
docker compose exec -T postgres pg_restore --list <"$file.partial" >/dev/null || {
  rm -f "$file.partial"
  die "the new dump is not readable by pg_restore"
}
mv "$file.partial" "$file"
log "backup written: $file ($(du -h "$file" | cut -f1))"

find "$dir" -name 'foldback-*.dump' -type f -mtime +"$keep" -print -delete | sed 's/^/removed old backup: /'

if [ -n "${OFFSITE_DIR:-}" ]; then
  [ -n "${BACKUP_PASSPHRASE_FILE:-}" ] && [ -r "$BACKUP_PASSPHRASE_FILE" ] ||
    die "OFFSITE_DIR is set but BACKUP_PASSPHRASE_FILE is missing; refusing to copy an unencrypted dump off the Mac"
  mkdir -p "$OFFSITE_DIR"
  openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$BACKUP_PASSPHRASE_FILE" \
    -in "$file" -out "$OFFSITE_DIR/$(basename "$file").enc"
  find "$OFFSITE_DIR" -name 'foldback-*.dump.enc' -type f -mtime +"$keep" -delete
  log "off-site copy written: $OFFSITE_DIR/$(basename "$file").enc"
fi
