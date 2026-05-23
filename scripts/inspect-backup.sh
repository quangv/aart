#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="$(dirname "$0")/backups"

if [[ ! -d "$BACKUP_DIR" ]] || [[ -z "$(ls "$BACKUP_DIR"/prod_*.sql 2>/dev/null)" ]]; then
  echo "No backups found in $BACKUP_DIR"
  echo "Run: npm run db:backup:prod"
  exit 1
fi

LATEST=$(ls -t "$BACKUP_DIR"/prod_*.sql | head -1)
FILENAME=$(basename "$LATEST")
TIMESTAMP="${FILENAME#prod_}"; TIMESTAMP="${TIMESTAMP%.sql}"
DATE="${TIMESTAMP:0:8}"; TIME="${TIMESTAMP:9:6}"
FORMATTED="${DATE:0:4}-${DATE:4:2}-${DATE:6:2} ${TIME:0:2}:${TIME:2:2}:${TIME:4:2}"

echo "========================================"
echo " Backup: $FILENAME"
echo " Date:   $FORMATTED"
echo " Size:   $(du -h "$LATEST" | cut -f1)"
echo "========================================"

count_rows() {
  local table="$1"
  grep -c "^INSERT INTO public\.${table} " "$LATEST" 2>/dev/null || echo 0
}

count_copy_rows() {
  local table="$1"
  # COPY blocks: count data lines between COPY header and trailing \.
  awk "/^COPY public\\.${table} /,/^\\\\\./" "$LATEST" 2>/dev/null \
    | grep -v "^COPY\|^\\\\\." | grep -c "." || echo 0
}

PROFILES=$(count_copy_rows "profiles")
CHILDREN=$(count_copy_rows "children")
SOUNDS=$(count_copy_rows "sounds")
WORDS=$(count_copy_rows "words")
WORD_SOUNDS=$(count_copy_rows "word_sounds")
PROGRESS=$(count_copy_rows "child_sound_progress")
PROGRESS_RECORDS=$(count_copy_rows "child_sound_progress_records")

echo ""
echo " User data"
echo "  profiles:                    $PROFILES"
echo "  children:                    $CHILDREN"
echo ""
echo " Clinical data"
echo "  child_sound_progress:        $PROGRESS"
echo "  child_sound_progress_records:$PROGRESS_RECORDS"
echo ""
echo " Reference data (seed)"
echo "  sounds:                      $SOUNDS"
echo "  words:                       $WORDS"
echo "  word_sounds:                 $WORD_SOUNDS"
echo ""

ALL_BACKUPS=$(ls -t "$BACKUP_DIR"/prod_*.sql 2>/dev/null | wc -l)
echo " Total backups stored: $ALL_BACKUPS"
echo "========================================"
