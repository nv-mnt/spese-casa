"""
Entrate comuni di un periodo condiviso.

Sono soldi che **rientrano** nel bilancio di casa (il reso di un acquisto, un
rimborso, un bonus) e che vanno divisi 50/50 come le spese. Si comportano da
"spesa negativa" intestata a chi li ha materialmente incassati: riducono il
netto da dividere e abbassano il contributo di quel membro.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Date, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.soft_delete import SoftDeleteMixin
from app.models.enums import CategoriaEntrataComune

if TYPE_CHECKING:
    from app.models.member import Member
    from app.models.period import Period


class CommonIncome(Base, SoftDeleteMixin):
    __tablename__ = "common_incomes"
    __table_args__ = (
        CheckConstraint("importo > 0", name="ck_common_income_importo_positivo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    period_id: Mapped[int] = mapped_column(
        ForeignKey("periods.id", ondelete="CASCADE"), nullable=False, index=True
    )
    #: Come nel foglio, la data puo' essere vuota.
    data: Mapped[date | None] = mapped_column(Date, nullable=True)
    descrizione: Mapped[str] = mapped_column(String(255), nullable=False)
    categoria: Mapped[CategoriaEntrataComune] = mapped_column(
        Enum(
            CategoriaEntrataComune,
            name="categoria_entrata_comune",
            values_callable=lambda e: [m.value for m in e],
            native_enum=True,
        ),
        nullable=False,
        index=True,
    )
    #: Chi ha materialmente incassato i soldi.
    ricevuto_da_id: Mapped[int] = mapped_column(
        ForeignKey("members.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    importo: Mapped[Decimal] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), default=lambda: datetime.now(UTC), nullable=False
    )

    period: Mapped[Period] = relationship(back_populates="common_incomes")
    ricevuto_da: Mapped[Member] = relationship(
        back_populates="common_incomes", lazy="joined"
    )
