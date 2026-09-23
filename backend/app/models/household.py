from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.member import Member
    from app.models.period import Period
    from app.models.recurring import RecurringExpenseTemplate
    from app.models.user import User


class Household(Base):
    """Raggruppa i due membri, i periodi e il modello di spese ricorrenti."""

    __tablename__ = "households"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False, default="Casa")
    valuta: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), default=lambda: datetime.now(UTC), nullable=False
    )

    users: Mapped[list[User]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )
    members: Mapped[list[Member]] = relationship(
        back_populates="household",
        cascade="all, delete-orphan",
        order_by="Member.id",
    )
    periods: Mapped[list[Period]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )
    recurring_templates: Mapped[list[RecurringExpenseTemplate]] = relationship(
        back_populates="household",
        cascade="all, delete-orphan",
        order_by="RecurringExpenseTemplate.ordine",
    )
