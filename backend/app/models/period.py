from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.soft_delete import SoftDeleteMixin

if TYPE_CHECKING:
    from app.models.common_income import CommonIncome
    from app.models.expense import Expense
    from app.models.household import Household
    from app.models.settlement import Settlement


class Period(Base, SoftDeleteMixin):
    """Equivalente di un foglio/tab del Google Sheet (tipicamente un mese)."""

    __tablename__ = "periods"
    __table_args__ = (UniqueConstraint("household_id", "nome", name="uq_period_household_nome"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), default=lambda: datetime.now(UTC), nullable=False
    )

    household: Mapped[Household] = relationship(back_populates="periods")
    common_incomes: Mapped[list[CommonIncome]] = relationship(
        back_populates="period", cascade="all, delete-orphan", passive_deletes=True
    )
    expenses: Mapped[list[Expense]] = relationship(
        back_populates="period",
        cascade="all, delete-orphan",
        order_by="Expense.id",
    )
    settlement: Mapped[Settlement | None] = relationship(
        back_populates="period",
        cascade="all, delete-orphan",
        uselist=False,
    )
