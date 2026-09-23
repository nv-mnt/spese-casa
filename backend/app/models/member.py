from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.common_income import CommonIncome
    from app.models.user import User
    from app.models.expense import Expense
    from app.models.household import Household


class Member(Base):
    """Uno dei due coinquilini (default: Giuseppe / Angela)."""

    __tablename__ = "members"
    __table_args__ = (UniqueConstraint("household_id", "nome", name="uq_member_household_nome"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    #: Colore HEX usato da avatar/grafici lato frontend.
    colore: Mapped[str] = mapped_column(String(7), nullable=False, default="#2563eb")
    #: Quale utente "e'" questo membro. Serve a sapere di chi e' la carta quando
    #: si riflette una spesa condivisa nel budget personale.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True
    )

    household: Mapped[Household] = relationship(back_populates="members")
    expenses: Mapped[list[Expense]] = relationship(back_populates="paid_by")
    common_incomes: Mapped[list[CommonIncome]] = relationship(back_populates="ricevuto_da")
    user: Mapped[User | None] = relationship(
        back_populates="member", foreign_keys=[user_id]
    )

    @property
    def iniziali(self) -> str:
        parti = [p for p in self.nome.split() if p]
        return "".join(p[0].upper() for p in parti[:2]) or "?"
