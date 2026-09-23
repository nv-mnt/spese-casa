"""CRUD delle spese di un periodo."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Response, status

from app.api.deps import CurrentPeriod, CurrentUser, DbSession, validate_member_id
from app.crud import expense as crud_expense
from app.models.expense import Expense
from app.schemas.expense import ExpenseCreate, ExpenseOut, ExpenseUpdate
from app.services.personal_sync import sync_period

router = APIRouter(prefix="/periods/{period_id}/expenses", tags=["expenses"])


@router.get("", response_model=list[ExpenseOut], summary="Registro spese del periodo")
async def list_expenses(period: CurrentPeriod, db: DbSession) -> list[Expense]:
    return await crud_expense.list_expenses(db, period.id)


@router.post(
    "",
    response_model=ExpenseOut,
    status_code=status.HTTP_201_CREATED,
    summary="Aggiunge una spesa",
)
async def create_expense(
    payload: ExpenseCreate, period: CurrentPeriod, db: DbSession, user: CurrentUser
) -> Expense:
    await validate_member_id(db, user.household_id, payload.paid_by_id)
    expense = await crud_expense.create_expense(db, period.id, payload)
    await sync_period(db, period)
    await db.commit()
    return expense


async def _get_owned_expense(
    db: DbSession, household_id: int, period_id: int, expense_id: int
) -> Expense:
    expense = await crud_expense.get_expense(db, household_id, expense_id)
    if expense is None or expense.period_id != period_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spesa non trovata")
    return expense


@router.patch("/{expense_id}", response_model=ExpenseOut, summary="Modifica una spesa")
async def update_expense(
    payload: ExpenseUpdate,
    period: CurrentPeriod,
    db: DbSession,
    user: CurrentUser,
    expense_id: Annotated[int, Path(ge=1)],
) -> Expense:
    expense = await _get_owned_expense(db, user.household_id, period.id, expense_id)
    await validate_member_id(db, user.household_id, payload.paid_by_id)
    updated = await crud_expense.update_expense(db, expense, payload)
    await sync_period(db, period)
    await db.commit()
    return updated


@router.delete(
    "/{expense_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Sposta una spesa nel cestino"
)
async def delete_expense(
    period: CurrentPeriod,
    db: DbSession,
    user: CurrentUser,
    expense_id: Annotated[int, Path(ge=1)],
) -> Response:
    expense = await _get_owned_expense(db, user.household_id, period.id, expense_id)
    await crud_expense.delete_expense(db, expense, utente_id=user.id)
    await sync_period(db, period)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
