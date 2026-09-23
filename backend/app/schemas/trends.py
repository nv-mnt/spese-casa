"""Schemi degli andamenti multi-mese."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.common import Money


class PuntoTrendCasa(BaseModel):
    """Un mese della sezione Spese casa."""

    period_id: int
    etichetta: str
    spese_totali: Money
    entrate_comuni_totali: Money
    netto_da_dividere: Money
    saldo: Money
    n_spese: int


class PuntoTrendPersonale(BaseModel):
    """Un mese del budget personale."""

    personal_period_id: int
    etichetta: str
    entrate_totali: Money
    uscite_totali: Money
    saldo_reale: Money
    saldo_dopo_sospese: Money
    n_uscite: int


class MediaCategoria(BaseModel):
    categoria: str
    totale: Money
    #: Totale diviso il numero di mesi dell'intervallo (non solo quelli in cui
    #: la categoria compare): e' la "spesa media mensile" per quella voce.
    media_mensile: Money
    #: In quanti mesi dell'intervallo la categoria ha almeno un importo.
    mesi_con_movimenti: int


class MeseCaro(BaseModel):
    """Una riga della classifica dei mesi piu' cari."""

    etichetta: str
    totale: Money


class TrendCasa(BaseModel):
    punti: list[PuntoTrendCasa]
    per_categoria: list[MediaCategoria]
    mesi_piu_cari: list[MeseCaro]
    n_mesi: int


class TrendPersonale(BaseModel):
    punti: list[PuntoTrendPersonale]
    per_categoria: list[MediaCategoria]
    mesi_piu_cari: list[MeseCaro]
    n_mesi: int
