from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.common_income import CommonIncome
from app.models.period import Period
from app.crud.trash import soft_delete, vivi
from app.schemas.common_income import CommonIncomeCreate, CommonIncomeUpdate


def _ordering():
    """Data crescente (le righe senza data in fondo), poi id."""
    return (CommonIncome.data.is_(None), CommonIncome.data.asc(), CommonIncome.id.asc())


async def list_common_incomes(db: AsyncSession, period_id: int) -> list[CommonIncome]:
    res = await db.execute(
        select(CommonIncome)
        .where(CommonIncome.period_id == period_id, vivi(CommonIncome))
        .options(joinedload(CommonIncome.ricevuto_da))
        .order_by(*_ordering())
    )
    return list(res.unique().scalars().all())


async def get_common_income(
    db: AsyncSession, household_id: int, income_id: int
) -> CommonIncome | None:
    """Il join sul periodo garantisce che l'entrata sia dell'household corrente."""
    res = await db.execute(
        select(CommonIncome)
        .join(Period, Period.id == CommonIncome.period_id)
        .where(
            CommonIncome.id == income_id,
            Period.household_id == household_id,
            vivi(CommonIncome),
        )
        .options(joinedload(CommonIncome.ricevuto_da))
    )
    return res.unique().scalar_one_or_none()


async def create_common_income(
    db: AsyncSession, period_id: int, payload: CommonIncomeCreate
) -> CommonIncome:
    income = CommonIncome(period_id=period_id, **payload.model_dump())
    db.add(income)
    await db.flush()
    await db.refresh(income, attribute_names=["ricevuto_da"])
    return income


async def update_common_income(
    db: AsyncSession, income: CommonIncome, payload: CommonIncomeUpdate
) -> CommonIncome:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(income, field, value)
    await db.flush()
    await db.refresh(income, attribute_names=["ricevuto_da"])
    return income


async def delete_common_income(
    db: AsyncSession, income: CommonIncome, *, utente_id: int | None = None
) -> None:
    """Finisce nel cestino, non viene cancellata."""
    await soft_delete(db, income, utente_id=utente_id)
