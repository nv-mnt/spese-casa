"""
Calcoli del budget personale.

Regole (identiche al foglio "Budget mensile 2026"):

* entrate totali      = somma delle entrate
* uscite totali       = somma delle uscite
* uscite pagate       = somma delle uscite con ``pagato = True``
* uscite in sospeso   = uscite totali - uscite pagate
* saldo reale (carta) = entrate totali - uscite pagate
* saldo dopo sospese  = entrate totali - uscite totali

Gli importi mancanti (celle vuote del foglio) valgono zero in ogni somma.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Sequence

from app.models.enums import CATEGORIE_USCITA
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.schemas.common import quantize
from app.schemas.personal import CategoriaUscitaTotale, PersonalSummary

ZERO = Decimal("0.00")


def _somma(valori: Sequence[Decimal | None]) -> Decimal:
    return quantize(sum((v for v in valori if v is not None), ZERO))


def build_personal_summary(
    *,
    period: PersonalPeriod,
    incomes: Sequence[Income],
    expenses: Sequence[PersonalExpense],
    valuta: str,
) -> PersonalSummary:
    entrate_totali = _somma([i.importo for i in incomes])
    uscite_totali = _somma([e.importo for e in expenses])
    uscite_pagate = _somma([e.importo for e in expenses if e.pagato])
    uscite_in_sospeso = quantize(uscite_totali - uscite_pagate)

    per_categoria = []
    for categoria in CATEGORIE_USCITA:
        totale = _somma([e.importo for e in expenses if e.categoria is categoria])
        percentuale = float(totale / uscite_totali * 100) if uscite_totali > 0 else 0.0
        per_categoria.append(
            CategoriaUscitaTotale(
                categoria=categoria, totale=totale, percentuale=round(percentuale, 2)
            )
        )

    return PersonalSummary(
        personal_period_id=period.id,
        etichetta=period.etichetta,
        valuta=valuta,
        entrate_totali=entrate_totali,
        uscite_totali=uscite_totali,
        uscite_pagate=uscite_pagate,
        uscite_in_sospeso=uscite_in_sospeso,
        saldo_reale=quantize(entrate_totali - uscite_pagate),
        saldo_dopo_sospese=quantize(entrate_totali - uscite_totali),
        n_entrate=len(incomes),
        n_uscite=len(expenses),
        n_uscite_in_sospeso=sum(1 for e in expenses if not e.pagato),
        per_categoria=per_categoria,
    )
