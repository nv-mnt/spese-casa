from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settlement import Settlement
from app.schemas.settlement import SettlementUpdate


async def get_or_create(db: AsyncSession, period_id: int) -> Settlement:
    res = await db.execute(select(Settlement).where(Settlement.period_id == period_id))
    settlement = res.scalar_one_or_none()
    if settlement is None:
        settlement = Settlement(
            period_id=period_id, rimborso_versato=Decimal("0.00"), ricevuto=False
        )
        db.add(settlement)
        await db.flush()
        await db.refresh(settlement)
    return settlement


async def update(
    db: AsyncSession, settlement: Settlement, payload: SettlementUpdate
) -> Settlement:
    data = payload.model_dump(exclude_unset=True)
    if data.get("rimborso_versato") is not None:
        settlement.rimborso_versato = data["rimborso_versato"]
    if data.get("ricevuto") is not None:
        settlement.ricevuto = data["ricevuto"]
    await db.flush()
    await db.refresh(settlement)
    return settlement
