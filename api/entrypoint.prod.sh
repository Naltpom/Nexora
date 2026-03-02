#!/bin/bash
set -e

echo "[entrypoint] Running Alembic migrations (direct DB, bypassing PgBouncer)..."
POSTGRES_HOST=db POSTGRES_PORT=5432 alembic -c alembic/alembic.ini upgrade head

echo "[entrypoint] Starting API (production mode)..."
WORKERS=${UVICORN_WORKERS:-4}
exec uvicorn src.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "$WORKERS" \
    --access-log \
    --log-level info \
    --proxy-headers \
    --forwarded-allow-ips "*"
