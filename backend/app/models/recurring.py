from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import Categoria

if TYPE_CHECKING:
    from app.models.household import Household


class RecurringExpenseTemplate(Base):
    """Modello configurabile di spesa fissa ricorrente (Condominio, Affitto, ...).

    ``importo`` e ``paid_by_id`` sono opzionali: alla creazione di un nuovo
    periodo le righe vengono precompilate lasciando eventualmente vuoti
    "Pagato da" e importo, da completare a mano come nel foglio.
    """

    __tablename__ = "recurring_expense_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(
        ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    descrizione: Mapped[str] = mapped_column(String(255), nullable=False)
    categoria: Mapped[Categoria] = mapped_column(
        Enum(
            Categoria,
            name="categoria",
            values_callable=lambda e: [m.value for m in e],
            native_enum=True,
        ),
        nullable=False,
    )
    importo: Mapped[Decimal | None] = mapped_column(nullable=True)
    paid_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    attivo: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    ordine: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))

    household: Mapped[Household] = relationship(back_populates="recurring_templates")
