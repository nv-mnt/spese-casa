from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.household import Household
    from app.models.member import Member
    from app.models.personal import PersonalPeriod


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    #: Se True i movimenti delle Spese casa che toccano la sua carta vengono
    #: riflessi come voci derivate nel suo budget personale.
    rifletti_spese_casa: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), default=lambda: datetime.now(UTC), nullable=False
    )

    household: Mapped[Household] = relationship(back_populates="users", lazy="joined")
    #: Membro del registro di casa collegato a questo account (0 o 1).
    member: Mapped[Member | None] = relationship(
        back_populates="user",
        uselist=False,
        lazy="joined",
        foreign_keys="Member.user_id",
    )
    personal_periods: Mapped[list[PersonalPeriod]] = relationship(
        back_populates="owner",
        cascade="all, delete-orphan",
        passive_deletes=True,
        foreign_keys="PersonalPeriod.owner_id",
    )

    @property
    def member_id(self) -> int | None:
        return self.member.id if self.member else None

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"<User id={self.id} email={self.email!r}>"
