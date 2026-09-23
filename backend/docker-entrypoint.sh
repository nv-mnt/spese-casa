#!/bin/sh
# Attende Postgres, applica le migrazioni e (opzionalmente) carica il seed.
set -e

echo "[entrypoint] attendo il database..."
python - <<'PY'
import asyncio, os, sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

url = os.environ["DATABASE_URL"]


async def main() -> None:
    for tentativo in range(1, 61):
        try:
            engine = create_async_engine(url)
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            await engine.dispose()
            print(f"[entrypoint] database raggiungibile (tentativo {tentativo})")
            return
        except Exception as exc:  # noqa: BLE001
            print(f"[entrypoint] non pronto ({exc.__class__.__name__}), riprovo...")
            await asyncio.sleep(1)
    print("[entrypoint] database non raggiungibile", file=sys.stderr)
    raise SystemExit(1)


asyncio.run(main())
PY

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] alembic upgrade head"
  alembic upgrade head
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] carico i dati d'esempio"
  python -m app.seed || echo "[entrypoint] seed saltato"
fi

exec "$@"
