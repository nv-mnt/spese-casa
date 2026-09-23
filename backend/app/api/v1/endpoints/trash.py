"""
Cestino: elenco, ripristino ed eliminazione definitiva.

Regole di visibilita':

* gli elementi della sezione **casa** sono visibili a tutti i membri
  dell'household (il registro e' comune);
* quelli della sezione **personale** solo al proprietario, come il resto del
  budget personale.

Le voci *derivate* (nate dalle Spese casa) non compaiono qui: seguono la loro
sorgente e non si ripristinano da sole.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, HTTPException, Path, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, DbSession
from app.crud import trash as crud_trash
from app.crud.trash_list import list_trash
from app.models.common_income import CommonIncome
from app.models.enums import OrigineVoce
from app.models.expense import Expense
from app.models.period import Period
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.schemas.trash import ElementoCestinato, SezioneCestino, TipoCestinato
from app.services.personal_sync import hard_delete_derivate, sync_period

router = APIRouter(prefix="/trash", tags=["cestino"])

NON_TROVATO = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Elemento non trovato nel cestino"
)


async def _carica(
    db: AsyncSession, tipo: TipoCestinato, elemento_id: int, *, household_id: int, owner_id: int
):
    """Carica l'elemento cestinato **solo** se l'utente ha diritto di vederlo."""
    if tipo is TipoCestinato.PERIODO:
        stmt = select(Period).where(
            Period.id == elemento_id, Period.household_id == household_id
        )
    elif tipo is TipoCestinato.SPESA:
        stmt = (
            select(Expense)
            .join(Period, Period.id == Expense.period_id)
            .where(Expense.id == elemento_id, Period.household_id == household_id)
        )
    elif tipo is TipoCestinato.ENTRATA_COMUNE:
        stmt = (
            select(CommonIncome)
            .join(Period, Period.id == CommonIncome.period_id)
            .where(CommonIncome.id == elemento_id, Period.household_id == household_id)
        )
    elif tipo is TipoCestinato.PERIODO_PERSONALE:
        stmt = select(PersonalPeriod).where(
            PersonalPeriod.id == elemento_id, PersonalPeriod.owner_id == owner_id
        )
    elif tipo is TipoCestinato.ENTRATA_PERSONALE:
        stmt = (
            select(Income)
            .join(PersonalPeriod, PersonalPeriod.id == Income.personal_period_id)
            .where(Income.id == elemento_id, PersonalPeriod.owner_id == owner_id)
        )
    else:
        stmt = (
            select(PersonalExpense)
            .join(PersonalPeriod, PersonalPeriod.id == PersonalExpense.personal_period_id)
            .where(PersonalExpense.id == elemento_id, PersonalPeriod.owner_id == owner_id)
        )

    riga = (await db.execute(stmt)).unique().scalar_one_or_none()
    if riga is None or riga.deleted_at is None:
        raise NON_TROVATO
    # Una voce derivata non vive di vita propria: si ripristina ripristinando
    # il movimento condiviso che l'ha generata.
    if getattr(riga, "source_type", None) is not None:
        raise NON_TROVATO
    return riga


async def _periodo_della_riga(db: AsyncSession, riga) -> Period | None:
    """Il periodo condiviso da risincronizzare dopo l'operazione."""
    if isinstance(riga, Period):
        return riga
    if isinstance(riga, (Expense, CommonIncome)):
        return (
            await db.execute(select(Period).where(Period.id == riga.period_id))
        ).scalar_one_or_none()
    return None


@router.get("", response_model=list[ElementoCestinato], summary="Cosa c'e' nel cestino")
async def elenco(
    db: DbSession,
    user: CurrentUser,
    sezione: Annotated[SezioneCestino | None, Query()] = None,
) -> list[ElementoCestinato]:
    elementi = await list_trash(db, household_id=user.household_id, owner_id=user.id)
    if sezione is not None:
        elementi = [e for e in elementi if e.sezione is sezione]
    return elementi


@router.post(
    "/{tipo}/{elemento_id}/restore",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Ripristina un elemento dal cestino",
)
async def ripristina(
    db: DbSession,
    user: CurrentUser,
    tipo: TipoCestinato,
    elemento_id: Annotated[int, Path(ge=1)],
) -> Response:
    riga = await _carica(
        db, tipo, elemento_id, household_id=user.household_id, owner_id=user.id
    )
    await crud_trash.restore(db, riga)

    periodo = await _periodo_della_riga(db, riga)
    if periodo is not None:
        await sync_period(db, periodo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/{tipo}/{elemento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Elimina definitivamente un elemento (non recuperabile)",
)
async def elimina_definitivamente(
    db: DbSession,
    user: CurrentUser,
    tipo: TipoCestinato,
    elemento_id: Annotated[int, Path(ge=1)],
) -> Response:
    riga = await _carica(
        db, tipo, elemento_id, household_id=user.household_id, owner_id=user.id
    )
    periodo = await _periodo_della_riga(db, riga)

    # Una sorgente cancellata per sempre si porta dietro la voce derivata.
    if tipo is TipoCestinato.SPESA:
        await hard_delete_derivate(db, OrigineVoce.SPESA_CASA, riga.id)
    elif tipo is TipoCestinato.ENTRATA_COMUNE:
        await hard_delete_derivate(db, OrigineVoce.ENTRATA_COMUNE, riga.id)
    elif tipo is TipoCestinato.PERIODO:
        await hard_delete_derivate(db, OrigineVoce.CONGUAGLIO, riga.id)
        for spesa in (
            (await db.execute(select(Expense).where(Expense.period_id == riga.id)))
            .scalars()
            .all()
        ):
            await hard_delete_derivate(db, OrigineVoce.SPESA_CASA, spesa.id)
        for entrata in (
            (await db.execute(select(CommonIncome).where(CommonIncome.period_id == riga.id)))
            .scalars()
            .all()
        ):
            await hard_delete_derivate(db, OrigineVoce.ENTRATA_COMUNE, entrata.id)

    await crud_trash.hard_delete(db, riga)
    if periodo is not None and tipo is not TipoCestinato.PERIODO:
        await sync_period(db, periodo)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
