#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
umask 077
mkdir -p backups
file="backups/obera-beta-$(date -u +%Y%m%dT%H%M%SZ).dump"
temporary="$(mktemp "${file}.partial.XXXXXX")"
documents="${file%.dump}.documents.tgz"
temporary_documents="$(mktemp "${documents}.partial.XXXXXX")"
trap 'rm -f "$temporary" "$temporary_documents"' EXIT
docker compose --env-file .env.beta -f compose.yaml exec -T db \
  sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner' \
  > "$temporary"
test -s "$temporary"
docker compose --env-file .env.beta -f compose.yaml exec -T api \
  tar -C /app/private-documents -czf - . > "$temporary_documents"
test -s "$temporary_documents"
mv "$temporary" "$file"
mv "$temporary_documents" "$documents"
trap - EXIT
printf 'Backup created: %s and %s\n' "$file" "$documents"
