"""
Calcoli del budget personale.

Regole (identiche al foglio "Budget mensile 2026"):

* entrate totali      = somma delle entrate
* uscite totali       = somma delle uscite
* uscite pagate       = somma delle uscite con ``pagato = True``
* uscite in sospeso   = uscite totali - uscite pagate
* saldo reale (carta) = entrate totali - uscite pagate
                        (oppure, se ci sono rilevazioni manuali del saldo,
                        l'ultima rilevazione aggiornata coi soli movimenti
                        successivi -- vedi ``app.services.card_balance``)
* saldo dopo sospese  = entrate totali - uscite totali

Gli importi mancanti (celle vuote del foglio) valgono zero in ogni somma.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Sequence

from app.models.enums import CATEGORIE_USCITA
from app.models.personal import (
    CardBalanceReading,
    Income,
    PersonalExpense,
    PersonalPeriod,
)
from app.schemas.common import quantize
from app.schemas.personal import (
    CardBalanceBlock,
    CardBalanceReadingOut,
    CategoriaUscitaTotale,
    PersonalSummary,
)
from app.services.card_balance import (
    Tracciato,
    saldo_carta_corrente,
    scostamento_di,
    scostamenti,
    ultima,
)

ZERO = Decimal("0.00")


def _somma(valori: Sequence[Decimal | None]) -> Decimal:
    return quantize(sum((v for v in valori if v is not None), ZERO))


def build_personal_summary(
    *,
    period: PersonalPeriod,
    incomes: Sequence[Income],
    expenses: Sequence[PersonalExpense],
    valuta: str,
    card_readings: Sequence[CardBalanceReading] = (),
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

    tracciato = Tracciato(entrate_totali=entrate_totali, uscite_pagate=uscite_pagate)
    saldo_tracciato = quantize(entrate_totali - uscite_pagate)
    ultima_rilevazione = ultima(card_readings)
    saldo_carta = saldo_carta_corrente(
        ultima_rilevazione=ultima_rilevazione, tracciato=tracciato
    )

    carta = CardBalanceBlock(
        rilevato=ultima_rilevazione is not None,
        saldo_carta=saldo_carta,
        saldo_tracciato=saldo_tracciato,
        scostamento_cumulato=quantize(saldo_carta - saldo_tracciato),
        ultima_rilevazione=(
            _reading_out(ultima_rilevazione, card_readings)
            if ultima_rilevazione is not None
            else None
        ),
        n_rilevazioni=len(card_readings),
    )

    return PersonalSummary(
        personal_period_id=period.id,
        etichetta=period.etichetta,
        valuta=valuta,
        entrate_totali=entrate_totali,
        uscite_totali=uscite_totali,
        uscite_pagate=uscite_pagate,
        uscite_in_sospeso=uscite_in_sospeso,
        # Se hai rilevato il saldo a mano, e' quello a comandare.
        saldo_reale=saldo_carta,
        saldo_dopo_sospese=quantize(saldo_carta - uscite_in_sospeso),
        n_entrate=len(incomes),
        n_uscite=len(expenses),
        n_uscite_in_sospeso=sum(1 for e in expenses if not e.pagato),
        per_categoria=per_categoria,
        carta=carta,
    )


def _reading_out(
    reading: CardBalanceReading, tutte: Sequence[CardBalanceReading]
) -> CardBalanceReadingOut:
    return reading_out(reading, scostamenti(tutte).get(reading.id))


def reading_out(
    reading: CardBalanceReading, scostamento: Decimal | None = None
) -> CardBalanceReadingOut:
    """Serializza una rilevazione calcolandone lo scostamento se non noto."""
    return CardBalanceReadingOut(
        id=reading.id,
        personal_period_id=reading.personal_period_id,
        saldo=Decimal(reading.saldo),
        rilevato_il=reading.rilevato_il,
        nota=reading.nota,
        entrate_tracciate=Decimal(reading.entrate_tracciate),
        uscite_pagate_tracciate=Decimal(reading.uscite_pagate_tracciate),
        scostamento=(
            scostamento if scostamento is not None else scostamento_di(reading, None)
        ),
        created_at=reading.created_at,
    )
