#!/usr/bin/env bash
# Riporta il database E2E allo stato iniziale (usato fra un file di test e
# l'altro, cosi' ogni file parte dagli stessi numeri).
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${E2E_PYTHON:-.venv/bin/python}"
[ -x "$PY" ] || PY="python3"
export E2E_DB_PATH="${E2E_DB_PATH:-$PWD/e2e.db}"
"$PY" tests_e2e/seed_e2e.py > /dev/null
