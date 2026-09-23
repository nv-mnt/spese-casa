"""
Mixin del cestino.

Le eliminazioni non tolgono davvero la riga dal database: valorizzano
``deleted_at`` (e ``deleted_by_id``, per sapere chi l'ha fatto). Tutte le query
di lettura filtrano ``deleted_at IS NULL``, cosi' i calcoli non vedono gli
elementi cestinati; la cancellazione definitiva resta possibile dal cestino.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, declared_attr, mapped_column


class SoftDeleteMixin:
    """Aggiunge il cestino a un modello."""

    @declared_attr
    @classmethod
    def deleted_at(cls) -> Mapped[datetime | None]:
        return mapped_column(DateTime(timezone=True), nullable=True, index=True)

    @declared_attr
    @classmethod
    def deleted_by_id(cls) -> Mapped[int | None]:
        return mapped_column(
            ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
