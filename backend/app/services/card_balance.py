"""
Saldo carta **rilevato a mano**, per chi non segna le spese piccole.

Il budget personale sa calcolare il saldo carta come
``entrate totali - uscite gia' pagate``: esatto solo se ogni singola uscita e'
registrata. Chi non ha voglia di segnare i caffe' si ritrova quel numero piu'
alto del reale.

La soluzione e' dichiarare ogni tanto il saldo vero letto dalla banca. Quella
cifra **comprende gia'** le uscite che risultavano pagate in quel momento,
quindi insieme al saldo si fotografa anche quanto risultava tracciato
(``entrate_tracciate`` e ``uscite_pagate_tracciate``). Da li' in avanti si
applicano solo i movimenti **successivi**:

    saldo carta = saldo rilevato
                + (entrate di adesso      - entrate alla rilevazione)
                - (uscite pagate di adesso - uscite pagate alla rilevazione)

Lo **scostamento** di una rilevazione e' la differenza fra il saldo dichiarato
e quello che ci si aspettava partendo dalla rilevazione precedente: in pratica
le spese mai registrate. Negativo = hai speso piu' di quanto risulta.

Senza nessuna rilevazione tutto si comporta esattamente come prima.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Sequence

from app.models.personal import CardBalanceReading
from app.schemas.common import quantize

ZERO = Decimal("0.00")


@dataclass(frozen=True, slots=True)
class Tracciato:
    """Quanto risulta registrato nel periodo in questo momento."""

    entrate_totali: Decimal
    uscite_pagate: Decimal


def _attesa(precedente: CardBalanceReading | None, corrente: Tracciato) -> Decimal:
    """Il saldo che ci si aspetterebbe, dati i movimenti tracciati."""
    if precedente is None:
        # Prima rilevazione: il riferimento e' il calcolo classico del foglio.
        return quantize(corrente.entrate_totali - corrente.uscite_pagate)
    return quantize(
        Decimal(precedente.saldo)
        + (corrente.entrate_totali - Decimal(precedente.entrate_tracciate))
        - (corrente.uscite_pagate - Decimal(precedente.uscite_pagate_tracciate))
    )


def scostamento_di(
    reading: CardBalanceReading, precedente: CardBalanceReading | None
) -> Decimal:
    """Quanto la realta' si discosta dal tracciato, a quella rilevazione.

    Negativo = sulla carta c'e' meno di quanto risulta: sono le spese che non
    hai segnato. Positivo = c'e' piu' del previsto (un'entrata non registrata).
    """
    attesa = _attesa(
        precedente,
        Tracciato(
            entrate_totali=Decimal(reading.entrate_tracciate),
            uscite_pagate=Decimal(reading.uscite_pagate_tracciate),
        ),
    )
    return quantize(Decimal(reading.saldo) - attesa)


def scostamenti(readings: Sequence[CardBalanceReading]) -> dict[int, Decimal]:
    """Scostamento di ogni rilevazione, in ordine cronologico."""
    ordinate = sorted(readings, key=lambda r: (r.rilevato_il, r.id))
    out: dict[int, Decimal] = {}
    precedente: CardBalanceReading | None = None
    for r in ordinate:
        out[r.id] = scostamento_di(r, precedente)
        precedente = r
    return out


def ultima(readings: Sequence[CardBalanceReading]) -> CardBalanceReading | None:
    if not readings:
        return None
    return max(readings, key=lambda r: (r.rilevato_il, r.id))


def saldo_carta_corrente(
    *, ultima_rilevazione: CardBalanceReading | None, tracciato: Tracciato
) -> Decimal:
    """Il saldo carta di adesso, partendo dall'ultima rilevazione."""
    if ultima_rilevazione is None:
        return quantize(tracciato.entrate_totali - tracciato.uscite_pagate)
    return quantize(
        Decimal(ultima_rilevazione.saldo)
        + (tracciato.entrate_totali - Decimal(ultima_rilevazione.entrate_tracciate))
        - (tracciato.uscite_pagate - Decimal(ultima_rilevazione.uscite_pagate_tracciate))
    )
