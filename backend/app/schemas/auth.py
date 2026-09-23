from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class UserRegister(BaseModel):
    nome: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    household_nome: str | None = Field(default=None, max_length=120)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class HouseholdOut(ORMModel):
    id: int
    nome: str
    valuta: str


class UserOut(ORMModel):
    id: int
    nome: str
    email: EmailStr
    household_id: int
    household: HouseholdOut
    #: Riflette i movimenti delle Spese casa nel budget personale.
    rifletti_spese_casa: bool = True
    #: Quale membro del registro di casa "e'" questo utente (None = non scelto).
    member_id: int | None = None


class UserPreferencesUpdate(BaseModel):
    """Aggiornamento parziale delle preferenze dell'utente autenticato."""

    rifletti_spese_casa: bool | None = None
    #: Membro del registro di casa da associare a questo account.
    member_id: int | None = None
