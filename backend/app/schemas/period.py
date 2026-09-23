from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.common import Money, ORMModel


class PeriodCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=120, examples=["Ottobre 2025"])
    #: Se True, crea subito una riga per ogni spesa fissa ricorrente attiva.
    precompila_ricorrenti: bool = False


class PeriodUpdate(BaseModel):
    nome: str = Field(min_length=1, max_length=120)


class PeriodOut(ORMModel):
    id: int
    nome: str
    created_at: datetime


class PeriodListItem(PeriodOut):
    """Periodo arricchito con i dati che servono alla lista."""

    n_spese: int
    totale_speso: Money
    entrate_comuni_totali: Money = Decimal("0.00")
    #: Saldo **netto**: tiene gia' conto delle entrate comuni.
    saldo: Money
    ricevuto: bool
