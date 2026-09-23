"""
Modelli del **budget personale**: sezione privata, una per utente.

A differenza del registro condiviso non esistono membri, quote 50/50 o
conguagli: ogni riga appartiene a un solo utente, che e' anche l'unico a
poterla leggere. La proprieta' e' espressa da ``owner_id`` sul periodo; entrate
e uscite ereditano la proprieta' dal periodo che le contiene.
"""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.soft_delete import SoftDeleteMixin
from app.models.enums import CategoriaEntrata, CategoriaUscita, OrigineVoce

if TYPE_CHECKING:
    from app.models.user import User


class PersonalPeriod(Base, SoftDeleteMixin):
    """Un mese del budget personale (un foglio dell'Excel)."""

    __tablename__ = "personal_periods"
    __table_args__ = (
        UniqueConstraint("owner_id", "etichetta", name="uq_personal_period_owner_etichetta"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    etichetta: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), default=lambda: datetime.now(UTC), nullable=False
    )

    # `foreign_keys` esplicito: verso users ci sono due FK (owner e chi ha
    # cestinato), quindi SQLAlchemy da solo non saprebbe quale usare.
    owner: Mapped[User] = relationship(
        back_populates="personal_periods", foreign_keys=[owner_id]
    )
    incomes: Mapped[list[Income]] = relationship(
        back_populates="period", cascade="all, delete-orphan", passive_deletes=True
    )
    expenses: Mapped[list[PersonalExpense]] = relationship(
        back_populates="period", cascade="all, delete-orphan", passive_deletes=True
    )


class Income(Base, SoftDeleteMixin):
    """Una riga della tabella ENTRATE."""

    __tablename__ = "personal_incomes"
    #: L'importo puo' mancare (riga segnaposto, come le celle vuote del foglio),
    #: ma se c'e' non puo' essere negativo.
    __table_args__ = (
        CheckConstraint("importo IS NULL OR importo >= 0", name="ck_income_importo_non_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    personal_period_id: Mapped[int] = mapped_column(
        ForeignKey("personal_periods.id", ondelete="CASCADE"), nullable=False, index=True
    )
    categoria: Mapped[CategoriaEntrata] = mapped_column(
        Enum(
            CategoriaEntrata,
            name="categoria_entrata",
            values_callable=lambda e: [m.value for m in e],
            native_enum=True,
        ),
        nullable=False,
        index=True,
    )
    dettaglio: Mapped[str] = mapped_column(String(255), nullable=False)
    importo: Mapped[Decimal | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), default=lambda: datetime.now(UTC), nullable=False
    )

    #: Se valorizzato, la voce **nasce** da un movimento delle Spese casa ed e'
    #: di sola lettura: si modifica agendo sulla sorgente.
    source_type: Mapped[OrigineVoce | None] = mapped_column(
        Enum(
            OrigineVoce,
            name="origine_voce",
            values_callable=lambda e: [m.value for m in e],
            native_enum=True,
        ),
        nullable=True,
        index=True,
    )
    #: Id della riga sorgente (spesa, entrata comune) o del periodo (conguaglio).
    source_id: Mapped[int | None] = mapped_column(nullable=True)

    @property
    def derivata(self) -> bool:
        return self.source_type is not None

    period: Mapped[PersonalPeriod] = relationship(back_populates="incomes")


class PersonalExpense(Base, SoftDeleteMixin):
    """Una riga della tabella USCITE."""

    __tablename__ = "personal_expenses"
    __table_args__ = (
        CheckConstraint(
            "importo IS NULL OR importo >= 0", name="ck_personal_expense_importo_non_negativo"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    personal_period_id: Mapped[int] = mapped_column(
        ForeignKey("personal_periods.id", ondelete="CASCADE"), nullable=False, index=True
    )
    categoria: Mapped[CategoriaUscita] = mapped_column(
        Enum(
            CategoriaUscita,
            name="categoria_uscita",
            values_callable=lambda e: [m.value for m in e],
            native_enum=True,
        ),
        nullable=False,
        index=True,
    )
    negozio_dettaglio: Mapped[str] = mapped_column(String(255), nullable=False)
    importo: Mapped[Decimal | None] = mapped_column(nullable=True)
    #: False = in sospeso (non incide sul saldo carta), True = gia' addebitata.
    pagato: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), default=lambda: datetime.now(UTC), nullable=False
    )

    #: Se valorizzato, la voce **nasce** da un movimento delle Spese casa ed e'
    #: di sola lettura: si modifica agendo sulla sorgente.
    source_type: Mapped[OrigineVoce | None] = mapped_column(
        Enum(
            OrigineVoce,
            name="origine_voce",
            values_callable=lambda e: [m.value for m in e],
            native_enum=True,
        ),
        nullable=True,
        index=True,
    )
    #: Id della riga sorgente (spesa, entrata comune) o del periodo (conguaglio).
    source_id: Mapped[int | None] = mapped_column(nullable=True)

    @property
    def derivata(self) -> bool:
        return self.source_type is not None

    period: Mapped[PersonalPeriod] = relationship(back_populates="expenses")
