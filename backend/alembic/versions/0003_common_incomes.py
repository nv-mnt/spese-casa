"""Entrate comuni del periodo condiviso

Revision ID: 0003_common_incomes
Revises: 0002_personal
Create Date: 2026-09-22

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_common_incomes"
down_revision: str | None = "0002_personal"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIA_VALUES = ("Rimborso", "Reso", "Bonus", "Altro")

# ``create_type=False``: il tipo viene creato/eliminato esplicitamente in
# upgrade()/downgrade(), altrimenti create_table proverebbe a crearlo di nuovo.
categoria_enum = postgresql.ENUM(
    *CATEGORIA_VALUES, name="categoria_entrata_comune", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*CATEGORIA_VALUES, name="categoria_entrata_comune").create(
        bind, checkfirst=True
    )

    op.create_table(
        "common_incomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column("data", sa.Date(), nullable=True),
        sa.Column("descrizione", sa.String(length=255), nullable=False),
        sa.Column("categoria", categoria_enum, nullable=False),
        sa.Column("ricevuto_da_id", sa.Integer(), nullable=False),
        sa.Column("importo", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["period_id"], ["periods.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["ricevuto_da_id"], ["members.id"], ondelete="RESTRICT"),
        sa.CheckConstraint("importo > 0", name="ck_common_income_importo_positivo"),
    )
    op.create_index("ix_common_incomes_period_id", "common_incomes", ["period_id"])
    op.create_index("ix_common_incomes_ricevuto_da_id", "common_incomes", ["ricevuto_da_id"])
    op.create_index("ix_common_incomes_categoria", "common_incomes", ["categoria"])


def downgrade() -> None:
    op.drop_index("ix_common_incomes_categoria", table_name="common_incomes")
    op.drop_index("ix_common_incomes_ricevuto_da_id", table_name="common_incomes")
    op.drop_index("ix_common_incomes_period_id", table_name="common_incomes")
    op.drop_table("common_incomes")
    postgresql.ENUM(*CATEGORIA_VALUES, name="categoria_entrata_comune").drop(
        op.get_bind(), checkfirst=True
    )
