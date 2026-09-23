"""Cestino (soft delete), voci derivate, opt-in e legame membro-utente

Revision ID: 0004_trash_links
Revises: 0003_common_incomes
Create Date: 2026-09-23

"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004_trash_links"
down_revision: str | None = "0003_common_incomes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

#: Tutte le entita' che finiscono nel cestino invece di sparire.
TABELLE_CESTINABILI = (
    "periods",
    "expenses",
    "common_incomes",
    "personal_periods",
    "personal_incomes",
    "personal_expenses",
)

ORIGINE_VALUES = ("spesa_casa", "entrata_comune", "conguaglio")

origine_enum = postgresql.ENUM(*ORIGINE_VALUES, name="origine_voce", create_type=False)

#: Categorie che esistono nelle spese di casa ma mancavano fra quelle
#: personali: servono per riflettere una spesa condivisa senza perderne la
#: categoria originale.
CATEGORIE_USCITA_NUOVE = ("Casa", "Bollette")


def upgrade() -> None:
    bind = op.get_bind()

    # --- cestino ----------------------------------------------------------
    for tabella in TABELLE_CESTINABILI:
        op.add_column(
            tabella, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True)
        )
        op.add_column(tabella, sa.Column("deleted_by_id", sa.Integer(), nullable=True))
        op.create_index(f"ix_{tabella}_deleted_at", tabella, ["deleted_at"])
        op.create_foreign_key(
            f"fk_{tabella}_deleted_by_id_users",
            tabella,
            "users",
            ["deleted_by_id"],
            ["id"],
            ondelete="SET NULL",
        )

    # --- voci derivate ----------------------------------------------------
    postgresql.ENUM(*ORIGINE_VALUES, name="origine_voce").create(bind, checkfirst=True)
    for tabella in ("personal_incomes", "personal_expenses"):
        op.add_column(tabella, sa.Column("source_type", origine_enum, nullable=True))
        op.add_column(tabella, sa.Column("source_id", sa.Integer(), nullable=True))
        op.create_index(f"ix_{tabella}_source_type", tabella, ["source_type"])
        # Una sorgente genera al massimo una voce per periodo personale.
        op.create_index(
            f"uq_{tabella}_source",
            tabella,
            ["personal_period_id", "source_type", "source_id"],
            unique=True,
            postgresql_where=sa.text("source_type IS NOT NULL"),
        )

    # Le due categorie mancanti fra le uscite personali. ALTER TYPE ADD VALUE
    # non puo' stare nella stessa transazione in cui il tipo viene usato.
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            for valore in CATEGORIE_USCITA_NUOVE:
                op.execute(
                    f"ALTER TYPE categoria_uscita ADD VALUE IF NOT EXISTS '{valore}'"
                )

    # --- opt-in -----------------------------------------------------------
    op.add_column(
        "users",
        sa.Column(
            "rifletti_spese_casa",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    # --- legame membro -> utente -----------------------------------------
    op.add_column("members", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_unique_constraint("uq_members_user_id", "members", ["user_id"])
    op.create_foreign_key(
        "fk_members_user_id_users", "members", "users", ["user_id"], ["id"], ondelete="SET NULL"
    )

    # Backfill: nello household, il membro che si chiama come un utente e' lui.
    op.execute(
        """
        UPDATE members m
           SET user_id = u.id
          FROM users u
         WHERE u.household_id = m.household_id
           AND lower(trim(u.nome)) = lower(trim(m.nome))
           AND NOT EXISTS (
                 SELECT 1 FROM members m2
                  WHERE m2.user_id = u.id AND m2.id <> m.id
               )
        """
    )


def downgrade() -> None:
    op.drop_constraint("fk_members_user_id_users", "members", type_="foreignkey")
    op.drop_constraint("uq_members_user_id", "members", type_="unique")
    op.drop_column("members", "user_id")

    op.drop_column("users", "rifletti_spese_casa")

    for tabella in ("personal_incomes", "personal_expenses"):
        op.drop_index(f"uq_{tabella}_source", table_name=tabella)
        op.drop_index(f"ix_{tabella}_source_type", table_name=tabella)
        op.drop_column(tabella, "source_id")
        op.drop_column(tabella, "source_type")
    postgresql.ENUM(*ORIGINE_VALUES, name="origine_voce").drop(
        op.get_bind(), checkfirst=True
    )

    for tabella in TABELLE_CESTINABILI:
        op.drop_constraint(f"fk_{tabella}_deleted_by_id_users", tabella, type_="foreignkey")
        op.drop_index(f"ix_{tabella}_deleted_at", table_name=tabella)
        op.drop_column(tabella, "deleted_by_id")
        op.drop_column(tabella, "deleted_at")

    # I valori aggiunti a un enum Postgres non sono rimovibili: restano.
