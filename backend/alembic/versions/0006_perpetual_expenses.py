"""Uscite personali perpetue (si ripresentano ogni mese)

Revision ID: 0006_perpetue
Revises: 0005_charge_card
Create Date: 2026-10-19

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006_perpetue"
down_revision: str | None = "0005_charge_card"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Default false: nessuna riga esistente diventa perpetua da sola, si
    # sceglie a mano quali lo sono.
    op.add_column(
        "personal_expenses",
        sa.Column(
            "perpetua",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_personal_expenses_perpetua", "personal_expenses", ["perpetua"]
    )


def downgrade() -> None:
    op.drop_index("ix_personal_expenses_perpetua", table_name="personal_expenses")
    op.drop_column("personal_expenses", "perpetua")
