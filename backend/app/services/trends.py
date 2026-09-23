"""
Andamenti multi-mese.

Gli aggregati si calcolano **sul server**: il client riceve gia' i totali per
mese e per categoria, invece di scaricare tutti i registri e sommarli.

L'intervallo si esprime come "ultimi N mesi" perche' i periodi sono etichette
(`"Ottobre 2026"`), non date: ordinarli per data di creazione e' l'unico
criterio affidabile senza imporre un formato al nome.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.trash import vivi
from app.models.common_income import CommonIncome
from app.models.enums import CATEGORIE_ORDINATE, CATEGORIE_USCITA
from app.models.expense import Expense
from app.models.member import Member
from app.models.period import Period
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.models.settlement import Settlement
from app.schemas.common import quantize
from app.schemas.trends import (
    MediaCategoria,
    MeseCaro,
    PuntoTrendCasa,
    PuntoTrendPersonale,
    TrendCasa,
    TrendPersonale,
)
from app.services.summary import compute_balance

ZERO = Decimal("0.00")


def _medie(
    totali: dict[str, Decimal],
    presenze: dict[str, int],
    categorie: Sequence,
    n_mesi: int,
) -> list[MediaCategoria]:
    out: list[MediaCategoria] = []
    for categoria in categorie:
        chiave = categoria.value if hasattr(categoria, "value") else str(categoria)
        totale = quantize(totali.get(chiave, ZERO))
        out.append(
            MediaCategoria(
                categoria=chiave,
                totale=totale,
                media_mensile=quantize(totale / n_mesi) if n_mesi else ZERO,
                mesi_con_movimenti=presenze.get(chiave, 0),
            )
        )
    return sorted(out, key=lambda m: m.totale, reverse=True)


def _classifica(per_mese: dict[str, Decimal], quanti: int = 5) -> list[MeseCaro]:
    righe = [MeseCaro(etichetta=k, totale=quantize(v)) for k, v in per_mese.items()]
    return sorted(righe, key=lambda m: m.totale, reverse=True)[:quanti]


async def build_trend_casa(
    db: AsyncSession, *, household_id: int, members: Sequence[Member], mesi: int | None
) -> TrendCasa:
    stmt = (
        select(Period)
        .where(Period.household_id == household_id, vivi(Period))
        .order_by(Period.created_at.desc(), Period.id.desc())
    )
    if mesi:
        stmt = stmt.limit(mesi)
    periods = list((await db.execute(stmt)).scalars().all())
    if not periods:
        return TrendCasa(punti=[], per_categoria=[], mesi_piu_cari=[], n_mesi=0)

    ids = [p.id for p in periods]

    spese = list(
        (await db.execute(select(Expense).where(Expense.period_id.in_(ids), vivi(Expense))))
        .unique()
        .scalars()
        .all()
    )
    entrate = list(
        (
            await db.execute(
                select(CommonIncome).where(
                    CommonIncome.period_id.in_(ids), vivi(CommonIncome)
                )
            )
        )
        .unique()
        .scalars()
        .all()
    )
    settlements = {
        s.period_id: s
        for s in (await db.execute(select(Settlement).where(Settlement.period_id.in_(ids))))
        .scalars()
        .all()
    }

    pagato: dict[int, dict[int, Decimal]] = defaultdict(lambda: defaultdict(lambda: ZERO))
    conteggi: dict[int, int] = defaultdict(int)
    tot_spese: dict[int, Decimal] = defaultdict(lambda: ZERO)
    per_cat: dict[str, Decimal] = defaultdict(lambda: ZERO)
    presenze_cat: dict[str, set[int]] = defaultdict(set)

    for e in spese:
        pagato[e.period_id][e.paid_by_id] += Decimal(e.importo)
        conteggi[e.period_id] += 1
        tot_spese[e.period_id] += Decimal(e.importo)
        per_cat[e.categoria.value] += Decimal(e.importo)
        presenze_cat[e.categoria.value].add(e.period_id)

    ricevuto: dict[int, dict[int, Decimal]] = defaultdict(lambda: defaultdict(lambda: ZERO))
    tot_entrate: dict[int, Decimal] = defaultdict(lambda: ZERO)
    for i in entrate:
        ricevuto[i.period_id][i.ricevuto_da_id] += Decimal(i.importo)
        tot_entrate[i.period_id] += Decimal(i.importo)

    a, b = (members[0], members[1]) if len(members) == 2 else (None, None)

    punti: list[PuntoTrendCasa] = []
    # Dal piu' vecchio al piu' recente: un andamento si legge da sinistra.
    for p in reversed(periods):
        if a is not None and b is not None:
            balance = compute_balance(
                pagato[p.id][a.id] - ricevuto[p.id][a.id],
                pagato[p.id][b.id] - ricevuto[p.id][b.id],
            )
            netto, saldo = balance.netto_da_dividere, balance.saldo
        else:  # pragma: no cover - household sempre con 2 membri
            netto = quantize(tot_spese[p.id] - tot_entrate[p.id])
            saldo = ZERO
        punti.append(
            PuntoTrendCasa(
                period_id=p.id,
                etichetta=p.nome,
                spese_totali=quantize(tot_spese[p.id]),
                entrate_comuni_totali=quantize(tot_entrate[p.id]),
                netto_da_dividere=netto,
                saldo=saldo,
                n_spese=conteggi[p.id],
            )
        )
        settlements.get(p.id)  # caricato per completezza, non serve al trend

    return TrendCasa(
        punti=punti,
        per_categoria=_medie(
            per_cat,
            {k: len(v) for k, v in presenze_cat.items()},
            CATEGORIE_ORDINATE,
            len(periods),
        ),
        mesi_piu_cari=_classifica({p.nome: tot_spese[p.id] for p in periods}),
        n_mesi=len(periods),
    )


async def build_trend_personale(
    db: AsyncSession, *, owner_id: int, mesi: int | None
) -> TrendPersonale:
    stmt = (
        select(PersonalPeriod)
        .where(PersonalPeriod.owner_id == owner_id, vivi(PersonalPeriod))
        .order_by(PersonalPeriod.created_at.desc(), PersonalPeriod.id.desc())
    )
    if mesi:
        stmt = stmt.limit(mesi)
    periods = list((await db.execute(stmt)).scalars().all())
    if not periods:
        return TrendPersonale(punti=[], per_categoria=[], mesi_piu_cari=[], n_mesi=0)

    ids = [p.id for p in periods]

    entrate = list(
        (
            await db.execute(
                select(Income).where(Income.personal_period_id.in_(ids), vivi(Income))
            )
        )
        .scalars()
        .all()
    )
    uscite = list(
        (
            await db.execute(
                select(PersonalExpense).where(
                    PersonalExpense.personal_period_id.in_(ids), vivi(PersonalExpense)
                )
            )
        )
        .scalars()
        .all()
    )

    tot_entrate: dict[int, Decimal] = defaultdict(lambda: ZERO)
    for i in entrate:
        tot_entrate[i.personal_period_id] += Decimal(i.importo or ZERO)

    tot_uscite: dict[int, Decimal] = defaultdict(lambda: ZERO)
    tot_pagate: dict[int, Decimal] = defaultdict(lambda: ZERO)
    conteggi: dict[int, int] = defaultdict(int)
    per_cat: dict[str, Decimal] = defaultdict(lambda: ZERO)
    presenze_cat: dict[str, set[int]] = defaultdict(set)

    for u in uscite:
        importo = Decimal(u.importo or ZERO)
        tot_uscite[u.personal_period_id] += importo
        if u.pagato:
            tot_pagate[u.personal_period_id] += importo
        conteggi[u.personal_period_id] += 1
        if importo > ZERO:
            per_cat[u.categoria.value] += importo
            presenze_cat[u.categoria.value].add(u.personal_period_id)

    punti = [
        PuntoTrendPersonale(
            personal_period_id=p.id,
            etichetta=p.etichetta,
            entrate_totali=quantize(tot_entrate[p.id]),
            uscite_totali=quantize(tot_uscite[p.id]),
            saldo_reale=quantize(tot_entrate[p.id] - tot_pagate[p.id]),
            saldo_dopo_sospese=quantize(tot_entrate[p.id] - tot_uscite[p.id]),
            n_uscite=conteggi[p.id],
        )
        for p in reversed(periods)
    ]

    return TrendPersonale(
        punti=punti,
        per_categoria=_medie(
            per_cat,
            {k: len(v) for k, v in presenze_cat.items()},
            CATEGORIE_USCITA,
            len(periods),
        ),
        mesi_piu_cari=_classifica({p.etichetta: tot_uscite[p.id] for p in periods}),
        n_mesi=len(periods),
    )
