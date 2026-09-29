#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
mkdir -p backups
file="backups/obera-beta-$(date -u +%Y%m%dT%H%M%SZ).dump"
temporary="$(mktemp "${file}.partial.XXXXXX")"
trap 'rm -f "$temporary"' EXIT
docker compose --env-file .env.beta -f compose.yaml exec -T db \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' \
  > "$temporary"
test -s "$temporary"
mv "$temporary" "$file"
trap - EXIT
printf 'Backup created: %s\n' "$file"
