"""CRUD dei periodi (i "fogli" mensili)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Response, status

from app.api.deps import CurrentPeriod, CurrentUser, DbSession, HouseholdMembers
from app.crud import period as crud_period
from app.models.period import Period
from app.schemas.period import PeriodCreate, PeriodListItem, PeriodOut, PeriodUpdate
from app.services.personal_sync import sync_period

router = APIRouter(prefix="/periods", tags=["periods"])


@router.get("", response_model=list[PeriodListItem], summary="Elenca i periodi")
async def list_periods(
    db: DbSession, user: CurrentUser, members: HouseholdMembers
) -> list[PeriodListItem]:
    return await crud_period.list_periods_with_totals(db, user.household_id, members)


@router.post(
    "",
    response_model=PeriodOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crea un periodo (opzionalmente precompilando le spese fisse)",
)
async def create_period(payload: PeriodCreate, db: DbSession, user: CurrentUser) -> Period:
    if await crud_period.name_exists(db, user.household_id, payload.nome):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Esiste gia' un periodo chiamato {payload.nome!r}",
        )
    period = await crud_period.create_period(db, user.household_id, payload)
    await sync_period(db, period)
    await db.commit()
    return period


@router.get("/{period_id}", response_model=PeriodOut, summary="Dettaglio periodo")
async def get_period(period: CurrentPeriod) -> Period:
    return period


@router.patch("/{period_id}", response_model=PeriodOut, summary="Rinomina un periodo")
async def update_period(
    payload: PeriodUpdate, period: CurrentPeriod, db: DbSession, user: CurrentUser
) -> Period:
    if await crud_period.name_exists(
        db, user.household_id, payload.nome, exclude_id=period.id
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Esiste gia' un periodo chiamato {payload.nome!r}",
        )
    updated = await crud_period.update_period(db, period, payload)
    await db.commit()
    return updated


@router.delete(
    "/{period_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sposta un periodo nel cestino (con tutte le sue spese)",
)
async def delete_period(
    period: CurrentPeriod, db: DbSession, user: CurrentUser
) -> Response:
    await crud_period.delete_period(db, period, utente_id=user.id)
    # Il periodo nel cestino porta con se' le voci derivate che aveva generato.
    await sync_period(db, period)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
