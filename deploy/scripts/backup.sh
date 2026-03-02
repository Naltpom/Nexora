#!/bin/bash
set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.prod.yml"

mkdir -p "$BACKUP_DIR"

echo "=== PostgreSQL backup: $DATE ==="

$COMPOSE_CMD exec -T db \
    pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    --format=custom --compress=9 \
    > "$BACKUP_DIR/db_${DATE}.dump"

echo "  Database: $BACKUP_DIR/db_${DATE}.dump ($(du -h "$BACKUP_DIR/db_${DATE}.dump" | cut -f1))"

echo "=== Upload files backup: $DATE ==="

$COMPOSE_CMD exec -T api \
    tar czf - /app/uploads /app/rich_text_images 2>/dev/null \
    > "$BACKUP_DIR/uploads_${DATE}.tar.gz" || true

echo "  Uploads: $BACKUP_DIR/uploads_${DATE}.tar.gz"

echo "=== Cleanup backups older than $RETENTION_DAYS days ==="

find "$BACKUP_DIR" -name "db_*.dump" -mtime +$RETENTION_DAYS -delete -print
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print

echo "=== Backup complete ==="
