"""Registrazione, login, refresh e profilo utente."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.crud.user import create_user, get_user, get_user_by_email
from app.models.member import Member
from app.models.user import User
from app.schemas.auth import (
    RefreshRequest,
    TokenPair,
    UserLogin,
    UserOut,
    UserPreferencesUpdate,
    UserRegister,
)
from app.services.personal_sync import sync_household

router = APIRouter(prefix="/auth", tags=["auth"])

BAD_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Email o password non corretti",
    headers={"WWW-Authenticate": "Bearer"},
)


def _token_pair(user: User) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post(
    "/register",
    response_model=TokenPair,
    status_code=status.HTTP_201_CREATED,
    summary="Registra un nuovo utente (crea household e i due membri di default)",
)
async def register(payload: UserRegister, db: DbSession) -> TokenPair:
    if await get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email gia' registrata"
        )
    user = await create_user(db, payload)
    await db.commit()
    return _token_pair(user)


@router.post("/login", response_model=TokenPair, summary="Login con email e password (JSON)")
async def login(payload: UserLogin, db: DbSession) -> TokenPair:
    user = await get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise BAD_CREDENTIALS
    return _token_pair(user)


@router.post(
    "/token",
    response_model=TokenPair,
    summary="Login form-encoded (usato dal pulsante Authorize di Swagger)",
    include_in_schema=True,
)
async def login_form(
    db: DbSession,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> TokenPair:
    user = await get_user_by_email(db, form.username)
    if user is None or not verify_password(form.password, user.password_hash):
        raise BAD_CREDENTIALS
    return _token_pair(user)


@router.post("/refresh", response_model=TokenPair, summary="Rinnova la coppia di token")
async def refresh(payload: RefreshRequest, db: DbSession) -> TokenPair:
    try:
        claims = decode_token(payload.refresh_token, "refresh")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token non valido o scaduto",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await get_user(db, int(claims["sub"]))
    if user is None:
        raise BAD_CREDENTIALS
    return _token_pair(user)


@router.get("/me", response_model=UserOut, summary="Profilo dell'utente autenticato")
async def me(user: CurrentUser) -> User:
    return user


@router.patch(
    "/me",
    response_model=UserOut,
    summary="Aggiorna le preferenze dell'utente autenticato",
)
async def update_me(
    payload: UserPreferencesUpdate, db: DbSession, user: CurrentUser
) -> User:
    """Interruttore di riflesso e scelta del membro corrispondente."""
    dati = payload.model_dump(exclude_unset=True)

    if "member_id" in dati:
        nuovo_id = dati["member_id"]
        # Si stacca dal membro precedente, poi si aggancia al nuovo.
        precedente = await db.execute(select(Member).where(Member.user_id == user.id))
        for m in precedente.scalars().all():
            m.user_id = None
        if nuovo_id is not None:
            res = await db.execute(
                select(Member).where(
                    Member.id == nuovo_id, Member.household_id == user.household_id
                )
            )
            membro = res.scalar_one_or_none()
            if membro is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Membro {nuovo_id} non appartiene a questo household",
                )
            if membro.user_id not in (None, user.id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Quel membro e' gia' collegato a un altro account",
                )
            membro.user_id = user.id
        await db.flush()

    if "rifletti_spese_casa" in dati:
        user.rifletti_spese_casa = bool(dati["rifletti_spese_casa"])
        await db.flush()

    # Qualunque cambiamento qui sposta le voci derivate: si riallinea tutto.
    await sync_household(db, user.household_id)
    await db.commit()

    aggiornato = await get_user(db, user.id)
    assert aggiornato is not None
    return aggiornato
