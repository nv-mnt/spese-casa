from pydantic import BaseModel

from app.schemas.common import ImportoRimborso, Money, ORMModel


class SettlementUpdate(BaseModel):
    rimborso_versato: ImportoRimborso | None = None
    ricevuto: bool | None = None


class SettlementOut(ORMModel):
    period_id: int
    rimborso_versato: Money
    ricevuto: bool
