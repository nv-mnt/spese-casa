"""CRUD delle entrate comuni di un periodo (resi, rimborsi, bonus)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Response, status

from app.api.deps import CurrentPeriod, CurrentUser, DbSession, validate_member_id
from app.crud import common_income as crud
from app.models.common_income import CommonIncome
from app.schemas.common_income import (
    CommonIncomeCreate,
    CommonIncomeOut,
    CommonIncomeUpdate,
)
from app.services.personal_sync import sync_period

router = APIRouter(prefix="/periods/{period_id}/common-incomes", tags=["entrate comuni"])

NON_TROVATA = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Entrata comune non trovata"
)


@router.get("", response_model=list[CommonIncomeOut], summary="Entrate comuni del periodo")
async def list_common_incomes(period: CurrentPeriod, db: DbSession) -> list[CommonIncome]:
    return await crud.list_common_incomes(db, period.id)


@router.post(
    "",
    response_model=CommonIncomeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Aggiunge un'entrata comune",
)
async def create_common_income(
    payload: CommonIncomeCreate, period: CurrentPeriod, db: DbSession, user: CurrentUser
) -> CommonIncome:
    await validate_member_id(db, user.household_id, payload.ricevuto_da_id)
    income = await crud.create_common_income(db, period.id, payload)
    await sync_period(db, period)
    await db.commit()
    return income


async def _get_owned(
    db: DbSession, household_id: int, period_id: int, income_id: int
) -> CommonIncome:
    income = await crud.get_common_income(db, household_id, income_id)
    if income is None or income.period_id != period_id:
        raise NON_TROVATA
    return income


@router.patch(
    "/{income_id}", response_model=CommonIncomeOut, summary="Modifica un'entrata comune"
)
async def update_common_income(
    payload: CommonIncomeUpdate,
    period: CurrentPeriod,
    db: DbSession,
    user: CurrentUser,
    income_id: Annotated[int, Path(ge=1)],
) -> CommonIncome:
    income = await _get_owned(db, user.household_id, period.id, income_id)
    await validate_member_id(db, user.household_id, payload.ricevuto_da_id)
    updated = await crud.update_common_income(db, income, payload)
    await sync_period(db, period)
    await db.commit()
    return updated


@router.delete(
    "/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sposta un'entrata comune nel cestino",
)
async def delete_common_income(
    period: CurrentPeriod,
    db: DbSession,
    user: CurrentUser,
    income_id: Annotated[int, Path(ge=1)],
) -> Response:
    income = await _get_owned(db, user.household_id, period.id, income_id)
    await crud.delete_common_income(db, income, utente_id=user.id)
    await sync_period(db, period)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
