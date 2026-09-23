"""
Lettura e ripristino del cestino.

Il cestino di casa e' condiviso (tutti e due i coinquilini vedono cosa e'
stato buttato dal registro comune); quello personale e' visibile solo al
proprietario, come il resto del budget personale.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.crud.trash import cestinati
from app.models.common_income import CommonIncome
from app.models.expense import Expense
from app.models.period import Period
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.models.user import User
from app.schemas.trash import ElementoCestinato, SezioneCestino, TipoCestinato


async def _nomi_utenti(db: AsyncSession, ids: set[int]) -> dict[int, str]:
    if not ids:
        return {}
    res = await db.execute(select(User.id, User.nome).where(User.id.in_(ids)))
    return {uid: nome for uid, nome in res.all()}


async def list_trash(
    db: AsyncSession, *, household_id: int, owner_id: int
) -> list[ElementoCestinato]:
    elementi: list[tuple[ElementoCestinato, Any]] = []

    # --- sezione casa -----------------------------------------------------
    periodi = (
        (await db.execute(
            select(Period).where(Period.household_id == household_id, cestinati(Period))
        ))
        .scalars()
        .all()
    )
    for p in periodi:
        elementi.append(
            (
                ElementoCestinato(
                    tipo=TipoCestinato.PERIODO,
                    sezione=SezioneCestino.CASA,
                    id=p.id,
                    etichetta=p.nome,
                    contesto="Periodo intero",
                    deleted_at=p.deleted_at,
                ),
                p.deleted_by_id,
            )
        )

    spese = (
        (await db.execute(
            select(Expense)
            .join(Period, Period.id == Expense.period_id)
            .where(Period.household_id == household_id, cestinati(Expense))
            .options(joinedload(Expense.period))
        ))
        .unique()
        .scalars()
        .all()
    )
    for e in spese:
        elementi.append(
            (
                ElementoCestinato(
                    tipo=TipoCestinato.SPESA,
                    sezione=SezioneCestino.CASA,
                    id=e.id,
                    etichetta=e.descrizione,
                    contesto=e.period.nome if e.period else None,
                    importo=Decimal(e.importo),
                    deleted_at=e.deleted_at,
                ),
                e.deleted_by_id,
            )
        )

    entrate_comuni = (
        (await db.execute(
            select(CommonIncome)
            .join(Period, Period.id == CommonIncome.period_id)
            .where(Period.household_id == household_id, cestinati(CommonIncome))
            .options(joinedload(CommonIncome.period))
        ))
        .unique()
        .scalars()
        .all()
    )
    for i in entrate_comuni:
        elementi.append(
            (
                ElementoCestinato(
                    tipo=TipoCestinato.ENTRATA_COMUNE,
                    sezione=SezioneCestino.CASA,
                    id=i.id,
                    etichetta=i.descrizione,
                    contesto=i.period.nome if i.period else None,
                    importo=Decimal(i.importo),
                    deleted_at=i.deleted_at,
                ),
                i.deleted_by_id,
            )
        )

    # --- sezione personale (solo la propria) ------------------------------
    mesi = (
        (await db.execute(
            select(PersonalPeriod).where(
                PersonalPeriod.owner_id == owner_id, cestinati(PersonalPeriod)
            )
        ))
        .scalars()
        .all()
    )
    for m in mesi:
        elementi.append(
            (
                ElementoCestinato(
                    tipo=TipoCestinato.PERIODO_PERSONALE,
                    sezione=SezioneCestino.PERSONALE,
                    id=m.id,
                    etichetta=m.etichetta,
                    contesto="Mese intero",
                    deleted_at=m.deleted_at,
                ),
                m.deleted_by_id,
            )
        )

    entrate = (
        (await db.execute(
            select(Income)
            .join(PersonalPeriod, PersonalPeriod.id == Income.personal_period_id)
            .where(
                PersonalPeriod.owner_id == owner_id,
                cestinati(Income),
                # Le voci derivate non si ripristinano da sole: seguono la
                # sorgente nelle Spese casa, quindi restano fuori dal cestino.
                Income.source_type.is_(None),
            )
            .options(joinedload(Income.period))
        ))
        .unique()
        .scalars()
        .all()
    )
    for i in entrate:
        elementi.append(
            (
                ElementoCestinato(
                    tipo=TipoCestinato.ENTRATA_PERSONALE,
                    sezione=SezioneCestino.PERSONALE,
                    id=i.id,
                    etichetta=i.dettaglio,
                    contesto=i.period.etichetta if i.period else None,
                    importo=Decimal(i.importo) if i.importo is not None else None,
                    deleted_at=i.deleted_at,
                ),
                i.deleted_by_id,
            )
        )

    uscite = (
        (await db.execute(
            select(PersonalExpense)
            .join(PersonalPeriod, PersonalPeriod.id == PersonalExpense.personal_period_id)
            .where(
                PersonalPeriod.owner_id == owner_id,
                cestinati(PersonalExpense),
                PersonalExpense.source_type.is_(None),
            )
            .options(joinedload(PersonalExpense.period))
        ))
        .unique()
        .scalars()
        .all()
    )
    for u in uscite:
        elementi.append(
            (
                ElementoCestinato(
                    tipo=TipoCestinato.USCITA_PERSONALE,
                    sezione=SezioneCestino.PERSONALE,
                    id=u.id,
                    etichetta=u.negozio_dettaglio,
                    contesto=u.period.etichetta if u.period else None,
                    importo=Decimal(u.importo) if u.importo is not None else None,
                    deleted_at=u.deleted_at,
                ),
                u.deleted_by_id,
            )
        )

    nomi = await _nomi_utenti(db, {uid for _, uid in elementi if uid})
    for elemento, uid in elementi:
        elemento.deleted_by = nomi.get(uid) if uid else None

    # Il piu' recente per primo: e' quello che di solito si vuole recuperare.
    return sorted((e for e, _ in elementi), key=lambda e: e.deleted_at, reverse=True)
