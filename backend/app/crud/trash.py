"""
Operazioni comuni del cestino.

Il soft delete e' volutamente banale: si valorizza ``deleted_at``. La parte
delicata e' che **ogni** lettura filtri gli elementi cestinati, cosa che i
moduli CRUD fanno con ``vivi()``.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession


def vivi(modello: Any):
    """Condizione da mettere in ogni ``where``: la riga non e' nel cestino."""
    return modello.deleted_at.is_(None)


def cestinati(modello: Any):
    """Condizione opposta: la riga e' nel cestino."""
    return modello.deleted_at.is_not(None)


async def soft_delete(db: AsyncSession, riga: Any, *, utente_id: int | None = None) -> None:
    riga.deleted_at = datetime.now(UTC)
    riga.deleted_by_id = utente_id
    await db.flush()


async def restore(db: AsyncSession, riga: Any) -> None:
    riga.deleted_at = None
    riga.deleted_by_id = None
    await db.flush()


async def hard_delete(db: AsyncSession, riga: Any) -> None:
    """Cancellazione definitiva: da usare solo su richiesta esplicita."""
    await db.delete(riga)
    await db.flush()
