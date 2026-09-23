"""Budget personale: personal_periods, personal_incomes, personal_expenses

Revision ID: 0002_personal
Revises: 0001_initial
Create Date: 2026-09-22

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_personal"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIA_ENTRATA_VALUES = ("Riporto", "Stipendio", "Altro")

CATEGORIA_USCITA_VALUES = (
    "Affitto",
    "Assicurazioni",
    "Telefonia",
    "Abbonamenti",
    "Cura persona",
    "Finanziamenti",
    "Spesa",
    "Trasporti",
    "Svago",
    "Salute",
    "Altro",
)

# ``create_type=False``: i tipi vengono creati/eliminati esplicitamente in
# upgrade()/downgrade(), altrimenti create_table proverebbe a crearli di nuovo.
entrata_enum = postgresql.ENUM(
    *CATEGORIA_ENTRATA_VALUES, name="categoria_entrata", create_type=False
)
uscita_enum = postgresql.ENUM(
    *CATEGORIA_USCITA_VALUES, name="categoria_uscita", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*CATEGORIA_ENTRATA_VALUES, name="categoria_entrata").create(
        bind, checkfirst=True
    )
    postgresql.ENUM(*CATEGORIA_USCITA_VALUES, name="categoria_uscita").create(
        bind, checkfirst=True
    )

    op.create_table(
        "personal_periods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.Integer(), nullable=False),
        sa.Column("etichetta", sa.String(length=120), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("owner_id", "etichetta", name="uq_personal_period_owner_etichetta"),
    )
    op.create_index("ix_personal_periods_owner_id", "personal_periods", ["owner_id"])

    op.create_table(
        "personal_incomes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("personal_period_id", sa.Integer(), nullable=False),
        sa.Column("categoria", entrata_enum, nullable=False),
        sa.Column("dettaglio", sa.String(length=255), nullable=False),
        sa.Column("importo", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["personal_period_id"], ["personal_periods.id"], ondelete="CASCADE"
        ),
        sa.CheckConstraint("importo IS NULL OR importo >= 0", name="ck_income_importo_non_negativo"),
    )
    op.create_index(
        "ix_personal_incomes_personal_period_id", "personal_incomes", ["personal_period_id"]
    )
    op.create_index("ix_personal_incomes_categoria", "personal_incomes", ["categoria"])

    op.create_table(
        "personal_expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("personal_period_id", sa.Integer(), nullable=False),
        sa.Column("categoria", uscita_enum, nullable=False),
        sa.Column("negozio_dettaglio", sa.String(length=255), nullable=False),
        sa.Column("importo", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("pagato", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["personal_period_id"], ["personal_periods.id"], ondelete="CASCADE"
        ),
        sa.CheckConstraint(
            "importo IS NULL OR importo >= 0", name="ck_personal_expense_importo_non_negativo"
        ),
    )
    op.create_index(
        "ix_personal_expenses_personal_period_id", "personal_expenses", ["personal_period_id"]
    )
    op.create_index("ix_personal_expenses_categoria", "personal_expenses", ["categoria"])


def downgrade() -> None:
    op.drop_index("ix_personal_expenses_categoria", table_name="personal_expenses")
    op.drop_index("ix_personal_expenses_personal_period_id", table_name="personal_expenses")
    op.drop_table("personal_expenses")
    op.drop_index("ix_personal_incomes_categoria", table_name="personal_incomes")
    op.drop_index("ix_personal_incomes_personal_period_id", table_name="personal_incomes")
    op.drop_table("personal_incomes")
    op.drop_index("ix_personal_periods_owner_id", table_name="personal_periods")
    op.drop_table("personal_periods")

    bind = op.get_bind()
    postgresql.ENUM(*CATEGORIA_USCITA_VALUES, name="categoria_uscita").drop(
        bind, checkfirst=True
    )
    postgresql.ENUM(*CATEGORIA_ENTRATA_VALUES, name="categoria_entrata").drop(
        bind, checkfirst=True
    )
