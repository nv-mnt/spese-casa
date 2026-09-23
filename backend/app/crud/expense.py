from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.expense import Expense
from app.models.period import Period
from app.crud.trash import soft_delete, vivi
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


def _ordering():
    """Data crescente (le righe senza data in fondo), poi id."""
    return (Expense.data.is_(None), Expense.data.asc(), Expense.id.asc())


async def list_expenses(db: AsyncSession, period_id: int) -> list[Expense]:
    res = await db.execute(
        select(Expense)
        .where(Expense.period_id == period_id, vivi(Expense))
        .options(joinedload(Expense.paid_by))
        .order_by(*_ordering())
    )
    return list(res.unique().scalars().all())


async def get_expense(db: AsyncSession, household_id: int, expense_id: int) -> Expense | None:
    res = await db.execute(
        select(Expense)
        .join(Period, Period.id == Expense.period_id)
        .where(
            Expense.id == expense_id,
            Period.household_id == household_id,
            vivi(Expense),
        )
        .options(joinedload(Expense.paid_by))
    )
    return res.unique().scalar_one_or_none()


async def create_expense(db: AsyncSession, period_id: int, payload: ExpenseCreate) -> Expense:
    expense = Expense(period_id=period_id, **payload.model_dump())
    db.add(expense)
    await db.flush()
    await db.refresh(expense, attribute_names=["paid_by"])
    return expense


async def update_expense(db: AsyncSession, expense: Expense, payload: ExpenseUpdate) -> Expense:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    await db.flush()
    await db.refresh(expense, attribute_names=["paid_by"])
    return expense


async def delete_expense(
    db: AsyncSession, expense: Expense, *, utente_id: int | None = None
) -> None:
    """Finisce nel cestino, non viene cancellata."""
    await soft_delete(db, expense, utente_id=utente_id)
