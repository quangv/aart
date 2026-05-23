#!/usr/bin/env bash
set -euo pipefail

# Backs up the production Supabase database using pg_dump.
# Requires SUPABASE_DB_URL_PROD to be set (or passed as first arg).
# Dumps are saved to scripts/backups/ with a timestamp.

DB_URL="${1:-${SUPABASE_DB_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "Error: no production DB URL found."
  echo "Set SUPABASE_DB_URL in .env.prod or pass the URL as the first argument."
  exit 1
fi

BACKUP_DIR="$(dirname "$0")/backups"
if [[ ! -d "$BACKUP_DIR" ]]; then
  mkdir -p "$BACKUP_DIR"
  echo "Created backup directory: $BACKUP_DIR"
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUT_FILE="$BACKUP_DIR/prod_${TIMESTAMP}.sql"

echo "Backing up production database..."
if pg_dump \
  --no-owner \
  --no-acl \
  --schema=public \
  "$DB_URL" > "$OUT_FILE"; then
  echo "Backup successful: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
else
  rm -f "$OUT_FILE"
  echo "Backup failed. Check your DB URL and that postgresql-client-17 is installed."
  exit 1
fi

# Keep only the 10 most recent backups
cd "$BACKUP_DIR"
ls -t prod_*.sql 2>/dev/null | tail -n +11 | xargs -r rm --
