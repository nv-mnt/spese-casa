"""Schema iniziale: households, users, members, periods, expenses, settlements, ricorrenti

Revision ID: 0001_initial
Revises:
Create Date: 2025-09-22

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CATEGORIA_VALUES = (
    "Casa",
    "Affitto",
    "Bollette",
    "Spesa",
    "Trasporti",
    "Svago",
    "Salute",
    "Altro",
)

# ``create_type=False``: il tipo viene creato/eliminato esplicitamente in
# upgrade()/downgrade(), altrimenti ``create_table`` proverebbe a crearlo
# una seconda volta e Postgres solleverebbe DuplicateObject.
categoria_enum = postgresql.ENUM(*CATEGORIA_VALUES, name="categoria", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    postgresql.ENUM(*CATEGORIA_VALUES, name="categoria").create(bind, checkfirst=True)

    op.create_table(
        "households",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("valuta", sa.String(length=3), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("household_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_household_id", "users", ["household_id"])

    op.create_table(
        "members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("household_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("colore", sa.String(length=7), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("household_id", "nome", name="uq_member_household_nome"),
    )
    op.create_index("ix_members_household_id", "members", ["household_id"])

    op.create_table(
        "periods",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("household_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("household_id", "nome", name="uq_period_household_nome"),
    )
    op.create_index("ix_periods_household_id", "periods", ["household_id"])

    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column("data", sa.Date(), nullable=True),
        sa.Column("descrizione", sa.String(length=255), nullable=False),
        sa.Column("categoria", categoria_enum, nullable=False),
        sa.Column("paid_by_id", sa.Integer(), nullable=False),
        sa.Column("importo", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("importo > 0", name="ck_expense_importo_positivo"),
        sa.ForeignKeyConstraint(["period_id"], ["periods.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["paid_by_id"], ["members.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_expenses_period_id", "expenses", ["period_id"])
    op.create_index("ix_expenses_paid_by_id", "expenses", ["paid_by_id"])
    op.create_index("ix_expenses_categoria", "expenses", ["categoria"])

    op.create_table(
        "settlements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column(
            "rimborso_versato",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("ricevuto", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.CheckConstraint("rimborso_versato >= 0", name="ck_settlement_rimborso_non_negativo"),
        sa.ForeignKeyConstraint(["period_id"], ["periods.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_settlements_period_id", "settlements", ["period_id"], unique=True)

    op.create_table(
        "recurring_expense_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("household_id", sa.Integer(), nullable=False),
        sa.Column("descrizione", sa.String(length=255), nullable=False),
        sa.Column("categoria", categoria_enum, nullable=False),
        sa.Column("importo", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("paid_by_id", sa.Integer(), nullable=True),
        sa.Column("attivo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("ordine", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.ForeignKeyConstraint(["household_id"], ["households.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["paid_by_id"], ["members.id"], ondelete="SET NULL"),
    )
    op.create_index(
        "ix_recurring_expense_templates_household_id",
        "recurring_expense_templates",
        ["household_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_recurring_expense_templates_household_id", table_name="recurring_expense_templates"
    )
    op.drop_table("recurring_expense_templates")
    op.drop_index("ix_settlements_period_id", table_name="settlements")
    op.drop_table("settlements")
    op.drop_index("ix_expenses_categoria", table_name="expenses")
    op.drop_index("ix_expenses_paid_by_id", table_name="expenses")
    op.drop_index("ix_expenses_period_id", table_name="expenses")
    op.drop_table("expenses")
    op.drop_index("ix_periods_household_id", table_name="periods")
    op.drop_table("periods")
    op.drop_index("ix_members_household_id", table_name="members")
    op.drop_table("members")
    op.drop_index("ix_users_household_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("households")
    postgresql.ENUM(*CATEGORIA_VALUES, name="categoria").drop(
        op.get_bind(), checkfirst=True
    )
