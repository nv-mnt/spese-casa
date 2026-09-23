"""Tipi e utility condivise dagli schemi Pydantic."""

from decimal import ROUND_HALF_UP, Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer

CENT = Decimal("0.01")


def quantize(value: Decimal) -> Decimal:
    """Arrotonda a 2 decimali con la regola commerciale (half-up)."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


#: Importo monetario. Internamente sempre ``Decimal``; in JSON viene emesso come
#: numero (non stringa) per comodita' del frontend e dei grafici Recharts.
Money = Annotated[
    Decimal,
    PlainSerializer(lambda v: float(quantize(v)), return_type=float, when_used="json"),
]

#: Importo di una spesa: strettamente positivo, massimo 2 decimali.
ImportoSpesa = Annotated[Decimal, Field(gt=0, le=Decimal("9999999999"), decimal_places=2)]

#: Importo di un rimborso: non negativo.
ImportoRimborso = Annotated[Decimal, Field(ge=0, le=Decimal("9999999999"), decimal_places=2)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
