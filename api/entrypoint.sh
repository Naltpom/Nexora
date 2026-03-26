#!/bin/bash
set -e

echo "[entrypoint] Running Alembic migrations (direct DB, bypassing PgBouncer)..."
POSTGRES_HOST=db POSTGRES_PORT=5432 alembic -c alembic/alembic.ini upgrade head

echo "[entrypoint] Starting API..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 \
  --reload \
  --reload-delay 1 \
  --reload-exclude 'alembic/*' \
  --reload-exclude '*.pyc' \
  --reload-exclude '__pycache__/*' \
  --reload-exclude 'tests/*'
