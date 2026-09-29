#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
archive="${1:?Usage: restore-test.sh <archive.dump> <new_test_database>}"
target="${2:?Usage: restore-test.sh <archive.dump> <new_test_database>}"
[[ "$target" =~ ^[a-z][a-z0-9_]{1,62}$ ]] || { echo 'Invalid test database name' >&2; exit 1; }
test -f "$archive"
documents="${archive%.dump}.documents.tgz"
test -f "$documents"
document_target="backups/restored-${target}-documents"
if test -e "$document_target"; then echo 'Document restore destination already exists' >&2; exit 1; fi
docker compose --env-file .env.beta -f compose.yaml exec -T db \
  sh -c 'test "$1" != "$POSTGRES_DB"' sh "$target"
docker compose --env-file .env.beta -f compose.yaml exec -T db pg_restore --list < "$archive" > /dev/null
docker compose --env-file .env.beta -f compose.yaml exec -T db \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec createdb -U "$POSTGRES_USER" "$1"' sh "$target"
docker compose --env-file .env.beta -f compose.yaml exec -T db \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_restore --exit-on-error --single-transaction --no-owner --no-acl -U "$POSTGRES_USER" -d "$1"' sh "$target" < "$archive"
mkdir -m 700 "$document_target"
tar -C "$document_target" -xzf "$documents"
printf 'Restored into distinct test database %s and private document directory %s\n' "$target" "$document_target"
