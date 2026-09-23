"""
Accesso dati del budget personale.

**Ogni** funzione che raggiunge una riga parte da ``owner_id``: e' il punto
unico in cui si garantisce che un utente non veda i dati di un altro.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.trash import soft_delete, vivi
from app.models.enums import CategoriaEntrata
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.schemas.common import quantize
from app.schemas.personal import (
    IncomeCreate,
    IncomeUpdate,
    PersonalExpenseCreate,
    PersonalExpenseUpdate,
    PersonalPeriodCreate,
    PersonalPeriodListItem,
    PersonalPeriodUpdate,
)

ZERO = Decimal("0.00")


# --------------------------------------------------------------------------- periodi


async def list_periods(db: AsyncSession, owner_id: int) -> list[PersonalPeriod]:
    res = await db.execute(
        select(PersonalPeriod)
        .where(PersonalPeriod.owner_id == owner_id, vivi(PersonalPeriod))
        .order_by(PersonalPeriod.created_at.desc(), PersonalPeriod.id.desc())
    )
    return list(res.scalars().all())


async def list_periods_with_totals(
    db: AsyncSession, owner_id: int
) -> list[PersonalPeriodListItem]:
    """Lista arricchita con i totali, calcolati con due query aggregate."""
    periods = await list_periods(db, owner_id)
    if not periods:
        return []

    ids = [p.id for p in periods]

    entrate = await db.execute(
        select(
            Income.personal_period_id,
            func.count(Income.id),
            func.coalesce(func.sum(Income.importo), 0),
        )
        .where(Income.personal_period_id.in_(ids), vivi(Income))
        .group_by(Income.personal_period_id)
    )
    per_entrate = {pid: (n, Decimal(tot)) for pid, n, tot in entrate.all()}

    uscite = await db.execute(
        select(
            PersonalExpense.personal_period_id,
            func.count(PersonalExpense.id),
            func.coalesce(func.sum(PersonalExpense.importo), 0),
            # CASE invece di FILTER: funziona sia su Postgres sia su SQLite.
            func.coalesce(
                func.sum(
                    case(
                        (
                            PersonalExpense.pagato.is_(True),
                            func.coalesce(PersonalExpense.importo, 0),
                        ),
                        else_=0,
                    )
                ),
                0,
            ),
        )
        .where(PersonalExpense.personal_period_id.in_(ids), vivi(PersonalExpense))
        .group_by(PersonalExpense.personal_period_id)
    )
    per_uscite = {
        pid: (n, Decimal(tot), Decimal(pagate)) for pid, n, tot, pagate in uscite.all()
    }

    risultato: list[PersonalPeriodListItem] = []
    for p in periods:
        n_entrate, entrate_totali = per_entrate.get(p.id, (0, ZERO))
        n_uscite, uscite_totali, uscite_pagate = per_uscite.get(p.id, (0, ZERO, ZERO))
        risultato.append(
            PersonalPeriodListItem(
                id=p.id,
                etichetta=p.etichetta,
                created_at=p.created_at,
                n_entrate=n_entrate,
                n_uscite=n_uscite,
                entrate_totali=quantize(entrate_totali),
                uscite_totali=quantize(uscite_totali),
                saldo_reale=quantize(entrate_totali - uscite_pagate),
                saldo_dopo_sospese=quantize(entrate_totali - uscite_totali),
            )
        )
    return risultato


async def get_period(
    db: AsyncSession, owner_id: int, period_id: int
) -> PersonalPeriod | None:
    res = await db.execute(
        select(PersonalPeriod).where(
            PersonalPeriod.id == period_id,
            PersonalPeriod.owner_id == owner_id,
            vivi(PersonalPeriod),
        )
    )
    return res.scalar_one_or_none()


async def etichetta_exists(
    db: AsyncSession, owner_id: int, etichetta: str, *, exclude_id: int | None = None
) -> bool:
    stmt = select(PersonalPeriod.id).where(
        PersonalPeriod.owner_id == owner_id,
        func.lower(PersonalPeriod.etichetta) == etichetta.strip().lower(),
        vivi(PersonalPeriod),
    )
    if exclude_id is not None:
        stmt = stmt.where(PersonalPeriod.id != exclude_id)
    res = await db.execute(stmt.limit(1))
    return res.scalar_one_or_none() is not None


async def create_period(
    db: AsyncSession, owner_id: int, payload: PersonalPeriodCreate
) -> PersonalPeriod:
    precedente = None
    if payload.precompila_da_precedente:
        periodi = await list_periods(db, owner_id)
        precedente = periodi[0] if periodi else None

    period = PersonalPeriod(owner_id=owner_id, etichetta=payload.etichetta.strip())
    db.add(period)
    await db.flush()

    if precedente is not None:
        uscite_precedenti = await list_expenses(db, precedente.id)
        entrate_precedenti = await list_incomes(db, precedente.id)

        # Riporto = saldo previsto del mese precedente (entrate - uscite totali).
        entrate_tot = sum((i.importo or ZERO for i in entrate_precedenti), ZERO)
        uscite_tot = sum((e.importo or ZERO for e in uscite_precedenti), ZERO)
        riporto = quantize(entrate_tot - uscite_tot)
        db.add(
            Income(
                personal_period_id=period.id,
                categoria=CategoriaEntrata.RIPORTO,
                dettaglio=f"Riporto da {precedente.etichetta}",
                # Un riporto negativo non e' rappresentabile come entrata:
                # in quel caso si parte da zero e il rosso resta nelle uscite.
                importo=riporto if riporto > 0 else ZERO,
            )
        )

        # Le uscite fisse si ripresentano tutte come "in sospeso".
        for uscita in uscite_precedenti:
            db.add(
                PersonalExpense(
                    personal_period_id=period.id,
                    categoria=uscita.categoria,
                    negozio_dettaglio=uscita.negozio_dettaglio,
                    importo=uscita.importo,
                    pagato=False,
                )
            )

    await db.flush()
    await db.refresh(period)
    return period


async def update_period(
    db: AsyncSession, period: PersonalPeriod, payload: PersonalPeriodUpdate
) -> PersonalPeriod:
    period.etichetta = payload.etichetta.strip()
    await db.flush()
    await db.refresh(period)
    return period


async def delete_period(
    db: AsyncSession, period: PersonalPeriod, *, utente_id: int | None = None
) -> None:
    """Finisce nel cestino con entrate e uscite che contiene."""
    await soft_delete(db, period, utente_id=utente_id)


# --------------------------------------------------------------------------- entrate


def _ordine_entrate():
    return (Income.id.asc(),)


async def list_incomes(db: AsyncSession, period_id: int) -> list[Income]:
    res = await db.execute(
        select(Income)
        .where(Income.personal_period_id == period_id, vivi(Income))
        .order_by(*_ordine_entrate())
    )
    return list(res.scalars().all())


async def get_income(
    db: AsyncSession, owner_id: int, period_id: int, income_id: int
) -> Income | None:
    """Il join sul periodo e' cio' che impedisce di leggere l'entrata altrui."""
    res = await db.execute(
        select(Income)
        .join(PersonalPeriod, PersonalPeriod.id == Income.personal_period_id)
        .where(
            Income.id == income_id,
            Income.personal_period_id == period_id,
            PersonalPeriod.owner_id == owner_id,
            vivi(Income),
        )
    )
    return res.scalar_one_or_none()


async def create_income(db: AsyncSession, period_id: int, payload: IncomeCreate) -> Income:
    income = Income(
        personal_period_id=period_id,
        categoria=payload.categoria,
        dettaglio=payload.dettaglio.strip(),
        importo=payload.importo,
    )
    db.add(income)
    await db.flush()
    await db.refresh(income)
    return income


async def update_income(db: AsyncSession, income: Income, payload: IncomeUpdate) -> Income:
    for campo, valore in payload.model_dump(exclude_unset=True).items():
        setattr(income, campo, valore.strip() if campo == "dettaglio" and valore else valore)
    await db.flush()
    await db.refresh(income)
    return income


async def delete_income(
    db: AsyncSession, income: Income, *, utente_id: int | None = None
) -> None:
    await soft_delete(db, income, utente_id=utente_id)


# --------------------------------------------------------------------------- uscite


async def list_expenses(db: AsyncSession, period_id: int) -> list[PersonalExpense]:
    res = await db.execute(
        select(PersonalExpense)
        .where(PersonalExpense.personal_period_id == period_id, vivi(PersonalExpense))
        .order_by(PersonalExpense.id.asc())
    )
    return list(res.scalars().all())


async def get_expense(
    db: AsyncSession, owner_id: int, period_id: int, expense_id: int
) -> PersonalExpense | None:
    res = await db.execute(
        select(PersonalExpense)
        .join(PersonalPeriod, PersonalPeriod.id == PersonalExpense.personal_period_id)
        .where(
            PersonalExpense.id == expense_id,
            PersonalExpense.personal_period_id == period_id,
            PersonalPeriod.owner_id == owner_id,
            vivi(PersonalExpense),
        )
    )
    return res.scalar_one_or_none()


async def create_expense(
    db: AsyncSession, period_id: int, payload: PersonalExpenseCreate
) -> PersonalExpense:
    expense = PersonalExpense(
        personal_period_id=period_id,
        categoria=payload.categoria,
        negozio_dettaglio=payload.negozio_dettaglio.strip(),
        importo=payload.importo,
        pagato=payload.pagato,
    )
    db.add(expense)
    await db.flush()
    await db.refresh(expense)
    return expense


async def update_expense(
    db: AsyncSession, expense: PersonalExpense, payload: PersonalExpenseUpdate
) -> PersonalExpense:
    for campo, valore in payload.model_dump(exclude_unset=True).items():
        if campo == "negozio_dettaglio" and valore:
            valore = valore.strip()
        setattr(expense, campo, valore)
    await db.flush()
    await db.refresh(expense)
    return expense


async def delete_expense(
    db: AsyncSession, expense: PersonalExpense, *, utente_id: int | None = None
) -> None:
    await soft_delete(db, expense, utente_id=utente_id)
