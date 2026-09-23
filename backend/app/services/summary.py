"""Motore di calcolo del riepilogo di periodo.

Replica la logica del foglio Google, estesa alle **entrate comuni** (reso,
rimborso, bonus), che si comportano da spesa negativa intestata a chi le ha
incassate:

* ``totale_speso``          = somma degli importi delle spese
* ``entrate_comuni_totali`` = somma degli importi delle entrate comuni
* ``netto_da_dividere``     = ``totale_speso - entrate_comuni_totali``
* ``contributo_netto_X``    = (speso da X) - (incassato da X)
* ``quota_a_testa``         = ``netto_da_dividere / 2`` (sempre 50/50)
* ``saldo``                 = ``|contributo_netto_X - quota_a_testa|``, cioe'
  quanto un membro deve all'altro
* chi deve a chi            = il membro il cui contributo netto e' **sotto** la
  propria quota deve l'importo del saldo all'altro
* blocco rimborso           = ``residuo = importo_dovuto - rimborso_versato``
  con stato derivato

Senza entrate comuni i numeri coincidono con quelli di prima: il netto e' il
totale speso e il contributo netto e' quanto ha pagato ciascuno.

Tutte le funzioni di questo modulo sono pure: non toccano il database, il
che le rende direttamente testabili.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Sequence

from app.models.enums import CATEGORIE_ORDINATE, Categoria, StatoSaldo
from app.models.common_income import CommonIncome
from app.models.expense import Expense
from app.models.member import Member
from app.models.period import Period
from app.models.settlement import Settlement
from app.schemas.common import quantize
from app.schemas.member import MemberOut
from app.schemas.summary import (
    CategoryTotal,
    MemberTotal,
    PeriodSummary,
    SettlementBlock,
)

ZERO = Decimal("0.00")


@dataclass(frozen=True, slots=True)
class Balance:
    """Esito del calcolo 50/50 fra due membri, al netto delle entrate comuni."""

    #: Spese - entrate comuni: e' questo che si divide a meta'.
    netto_da_dividere: Decimal
    quota_a_testa: Decimal
    contributo_a: Decimal
    contributo_b: Decimal
    saldo: Decimal
    #: 0 = il primo membro e' in debito, 1 = il secondo, None = in pari.
    debitore_index: int | None

    @property
    def in_pari(self) -> bool:
        return self.debitore_index is None


def compute_balance(contributo_a: Decimal, contributo_b: Decimal) -> Balance:
    """Calcola netto, quota 50% e saldo dai contributi netti dei due membri.

    Il contributo netto e' ``speso - incassato``: senza entrate comuni coincide
    con quanto un membro ha pagato. Puo' essere negativo se qualcuno ha
    incassato piu' di quanto ha speso.
    """
    netto_a = quantize(contributo_a)
    netto_b = quantize(contributo_b)
    netto = quantize(netto_a + netto_b)
    quota = quantize(netto / 2)

    # Il saldo e' identico calcolandolo da una parte o dall'altra (a meno
    # dell'eventuale centesimo di arrotondamento della quota, che per
    # coerenza col foglio prendiamo sempre dal primo membro).
    saldo = quantize(abs(netto_a - quota))

    if saldo == ZERO:
        debitore_index: int | None = None
    else:
        debitore_index = 0 if netto_a < quota else 1

    return Balance(
        netto_da_dividere=netto,
        quota_a_testa=quota,
        contributo_a=netto_a,
        contributo_b=netto_b,
        saldo=saldo,
        debitore_index=debitore_index,
    )


def compute_settlement_block(
    importo_dovuto: Decimal,
    rimborso_versato: Decimal,
    ricevuto: bool,
) -> SettlementBlock:
    """Blocco "Rimborso e saldo"."""
    dovuto = quantize(importo_dovuto)
    versato = quantize(rimborso_versato)
    residuo = quantize(dovuto - versato)

    if dovuto == ZERO:
        stato = StatoSaldo.IN_PARI
    elif residuo > ZERO:
        stato = StatoSaldo.DA_SALDARE
    else:
        # residuo == 0 (saldato) oppure < 0 (versato piu' del dovuto).
        stato = StatoSaldo.SALDATO

    return SettlementBlock(
        importo_dovuto=dovuto,
        rimborso_versato=versato,
        residuo=residuo,
        stato=stato,
        stato_label=stato.label,
        ricevuto=ricevuto,
    )


def compute_category_totals(expenses: Sequence[Expense], totale: Decimal) -> list[CategoryTotal]:
    """Totali per categoria: sempre tutte e 8, anche quelle a zero."""
    per_cat: dict[Categoria, Decimal] = {c: ZERO for c in CATEGORIE_ORDINATE}
    for e in expenses:
        per_cat[e.categoria] = per_cat[e.categoria] + Decimal(e.importo)

    out: list[CategoryTotal] = []
    for categoria in CATEGORIE_ORDINATE:
        valore = quantize(per_cat[categoria])
        percentuale = float(round(valore / totale * 100, 2)) if totale > ZERO else 0.0
        out.append(
            CategoryTotal(categoria=categoria, totale=valore, percentuale=percentuale)
        )
    return out


def chi_deve_a_chi_text(debitore: Member | None, creditore: Member | None) -> str:
    if debitore is None or creditore is None:
        return "Siete in pari"
    return f"→ {debitore.nome} deve a {creditore.nome}"


def build_period_summary(
    *,
    period: Period,
    members: Sequence[Member],
    expenses: Sequence[Expense],
    settlement: Settlement | None,
    common_incomes: Sequence[CommonIncome] = (),
    valuta: str = "EUR",
) -> PeriodSummary:
    """Assembla il riepilogo completo di un periodo."""
    if len(members) != 2:
        raise ValueError(
            f"Il calcolo 50/50 richiede esattamente 2 membri, trovati {len(members)}"
        )

    member_a, member_b = members[0], members[1]

    pagato: dict[int, Decimal] = {member_a.id: ZERO, member_b.id: ZERO}
    for e in expenses:
        if e.paid_by_id in pagato:
            pagato[e.paid_by_id] = pagato[e.paid_by_id] + Decimal(e.importo)

    ricevuto: dict[int, Decimal] = {member_a.id: ZERO, member_b.id: ZERO}
    for entrata in common_incomes:
        if entrata.ricevuto_da_id in ricevuto:
            ricevuto[entrata.ricevuto_da_id] = (
                ricevuto[entrata.ricevuto_da_id] + Decimal(entrata.importo)
            )

    totale_speso = quantize(pagato[member_a.id] + pagato[member_b.id])
    entrate_comuni_totali = quantize(ricevuto[member_a.id] + ricevuto[member_b.id])

    balance = compute_balance(
        pagato[member_a.id] - ricevuto[member_a.id],
        pagato[member_b.id] - ricevuto[member_b.id],
    )

    per_membro = [
        MemberTotal(
            member=MemberOut.model_validate(member_a),
            ha_pagato=quantize(pagato[member_a.id]),
            ha_ricevuto=quantize(ricevuto[member_a.id]),
            contributo_netto=balance.contributo_a,
            differenza=quantize(balance.contributo_a - balance.quota_a_testa),
        ),
        MemberTotal(
            member=MemberOut.model_validate(member_b),
            ha_pagato=quantize(pagato[member_b.id]),
            ha_ricevuto=quantize(ricevuto[member_b.id]),
            contributo_netto=balance.contributo_b,
            differenza=quantize(balance.contributo_b - balance.quota_a_testa),
        ),
    ]

    if balance.debitore_index is None:
        debitore = creditore = None
    elif balance.debitore_index == 0:
        debitore, creditore = member_a, member_b
    else:
        debitore, creditore = member_b, member_a

    rimborso = compute_settlement_block(
        importo_dovuto=balance.saldo,
        rimborso_versato=Decimal(settlement.rimborso_versato) if settlement else ZERO,
        ricevuto=bool(settlement.ricevuto) if settlement else False,
    )

    return PeriodSummary(
        period_id=period.id,
        period_nome=period.nome,
        valuta=valuta,
        totale_speso=totale_speso,
        entrate_comuni_totali=entrate_comuni_totali,
        netto_da_dividere=balance.netto_da_dividere,
        quota_a_testa=balance.quota_a_testa,
        per_membro=per_membro,
        saldo=balance.saldo,
        debitore=MemberOut.model_validate(debitore) if debitore else None,
        creditore=MemberOut.model_validate(creditore) if creditore else None,
        chi_deve_a_chi=chi_deve_a_chi_text(debitore, creditore),
        in_pari=balance.in_pari,
        # Le percentuali per categoria restano sul totale delle **spese**:
        # dire "il 18% delle spese" resta leggibile anche con dei resi in giro.
        per_categoria=compute_category_totals(expenses, totale_speso),
        rimborso=rimborso,
        n_spese=len(expenses),
        n_entrate_comuni=len(common_incomes),
    )
