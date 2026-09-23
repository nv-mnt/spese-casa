"""Dependency condivise dagli endpoint."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Path, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token
from app.crud import member as crud_member
from app.crud import period as crud_period
from app.crud import personal as crud_personal
from app.db.session import get_session
from app.models.member import Member
from app.models.period import Period
from app.models.personal import PersonalPeriod
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_PREFIX}/auth/token",
    auto_error=False,
)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Credenziali non valide o sessione scaduta",
    headers={"WWW-Authenticate": "Bearer"},
)

DbSession = Annotated[AsyncSession, Depends(get_session)]


async def get_current_user(
    db: DbSession,
    token: Annotated[str | None, Depends(oauth2_scheme)] = None,
) -> User:
    if not token:
        raise CREDENTIALS_ERROR
    try:
        payload = decode_token(token, "access")
    except jwt.InvalidTokenError as exc:
        raise CREDENTIALS_ERROR from exc

    from app.crud.user import get_user

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise CREDENTIALS_ERROR from exc

    user = await get_user(db, user_id)
    if user is None:
        raise CREDENTIALS_ERROR
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_household_members(db: DbSession, user: CurrentUser) -> list[Member]:
    members = await crud_member.list_members(db, user.household_id)
    if len(members) != 2:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "L'household deve avere esattamente 2 membri per il calcolo 50/50 "
                f"(trovati {len(members)})"
            ),
        )
    return members


HouseholdMembers = Annotated[list[Member], Depends(get_household_members)]


async def get_period_or_404(
    db: DbSession,
    user: CurrentUser,
    period_id: Annotated[int, Path(ge=1)],
) -> Period:
    period = await crud_period.get_period(db, user.household_id, period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Periodo non trovato"
        )
    return period


CurrentPeriod = Annotated[Period, Depends(get_period_or_404)]


async def validate_member_id(
    db: AsyncSession, household_id: int, member_id: int | None
) -> None:
    """Verifica che un `paid_by_id` appartenga all'household corrente."""
    if member_id is None:
        return
    if await crud_member.get_member(db, household_id, member_id) is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Membro {member_id} non appartiene a questo household",
        )


async def get_personal_period_or_404(
    db: DbSession,
    user: CurrentUser,
    personal_period_id: Annotated[int, Path(ge=1)],
) -> PersonalPeriod:
    """Carica un periodo personale **solo** se appartiene all'utente loggato.

    Il filtro su ``owner_id`` avviene nella query: un periodo altrui non viene
    distinto da uno inesistente, quindi non trapela nemmeno la sua esistenza.
    """
    period = await crud_personal.get_period(db, user.id, personal_period_id)
    if period is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Periodo personale non trovato"
        )
    return period


CurrentPersonalPeriod = Annotated[PersonalPeriod, Depends(get_personal_period_or_404)]
