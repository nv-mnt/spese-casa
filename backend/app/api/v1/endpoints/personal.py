"""
Budget personale: sezione **privata**, visibile solo al proprietario.

Ogni handler parte da ``CurrentUser`` e filtra per ``owner_id``: non esiste un
percorso che raggiunga una riga senza passare da quel filtro. Un periodo di un
altro utente risponde 404 esattamente come uno inesistente, cosi' da non
rivelare nemmeno che esista.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Response, status

from app.api.deps import CurrentPersonalPeriod, CurrentUser, DbSession
from app.crud import personal as crud
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.schemas.personal import (
    IncomeCreate,
    IncomeOut,
    IncomeUpdate,
    PersonalExpenseCreate,
    PersonalExpenseOut,
    PersonalExpenseUpdate,
    PersonalPeriodCreate,
    PersonalPeriodListItem,
    PersonalPeriodOut,
    PersonalPeriodUpdate,
    PersonalSummary,
)
from app.services.personal_csv import personal_csv_filename, personal_to_csv
from app.services.personal_summary import build_personal_summary

router = APIRouter(prefix="/personal", tags=["budget personale"])

NON_TROVATA_ENTRATA = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Entrata non trovata"
)
NON_TROVATA_USCITA = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Uscita non trovata"
)


def _vieta_se_derivata(riga: Income | PersonalExpense) -> None:
    """Le voci che arrivano dalle Spese casa si cambiano solo alla sorgente."""
    if riga.source_type is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Questa voce arriva dalle Spese casa: modificala dal movimento "
                "condiviso che l'ha generata."
            ),
        )


# --------------------------------------------------------------------------- periodi


@router.get(
    "/periods",
    response_model=list[PersonalPeriodListItem],
    summary="Elenca i miei mesi di budget personale",
)
async def list_personal_periods(
    db: DbSession, user: CurrentUser
) -> list[PersonalPeriodListItem]:
    return await crud.list_periods_with_totals(db, user.id)


@router.post(
    "/periods",
    response_model=PersonalPeriodOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crea un mese (opzionalmente ricopiando il precedente)",
)
async def create_personal_period(
    payload: PersonalPeriodCreate, db: DbSession, user: CurrentUser
) -> PersonalPeriod:
    if await crud.etichetta_exists(db, user.id, payload.etichetta):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Hai gia' un mese chiamato {payload.etichetta!r}",
        )
    period = await crud.create_period(db, user.id, payload)
    await db.commit()
    return period


@router.get(
    "/periods/{personal_period_id}",
    response_model=PersonalPeriodOut,
    summary="Dettaglio di un mese",
)
async def get_personal_period(period: CurrentPersonalPeriod) -> PersonalPeriod:
    return period


@router.patch(
    "/periods/{personal_period_id}",
    response_model=PersonalPeriodOut,
    summary="Rinomina un mese",
)
async def update_personal_period(
    payload: PersonalPeriodUpdate,
    period: CurrentPersonalPeriod,
    db: DbSession,
    user: CurrentUser,
) -> PersonalPeriod:
    if await crud.etichetta_exists(db, user.id, payload.etichetta, exclude_id=period.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Hai gia' un mese chiamato {payload.etichetta!r}",
        )
    updated = await crud.update_period(db, period, payload)
    await db.commit()
    return updated


@router.delete(
    "/periods/{personal_period_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sposta un mese nel cestino (con entrate e uscite)",
)
async def delete_personal_period(
    period: CurrentPersonalPeriod, db: DbSession, user: CurrentUser
) -> Response:
    await crud.delete_period(db, period, utente_id=user.id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------- entrate


@router.get(
    "/periods/{personal_period_id}/incomes",
    response_model=list[IncomeOut],
    summary="Entrate del mese",
)
async def list_incomes(period: CurrentPersonalPeriod, db: DbSession) -> list[Income]:
    return await crud.list_incomes(db, period.id)


@router.post(
    "/periods/{personal_period_id}/incomes",
    response_model=IncomeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Aggiunge un'entrata",
)
async def create_income(
    payload: IncomeCreate, period: CurrentPersonalPeriod, db: DbSession
) -> Income:
    income = await crud.create_income(db, period.id, payload)
    await db.commit()
    return income


@router.patch(
    "/periods/{personal_period_id}/incomes/{income_id}",
    response_model=IncomeOut,
    summary="Modifica un'entrata",
)
async def update_income(
    payload: IncomeUpdate,
    period: CurrentPersonalPeriod,
    db: DbSession,
    user: CurrentUser,
    income_id: Annotated[int, Path(ge=1)],
) -> Income:
    income = await crud.get_income(db, user.id, period.id, income_id)
    if income is None:
        raise NON_TROVATA_ENTRATA
    _vieta_se_derivata(income)
    updated = await crud.update_income(db, income, payload)
    await db.commit()
    return updated


@router.delete(
    "/periods/{personal_period_id}/incomes/{income_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sposta un'entrata nel cestino",
)
async def delete_income(
    period: CurrentPersonalPeriod,
    db: DbSession,
    user: CurrentUser,
    income_id: Annotated[int, Path(ge=1)],
) -> Response:
    income = await crud.get_income(db, user.id, period.id, income_id)
    if income is None:
        raise NON_TROVATA_ENTRATA
    _vieta_se_derivata(income)
    await crud.delete_income(db, income, utente_id=user.id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------- uscite


@router.get(
    "/periods/{personal_period_id}/expenses",
    response_model=list[PersonalExpenseOut],
    summary="Uscite del mese",
)
async def list_personal_expenses(
    period: CurrentPersonalPeriod, db: DbSession
) -> list[PersonalExpense]:
    return await crud.list_expenses(db, period.id)


@router.post(
    "/periods/{personal_period_id}/expenses",
    response_model=PersonalExpenseOut,
    status_code=status.HTTP_201_CREATED,
    summary="Aggiunge un'uscita",
)
async def create_personal_expense(
    payload: PersonalExpenseCreate, period: CurrentPersonalPeriod, db: DbSession
) -> PersonalExpense:
    expense = await crud.create_expense(db, period.id, payload)
    await db.commit()
    return expense


@router.patch(
    "/periods/{personal_period_id}/expenses/{expense_id}",
    response_model=PersonalExpenseOut,
    summary="Modifica un'uscita (incluso il flag 'Pagato')",
)
async def update_personal_expense(
    payload: PersonalExpenseUpdate,
    period: CurrentPersonalPeriod,
    db: DbSession,
    user: CurrentUser,
    expense_id: Annotated[int, Path(ge=1)],
) -> PersonalExpense:
    expense = await crud.get_expense(db, user.id, period.id, expense_id)
    if expense is None:
        raise NON_TROVATA_USCITA
    _vieta_se_derivata(expense)
    updated = await crud.update_expense(db, expense, payload)
    await db.commit()
    return updated


@router.delete(
    "/periods/{personal_period_id}/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sposta un'uscita nel cestino",
)
async def delete_personal_expense(
    period: CurrentPersonalPeriod,
    db: DbSession,
    user: CurrentUser,
    expense_id: Annotated[int, Path(ge=1)],
) -> Response:
    expense = await crud.get_expense(db, user.id, period.id, expense_id)
    if expense is None:
        raise NON_TROVATA_USCITA
    _vieta_se_derivata(expense)
    await crud.delete_expense(db, expense, utente_id=user.id)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --------------------------------------------------------------------------- riepilogo


@router.get(
    "/periods/{personal_period_id}/summary",
    response_model=PersonalSummary,
    summary="Riepilogo calcolato del mese",
)
async def get_personal_summary(
    period: CurrentPersonalPeriod, db: DbSession, user: CurrentUser
) -> PersonalSummary:
    return build_personal_summary(
        period=period,
        incomes=await crud.list_incomes(db, period.id),
        expenses=await crud.list_expenses(db, period.id),
        valuta=user.household.valuta,
    )


@router.get(
    "/periods/{personal_period_id}/export.csv",
    response_class=Response,
    summary="Esporta entrate e uscite del mese in CSV",
    responses={200: {"content": {"text/csv": {}}, "description": "File CSV"}},
)
async def export_personal_csv(
    period: CurrentPersonalPeriod, db: DbSession, user: CurrentUser
) -> Response:
    incomes = await crud.list_incomes(db, period.id)
    expenses = await crud.list_expenses(db, period.id)
    summary = build_personal_summary(
        period=period, incomes=incomes, expenses=expenses, valuta=user.household.valuta
    )
    body = personal_to_csv(
        period=period, incomes=incomes, expenses=expenses, summary=summary
    )
    # BOM: fa riconoscere l'UTF-8 a Excel su Windows.
    return Response(
        content=body.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{personal_csv_filename(period.etichetta)}"'
            )
        },
    )
