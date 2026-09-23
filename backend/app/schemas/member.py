from pydantic import BaseModel, Field

from app.schemas.common import ORMModel

HEX_COLOR = r"^#(?:[0-9a-fA-F]{6})$"


class MemberOut(ORMModel):
    id: int
    nome: str
    colore: str
    iniziali: str
    #: Account collegato a questo membro, se c'e'.
    user_id: int | None = None


class MemberUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=120)
    colore: str | None = Field(default=None, pattern=HEX_COLOR)
