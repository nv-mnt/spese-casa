from pydantic import BaseModel, Field, field_validator

from app.models.enums import Categoria
from app.schemas.common import ImportoSpesa, Money, ORMModel


class RecurringTemplateBase(BaseModel):
    descrizione: str = Field(min_length=1, max_length=255)
    categoria: Categoria
    importo: ImportoSpesa | None = None
    paid_by_id: int | None = None
    attivo: bool = True
    ordine: int = Field(default=0, ge=0, le=999)

    @field_validator("descrizione")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La descrizione non puo' essere vuota")
        return v


class RecurringTemplateCreate(RecurringTemplateBase):
    pass


class RecurringTemplateUpdate(BaseModel):
    descrizione: str | None = Field(default=None, min_length=1, max_length=255)
    categoria: Categoria | None = None
    importo: ImportoSpesa | None = None
    paid_by_id: int | None = None
    attivo: bool | None = None
    ordine: int | None = Field(default=None, ge=0, le=999)


class RecurringTemplateOut(ORMModel):
    id: int
    descrizione: str
    categoria: Categoria
    importo: Money | None
    paid_by_id: int | None
    attivo: bool
    ordine: int
