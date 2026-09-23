"""Accesso dati per utenti e household."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import hash_password
from app.models.household import Household
from app.models.member import Member
from app.models.recurring import RecurringExpenseTemplate
from app.models.user import User
from app.schemas.auth import UserRegister
from app.services.defaults import DEFAULT_RECURRING_TEMPLATES

MEMBER_COLORS = ("#2563eb", "#db2777")


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    res = await db.execute(
        select(User).where(User.email == email.lower()).options(selectinload(User.member))
    )
    return res.unique().scalar_one_or_none()


async def get_user(db: AsyncSession, user_id: int) -> User | None:
    res = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.member))
    )
    return res.unique().scalar_one_or_none()


async def create_household_with_defaults(db: AsyncSession, nome: str | None = None) -> Household:
    """Crea un household con i due membri di default e le spese fisse."""
    household = Household(
        nome=nome or settings.DEFAULT_HOUSEHOLD_NAME,
        valuta=settings.DEFAULT_CURRENCY,
    )
    db.add(household)
    await db.flush()

    for nome_membro, colore in zip(
        (settings.DEFAULT_MEMBER_A, settings.DEFAULT_MEMBER_B), MEMBER_COLORS, strict=True
    ):
        db.add(Member(household_id=household.id, nome=nome_membro, colore=colore))

    for ordine, tpl in enumerate(DEFAULT_RECURRING_TEMPLATES):
        db.add(
            RecurringExpenseTemplate(
                household_id=household.id,
                descrizione=tpl.descrizione,
                categoria=tpl.categoria,
                importo=None,
                paid_by_id=None,
                attivo=True,
                ordine=ordine,
            )
        )

    await db.flush()
    await db.refresh(household)
    return household


async def create_user(db: AsyncSession, payload: UserRegister) -> User:
    household = await create_household_with_defaults(db, payload.household_nome)
    user = User(
        nome=payload.nome.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        household_id=household.id,
    )
    db.add(user)
    await db.flush()

    # Chi registra lo household "e'" il primo membro: senza questo legame non
    # si saprebbe di chi e' la carta quando si riflette una spesa condivisa.
    primo = await db.execute(
        select(Member)
        .where(Member.household_id == household.id, Member.user_id.is_(None))
        .order_by(Member.id)
        .limit(1)
    )
    membro = primo.scalar_one_or_none()
    if membro is not None:
        membro.user_id = user.id
        await db.flush()

    res = await db.execute(
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.household), selectinload(User.member))
    )
    return res.unique().scalar_one()
