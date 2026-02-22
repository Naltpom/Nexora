#!/bin/bash
set -e

echo "[entrypoint] Running Alembic migrations..."
alembic -c alembic/alembic.ini upgrade head

echo "[entrypoint] Starting API..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
