from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.period import Period


class Settlement(Base):
    """Blocco "Rimborso e saldo": un record per periodo.

    Solo i due campi inseriti dall'utente sono persistiti; importo dovuto,
    residuo e stato sono sempre ricalcolati (vedi ``app.services.summary``).
    """

    __tablename__ = "settlements"
    __table_args__ = (
        CheckConstraint("rimborso_versato >= 0", name="ck_settlement_rimborso_non_negativo"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    period_id: Mapped[int] = mapped_column(
        ForeignKey("periods.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    rimborso_versato: Mapped[Decimal] = mapped_column(
        nullable=False, default=Decimal("0.00"), server_default=text("0")
    )
    ricevuto: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )

    period: Mapped[Period] = relationship(back_populates="settlement")
