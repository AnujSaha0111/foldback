#!/bin/sh
# Runs once, when the Postgres volume is first created (docker-entrypoint-initdb.d).
# Creates the DML-only role the backend connects as. It must exist before the first migration, because
# 0001_init.sql grants table rights to foldback_app only if the role is already there.
set -eu

if [ -z "${APP_DB_PASSWORD:-}" ]; then
  echo "APP_DB_PASSWORD is empty, refusing to create foldback_app without a password" >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v pw="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE foldback_app LOGIN PASSWORD :'pw';
SQL
