"""Spesa interamente a carico di un membro + rilevazioni del saldo carta

Revision ID: 0005_charge_card
Revises: 0004_trash_links
Create Date: 2026-10-12

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_charge_card"
down_revision: str | None = "0004_trash_links"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- 1) Spesa condivisa a carico di un solo membro -----------------------
    # NULL = divisa 50/50 (comportamento storico di tutte le righe esistenti).
    op.add_column("expenses", sa.Column("a_carico_di_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_expenses_a_carico_di_id_members",
        "expenses",
        "members",
        ["a_carico_di_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index("ix_expenses_a_carico_di_id", "expenses", ["a_carico_di_id"])

    # --- 2) Rilevazioni del saldo carta --------------------------------------
    op.create_table(
        "card_balance_readings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("personal_period_id", sa.Integer(), nullable=False),
        sa.Column("saldo", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column(
            "rilevato_il",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("nota", sa.String(length=255), nullable=True),
        sa.Column(
            "entrate_tracciate",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "uscite_pagate_tracciate",
            sa.Numeric(precision=12, scale=2),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "entrate_tracciate >= 0 AND uscite_pagate_tracciate >= 0",
            name="ck_card_reading_tracciati_non_negativi",
        ),
        sa.ForeignKeyConstraint(
            ["personal_period_id"], ["personal_periods.id"], ondelete="CASCADE"
        ),
    )
    op.create_index(
        "ix_card_balance_readings_personal_period_id",
        "card_balance_readings",
        ["personal_period_id"],
    )
    op.create_index(
        "ix_card_balance_readings_rilevato_il", "card_balance_readings", ["rilevato_il"]
    )


def downgrade() -> None:
    op.drop_index("ix_card_balance_readings_rilevato_il", table_name="card_balance_readings")
    op.drop_index(
        "ix_card_balance_readings_personal_period_id", table_name="card_balance_readings"
    )
    op.drop_table("card_balance_readings")

    op.drop_index("ix_expenses_a_carico_di_id", table_name="expenses")
    op.drop_constraint("fk_expenses_a_carico_di_id_members", "expenses", type_="foreignkey")
    op.drop_column("expenses", "a_carico_di_id")
