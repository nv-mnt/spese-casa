"""Schemi del budget personale."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, Field

from app.models.enums import CategoriaEntrata, CategoriaUscita, OrigineVoce
from app.schemas.common import Money, ORMModel

#: Importo di una riga personale: puo' mancare (segnaposto, come le celle vuote
#: del foglio) ma se c'e' non e' negativo.
ImportoRiga = Annotated[Decimal, Field(ge=0, le=Decimal("9999999999"), decimal_places=2)]


# --------------------------------------------------------------------------- periodi


class PersonalPeriodCreate(BaseModel):
    etichetta: str = Field(min_length=1, max_length=120, examples=["Ottobre 2026"])
    #: Copia le uscite del mese precedente (tutte come "in sospeso") e riporta
    #: il saldo previsto come entrata di categoria "Riporto".
    precompila_da_precedente: bool = False


class PersonalPeriodUpdate(BaseModel):
    etichetta: str = Field(min_length=1, max_length=120)


class PersonalPeriodOut(ORMModel):
    id: int
    etichetta: str
    created_at: datetime


class PersonalPeriodListItem(PersonalPeriodOut):
    """Periodo arricchito con i numeri che servono alla lista."""

    n_entrate: int
    n_uscite: int
    entrate_totali: Money
    uscite_totali: Money
    saldo_reale: Money
    saldo_dopo_sospese: Money


# --------------------------------------------------------------------------- entrate


class IncomeCreate(BaseModel):
    categoria: CategoriaEntrata
    dettaglio: str = Field(min_length=1, max_length=255, examples=["G-NOUS S.R.L."])
    importo: ImportoRiga | None = None


class IncomeUpdate(BaseModel):
    categoria: CategoriaEntrata | None = None
    dettaglio: str | None = Field(default=None, min_length=1, max_length=255)
    importo: ImportoRiga | None = None


class IncomeOut(ORMModel):
    id: int
    personal_period_id: int
    categoria: CategoriaEntrata
    dettaglio: str
    importo: Money | None
    #: Valorizzato se la voce arriva dalle Spese casa: in quel caso e' di sola
    #: lettura e si modifica agendo sul movimento condiviso che l'ha generata.
    source_type: OrigineVoce | None = None
    source_id: int | None = None
    created_at: datetime


# --------------------------------------------------------------------------- uscite


class PersonalExpenseCreate(BaseModel):
    categoria: CategoriaUscita
    negozio_dettaglio: str = Field(min_length=1, max_length=255, examples=["UnoMobile"])
    importo: ImportoRiga | None = None
    pagato: bool = False


class PersonalExpenseUpdate(BaseModel):
    categoria: CategoriaUscita | None = None
    negozio_dettaglio: str | None = Field(default=None, min_length=1, max_length=255)
    importo: ImportoRiga | None = None
    pagato: bool | None = None


class PersonalExpenseOut(ORMModel):
    id: int
    personal_period_id: int
    categoria: CategoriaUscita
    negozio_dettaglio: str
    importo: Money | None
    pagato: bool
    #: Come per le entrate: se presente, la voce viene dalle Spese casa.
    source_type: OrigineVoce | None = None
    source_id: int | None = None
    created_at: datetime


# --------------------------------------------------------------------------- riepilogo


class CategoriaUscitaTotale(BaseModel):
    categoria: CategoriaUscita
    totale: Money
    percentuale: float


class PersonalSummary(BaseModel):
    """I quattro numeri del blocco RIEPILOGO, piu' il dettaglio per categoria."""

    personal_period_id: int
    etichetta: str
    valuta: str

    entrate_totali: Money
    uscite_totali: Money
    uscite_pagate: Money
    uscite_in_sospeso: Money

    #: Entrate totali - uscite gia' pagate: i soldi effettivamente sulla carta.
    saldo_reale: Money
    #: Entrate totali - uscite totali: quel che resta una volta pagato tutto.
    saldo_dopo_sospese: Money

    n_entrate: int
    n_uscite: int
    n_uscite_in_sospeso: int

    per_categoria: list[CategoriaUscitaTotale]
