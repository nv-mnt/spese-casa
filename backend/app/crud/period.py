from __future__ import annotations

from decimal import Decimal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.recurring import list_templates as list_recurring_templates
from app.crud.trash import soft_delete, vivi
from app.models.common_income import CommonIncome
from app.models.expense import Expense
from app.models.member import Member
from app.models.period import Period
from app.models.settlement import Settlement
from app.schemas.common import quantize
from app.schemas.period import PeriodCreate, PeriodListItem, PeriodUpdate
from app.services.summary import compute_balance

ZERO = Decimal("0.00")


async def list_periods(db: AsyncSession, household_id: int) -> list[Period]:
    res = await db.execute(
        select(Period)
        .where(Period.household_id == household_id, vivi(Period))
        .order_by(Period.created_at.desc(), Period.id.desc())
    )
    return list(res.scalars().all())


async def list_periods_with_totals(
    db: AsyncSession, household_id: int, members: list[Member]
) -> list[PeriodListItem]:
    """Lista periodi arricchita con numero spese, totale e saldo netto.

    Due sole query aggregate (spese e entrate comuni, raggruppate per membro):
    il saldo si calcola senza caricare nessuna riga.
    """
    periods = await list_periods(db, household_id)
    if not periods:
        return []

    period_ids = [p.id for p in periods]

    agg = await db.execute(
        select(
            Expense.period_id,
            Expense.paid_by_id,
            func.count(Expense.id),
            func.coalesce(func.sum(Expense.importo), 0),
        )
        .where(Expense.period_id.in_(period_ids), vivi(Expense))
        .group_by(Expense.period_id, Expense.paid_by_id)
    )

    conteggi: dict[int, int] = {pid: 0 for pid in period_ids}
    pagato: dict[int, dict[int, Decimal]] = {pid: {} for pid in period_ids}
    for period_id, paid_by_id, n, somma in agg.all():
        conteggi[period_id] += int(n)
        pagato[period_id][paid_by_id] = Decimal(somma)

    agg_entrate = await db.execute(
        select(
            CommonIncome.period_id,
            CommonIncome.ricevuto_da_id,
            func.coalesce(func.sum(CommonIncome.importo), 0),
        )
        .where(CommonIncome.period_id.in_(period_ids), vivi(CommonIncome))
        .group_by(CommonIncome.period_id, CommonIncome.ricevuto_da_id)
    )
    ricevuto: dict[int, dict[int, Decimal]] = {pid: {} for pid in period_ids}
    for period_id, member_id, somma in agg_entrate.all():
        ricevuto[period_id][member_id] = Decimal(somma)

    settle_res = await db.execute(
        select(Settlement).where(Settlement.period_id.in_(period_ids))
    )
    settlements = {s.period_id: s for s in settle_res.scalars().all()}

    member_a = members[0] if len(members) > 0 else None
    member_b = members[1] if len(members) > 1 else None

    items: list[PeriodListItem] = []
    for p in periods:
        p_pagato = pagato[p.id]
        p_ricevuto = ricevuto[p.id]
        # La lista mostra il totale **speso**; il saldo e' invece quello netto.
        totale = quantize(sum(p_pagato.values(), ZERO))
        entrate_comuni = quantize(sum(p_ricevuto.values(), ZERO))
        if member_a is not None and member_b is not None:
            balance = compute_balance(
                p_pagato.get(member_a.id, ZERO) - p_ricevuto.get(member_a.id, ZERO),
                p_pagato.get(member_b.id, ZERO) - p_ricevuto.get(member_b.id, ZERO),
            )
            saldo = balance.saldo
        else:  # pragma: no cover - household sempre con 2 membri
            saldo = ZERO
        s = settlements.get(p.id)
        items.append(
            PeriodListItem(
                id=p.id,
                nome=p.nome,
                created_at=p.created_at,
                n_spese=conteggi[p.id],
                totale_speso=totale,
                entrate_comuni_totali=entrate_comuni,
                saldo=saldo,
                ricevuto=bool(s.ricevuto) if s else False,
            )
        )
    return items


async def get_period(db: AsyncSession, household_id: int, period_id: int) -> Period | None:
    res = await db.execute(
        select(Period).where(Period.id == period_id, Period.household_id == household_id, vivi(Period))
    )
    return res.scalar_one_or_none()


async def name_exists(
    db: AsyncSession, household_id: int, nome: str, *, exclude_id: int | None = None
) -> bool:
    stmt = select(Period.id).where(
        Period.household_id == household_id,
        func.lower(Period.nome) == nome.strip().lower(),
        vivi(Period),
    )
    if exclude_id is not None:
        stmt = stmt.where(Period.id != exclude_id)
    res = await db.execute(stmt.limit(1))
    return res.scalar_one_or_none() is not None


async def create_period(
    db: AsyncSession, household_id: int, payload: PeriodCreate
) -> Period:
    period = Period(household_id=household_id, nome=payload.nome.strip())
    db.add(period)
    await db.flush()

    # Ogni periodo nasce con il proprio blocco rimborso azzerato.
    db.add(Settlement(period_id=period.id, rimborso_versato=ZERO, ricevuto=False))

    if payload.precompila_ricorrenti:
        templates = await list_recurring_templates(db, household_id, only_active=True)
        members = await db.execute(
            select(Member).where(Member.household_id == household_id).order_by(Member.id)
        )
        member_ids = {m.id for m in members.scalars().all()}
        fallback_id = min(member_ids) if member_ids else None

        for tpl in templates:
            # Le spese richiedono importo > 0 e un pagante: quando il modello
            # non li specifica usiamo dei segnaposto (0,01 EUR e primo membro)
            # da correggere a mano, esattamente come le celle vuote del foglio.
            paid_by_id = tpl.paid_by_id if tpl.paid_by_id in member_ids else fallback_id
            if paid_by_id is None:  # pragma: no cover
                continue
            db.add(
                Expense(
                    period_id=period.id,
                    data=None,
                    descrizione=tpl.descrizione,
                    categoria=tpl.categoria,
                    paid_by_id=paid_by_id,
                    importo=tpl.importo if tpl.importo is not None else Decimal("0.01"),
                )
            )

    await db.flush()
    await db.refresh(period)
    return period


async def update_period(db: AsyncSession, period: Period, payload: PeriodUpdate) -> Period:
    period.nome = payload.nome.strip()
    await db.flush()
    await db.refresh(period)
    return period


async def delete_period(
    db: AsyncSession, period: Period, *, utente_id: int | None = None
) -> None:
    """Finisce nel cestino con tutto il suo contenuto.

    Spese ed entrate comuni restano tecnicamente vive, ma il periodo che le
    contiene non e' piu' visibile: ripristinandolo tornano anche loro, senza
    dover ricordare riga per riga cosa era stato cancellato.
    """
    await soft_delete(db, period, utente_id=utente_id)


async def load_period_full(
    db: AsyncSession, household_id: int, period_id: int
) -> Period | None:
    """Carica un periodo con spese (e relativo membro) e settlement."""
    res = await db.execute(
        select(Period)
        .where(Period.id == period_id, Period.household_id == household_id, vivi(Period))
        .options(
            selectinload(Period.expenses).selectinload(Expense.paid_by),
            selectinload(Period.common_incomes).selectinload(CommonIncome.ricevuto_da),
            selectinload(Period.settlement),
        )
    )
    return res.unique().scalar_one_or_none()
