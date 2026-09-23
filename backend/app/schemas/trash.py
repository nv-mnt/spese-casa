"""Schemi del cestino."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel

from app.schemas.common import Money


class TipoCestinato(str, Enum):
    """Cosa e' stato cestinato: determina anche la rotta di ripristino."""

    PERIODO = "period"
    SPESA = "expense"
    ENTRATA_COMUNE = "common_income"
    PERIODO_PERSONALE = "personal_period"
    ENTRATA_PERSONALE = "income"
    USCITA_PERSONALE = "personal_expense"


class SezioneCestino(str, Enum):
    CASA = "casa"
    PERSONALE = "personale"


class ElementoCestinato(BaseModel):
    tipo: TipoCestinato
    sezione: SezioneCestino
    id: int
    #: Cosa era: descrizione leggibile.
    etichetta: str
    #: Contesto: il periodo/mese a cui apparteneva.
    contesto: str | None = None
    importo: Money | None = None
    deleted_at: datetime
    #: Nome di chi l'ha cestinato, se noto.
    deleted_by: str | None = None
