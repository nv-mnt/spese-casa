"""Riepilogo calcolato, blocco rimborso ed export CSV di un periodo."""

from __future__ import annotations

from fastapi import APIRouter, Response

from app.api.deps import CurrentPeriod, CurrentUser, DbSession, HouseholdMembers
from app.crud import common_income as crud_common_income
from app.crud import expense as crud_expense
from app.crud import settlement as crud_settlement
from app.models.settlement import Settlement
from app.schemas.settlement import SettlementOut, SettlementUpdate
from app.schemas.summary import PeriodSummary
from app.services.csv_export import csv_filename, expenses_to_csv
from app.services.personal_sync import sync_period
from app.services.summary import build_period_summary

router = APIRouter(prefix="/periods/{period_id}", tags=["summary"])


@router.get(
    "/summary",
    response_model=PeriodSummary,
    summary="Riepilogo completo del periodo (totali, saldo, categorie, rimborso)",
)
async def get_summary(
    period: CurrentPeriod, db: DbSession, user: CurrentUser, members: HouseholdMembers
) -> PeriodSummary:
    expenses = await crud_expense.list_expenses(db, period.id)
    common_incomes = await crud_common_income.list_common_incomes(db, period.id)
    settlement = await crud_settlement.get_or_create(db, period.id)
    await db.commit()
    return build_period_summary(
        period=period,
        members=members,
        expenses=expenses,
        common_incomes=common_incomes,
        settlement=settlement,
        valuta=user.household.valuta,
    )


@router.get("/settlement", response_model=SettlementOut, summary="Stato rimborso del periodo")
async def get_settlement(period: CurrentPeriod, db: DbSession) -> Settlement:
    settlement = await crud_settlement.get_or_create(db, period.id)
    await db.commit()
    return settlement


@router.put(
    "/settlement",
    response_model=SettlementOut,
    summary="Aggiorna rimborso versato e flag 'Ricevuto?'",
)
async def update_settlement(
    payload: SettlementUpdate, period: CurrentPeriod, db: DbSession
) -> Settlement:
    settlement = await crud_settlement.get_or_create(db, period.id)
    updated = await crud_settlement.update(db, settlement, payload)
    # Il conguaglio versato e' un movimento reale: si riflette nel personale.
    await sync_period(db, period)
    await db.commit()
    return updated


@router.get(
    "/export.csv",
    response_class=Response,
    summary="Esporta il registro spese del periodo in CSV",
    responses={200: {"content": {"text/csv": {}}, "description": "File CSV"}},
)
async def export_csv(
    period: CurrentPeriod, db: DbSession, members: HouseholdMembers
) -> Response:
    expenses = await crud_expense.list_expenses(db, period.id)
    common_incomes = await crud_common_income.list_common_incomes(db, period.id)
    settlement = await crud_settlement.get_or_create(db, period.id)
    await db.commit()

    body = expenses_to_csv(
        period=period,
        members=members,
        expenses=expenses,
        common_incomes=common_incomes,
        settlement=settlement,
    )
    # BOM: fa riconoscere l'UTF-8 a Excel su Windows.
    return Response(
        content=body.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{csv_filename(period.nome)}"'
        },
    )
