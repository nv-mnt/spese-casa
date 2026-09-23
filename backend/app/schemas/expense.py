from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import Categoria
from app.schemas.common import ImportoSpesa, Money, ORMModel
from app.schemas.member import MemberOut


class ExpenseBase(BaseModel):
    #: Come nel foglio, la data puo' restare vuota.
    data: date | None = None
    descrizione: str = Field(min_length=1, max_length=255)
    categoria: Categoria
    paid_by_id: int
    importo: ImportoSpesa

    @field_validator("descrizione")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La descrizione non puo' essere vuota")
        return v


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseUpdate(BaseModel):
    """Aggiornamento parziale: solo i campi presenti vengono modificati."""

    data: date | None = None
    descrizione: str | None = Field(default=None, min_length=1, max_length=255)
    categoria: Categoria | None = None
    paid_by_id: int | None = None
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


class ExpenseOut(ORMModel):
    id: int
    period_id: int
    data: date | None
    descrizione: str
    categoria: Categoria
    paid_by_id: int
    paid_by: MemberOut
    importo: Money
    created_at: datetime
