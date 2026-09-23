from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import CategoriaEntrataComune
from app.schemas.common import ImportoSpesa, Money, ORMModel
from app.schemas.member import MemberOut


class CommonIncomeBase(BaseModel):
    #: Come nel foglio, la data puo' restare vuota.
    data: date | None = None
    descrizione: str = Field(min_length=1, max_length=255, examples=["Reso Amazon"])
    categoria: CategoriaEntrataComune
    #: Chi ha materialmente incassato i soldi.
    ricevuto_da_id: int
    importo: ImportoSpesa

    @field_validator("descrizione")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La descrizione non puo' essere vuota")
        return v


class CommonIncomeCreate(CommonIncomeBase):
    pass


class CommonIncomeUpdate(BaseModel):
    """Aggiornamento parziale: solo i campi presenti vengono modificati."""

    data: date | None = None
    descrizione: str | None = Field(default=None, min_length=1, max_length=255)
    categoria: CategoriaEntrataComune | None = None
    ricevuto_da_id: int | None = None
    importo: ImportoSpesa | None = None

    @field_validator("descrizione")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("La descrizione non puo' essere vuota")
        return v


class CommonIncomeOut(ORMModel):
    id: int
    period_id: int
    data: date | None
    descrizione: str
    categoria: CategoriaEntrataComune
    ricevuto_da_id: int
    ricevuto_da: MemberOut
    importo: Money
    created_at: datetime
