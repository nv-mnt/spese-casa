"""Popola il database con i dati d'esempio del foglio.

    python -m app.seed            # crea utente demo + periodo "Ottobre 2025"
    python -m app.seed --force    # ricrea il periodo se esiste gia'

Credenziali create: demo@spesecasa.it / demo1234
"""

from __future__ import annotations

import argparse
import asyncio
import sys
from decimal import Decimal

from sqlalchemy import delete, select

from app.crud.user import create_user, get_user_by_email
from app.db.session import AsyncSessionLocal
from app.models.common_income import CommonIncome
from app.models.expense import Expense
from app.models.member import Member
from app.models.period import Period
from app.models.settlement import Settlement
from app.schemas.auth import UserRegister
from app.services.seed_data import (
    EXPECTED_ENTRATE_COMUNI,
    EXPECTED_NETTO,
    EXPECTED_PAGATO_A,
    EXPECTED_PAGATO_B,
    EXPECTED_QUOTA_CON_ENTRATE,
    EXPECTED_SALDO_CON_ENTRATE,
    EXPECTED_TOTALE,
    SEED_COMMON_INCOMES,
    SEED_EXPENSES,
    SEED_RIMBORSO_VERSATO,
    SEED_PERIOD_NOME,
    SEED_USER_EMAIL,
    SEED_USER_NOME,
    SEED_USER_PASSWORD,
)
from app.services.personal_sync import sync_period
from app.services.summary import build_period_summary


async def seed(force: bool = False) -> int:
    async with AsyncSessionLocal() as db:
        user = await get_user_by_email(db, SEED_USER_EMAIL)
        if user is None:
            user = await create_user(
                db,
                UserRegister(
                    nome=SEED_USER_NOME,
                    email=SEED_USER_EMAIL,
                    password=SEED_USER_PASSWORD,
                    household_nome="Casa Giuseppe & Angela",
                ),
            )
            await db.commit()
            print(f"[seed] Creato utente {SEED_USER_EMAIL} (password: {SEED_USER_PASSWORD})")
        else:
            print(f"[seed] Utente {SEED_USER_EMAIL} gia' presente")

        household_id = user.household_id

        members_res = await db.execute(
            select(Member).where(Member.household_id == household_id).order_by(Member.id)
        )
        members = list(members_res.scalars().all())
        if len(members) != 2:
            print(f"[seed] ERRORE: attesi 2 membri, trovati {len(members)}", file=sys.stderr)
            return 1
        member_a, member_b = members
        member_by_key = {"A": member_a, "B": member_b}

        existing = await db.execute(
            select(Period).where(
                Period.household_id == household_id, Period.nome == SEED_PERIOD_NOME
            )
        )
        period = existing.scalar_one_or_none()
        if period is not None:
            if not force:
                print(
                    f"[seed] Il periodo {SEED_PERIOD_NOME!r} esiste gia'. "
                    "Usa --force per ricrearlo."
                )
                return 0
            await db.execute(delete(Period).where(Period.id == period.id))
            await db.flush()
            print(f"[seed] Periodo {SEED_PERIOD_NOME!r} rimosso (--force)")

        period = Period(household_id=household_id, nome=SEED_PERIOD_NOME)
        db.add(period)
        await db.flush()
        # Un conguaglio parziale gia' versato: serve a mostrare la voce
        # derivata "Conguaglio" nel budget personale di entrambi.
        db.add(
            Settlement(
                period_id=period.id,
                rimborso_versato=SEED_RIMBORSO_VERSATO,
                ricevuto=False,
            )
        )

        for row in SEED_EXPENSES:
            db.add(
                Expense(
                    period_id=period.id,
                    data=row.data,
                    descrizione=row.descrizione,
                    categoria=row.categoria,
                    paid_by_id=member_by_key[row.membro].id,
                    importo=row.importo,
                )
            )
        for row in SEED_COMMON_INCOMES:
            db.add(
                CommonIncome(
                    period_id=period.id,
                    data=row.data,
                    descrizione=row.descrizione,
                    categoria=row.categoria,
                    ricevuto_da_id=member_by_key[row.membro].id,
                    importo=row.importo,
                )
            )
        await db.commit()

        # Riflette nel budget personale quel che tocca davvero le carte.
        await sync_period(db, period)
        await db.commit()

        # --- autocontrollo: i totali devono coincidere con il foglio ---
        expenses_res = await db.execute(select(Expense).where(Expense.period_id == period.id))
        expenses = list(expenses_res.unique().scalars().all())
        incomes_res = await db.execute(
            select(CommonIncome).where(CommonIncome.period_id == period.id)
        )
        common_incomes = list(incomes_res.unique().scalars().all())
        settlement_res = await db.execute(
            select(Settlement).where(Settlement.period_id == period.id)
        )
        summary = build_period_summary(
            period=period,
            members=members,
            expenses=expenses,
            common_incomes=common_incomes,
            settlement=settlement_res.scalar_one_or_none(),
        )

        checks = {
            "totale_speso": (summary.totale_speso, EXPECTED_TOTALE),
            f"ha_pagato_{member_a.nome}": (summary.per_membro[0].ha_pagato, EXPECTED_PAGATO_A),
            f"ha_pagato_{member_b.nome}": (summary.per_membro[1].ha_pagato, EXPECTED_PAGATO_B),
            "entrate_comuni": (summary.entrate_comuni_totali, EXPECTED_ENTRATE_COMUNI),
            "netto_da_dividere": (summary.netto_da_dividere, EXPECTED_NETTO),
            "quota_a_testa": (summary.quota_a_testa, EXPECTED_QUOTA_CON_ENTRATE),
            "saldo": (summary.saldo, EXPECTED_SALDO_CON_ENTRATE),
        }
        ok = True
        print(
            f"[seed] Periodo {SEED_PERIOD_NOME!r}: {len(expenses)} spese e "
            f"{len(common_incomes)} entrate comuni inserite"
        )
        for etichetta, (ottenuto, atteso) in checks.items():
            simbolo = "OK " if ottenuto == atteso else "KO "
            if ottenuto != atteso:
                ok = False
            print(f"       {simbolo} {etichetta:24} {ottenuto:>10} (atteso {atteso})")
        print(f"       -> {summary.chi_deve_a_chi}")

        if not ok:
            print("[seed] ERRORE: i totali non coincidono con il riferimento", file=sys.stderr)
            return 1
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed dei dati d'esempio")
    parser.add_argument(
        "--force", action="store_true", help="ricrea il periodo di esempio se esiste"
    )
    args = parser.parse_args()
    raise SystemExit(asyncio.run(seed(force=args.force)))


if __name__ == "__main__":
    main()
