#!/usr/bin/env bash
# Backend per i test E2E: database SQLite dedicato, seminato da capo a ogni
# avvio. Non tocca mai il Postgres di sviluppo.
set -euo pipefail
cd "$(dirname "$0")/.."

PY="${E2E_PYTHON:-.venv/bin/python}"
[ -x "$PY" ] || PY="python3"

export ENVIRONMENT=test
export DATABASE_URL="sqlite+aiosqlite:///$PWD/e2e.db"
export SECRET_KEY="${SECRET_KEY:-chiave-e2e-solo-per-i-test-1234567890}"
export BACKEND_CORS_ORIGINS="http://127.0.0.1:5199,http://localhost:5199,http://127.0.0.1:4199,http://localhost:4199"
export SQL_ECHO=False

"$PY" tests_e2e/seed_e2e.py
exec "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "${E2E_API_PORT:-8099}"
