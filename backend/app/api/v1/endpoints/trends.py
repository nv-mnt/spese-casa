"""Andamenti multi-mese delle due sezioni."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, HouseholdMembers
from app.schemas.trends import TrendCasa, TrendPersonale
from app.services.trends import build_trend_casa, build_trend_personale

router = APIRouter(tags=["andamenti"])

#: "Ultimi N mesi". I periodi sono etichette, non date: l'ordine affidabile e'
#: quello di creazione. ``None`` = tutti.
Mesi = Annotated[
    int | None,
    Query(ge=1, le=60, description="Limita agli ultimi N mesi (vuoto = tutti)"),
]


@router.get(
    "/periods/trends",
    response_model=TrendCasa,
    summary="Andamento multi-mese delle Spese casa",
)
async def trend_casa(
    db: DbSession, user: CurrentUser, members: HouseholdMembers, mesi: Mesi = None
) -> TrendCasa:
    return await build_trend_casa(
        db, household_id=user.household_id, members=members, mesi=mesi
    )


@router.get(
    "/personal/trends",
    response_model=TrendPersonale,
    summary="Andamento multi-mese del mio budget personale",
)
async def trend_personale(db: DbSession, user: CurrentUser, mesi: Mesi = None) -> TrendPersonale:
    # `owner_id` fissato sull'utente autenticato: nessuno vede i trend altrui.
    return await build_trend_personale(db, owner_id=user.id, mesi=mesi)
