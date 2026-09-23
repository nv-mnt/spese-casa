"""Carica nel budget personale i dati del foglio "Budget mensile 2026".

    python -m app.personal_seed --email tu@esempio.it
    python -m app.personal_seed --email tu@esempio.it --force

Il budget personale e' privato: i dati finiscono nell'account indicato e in
nessun altro. Senza ``--force`` i mesi gia' presenti vengono saltati.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select

from app.crud.user import get_user_by_email
from app.db.session import AsyncSessionLocal
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.services.personal_seed_data import PERSONAL_SEED_PERIODS
from app.services.personal_summary import build_personal_summary


async def seed(email: str, force: bool = False) -> int:
    async with AsyncSessionLocal() as db:
        user = await get_user_by_email(db, email)
        if user is None:
            print(f"Utente {email!r} non trovato.", file=sys.stderr)
            return 1

        for modello in PERSONAL_SEED_PERIODS:
            esistente = (
                await db.execute(
                    select(PersonalPeriod).where(
                        PersonalPeriod.owner_id == user.id,
                        PersonalPeriod.etichetta == modello.etichetta,
                    )
                )
            ).scalar_one_or_none()

            if esistente is not None:
                if not force:
                    print(f"[=] {modello.etichetta} esiste gia', salto (usa --force)")
                    continue
                await db.delete(esistente)
                await db.flush()
                print(f"[~] {modello.etichetta} ricreato")

            period = PersonalPeriod(owner_id=user.id, etichetta=modello.etichetta)
            db.add(period)
            await db.flush()

            for riga in modello.incomes:
                db.add(
                    Income(
                        personal_period_id=period.id,
                        categoria=riga.categoria,
                        dettaglio=riga.dettaglio,
                        importo=riga.importo,
                    )
                )
            for riga in modello.expenses:
                db.add(
                    PersonalExpense(
                        personal_period_id=period.id,
                        categoria=riga.categoria,
                        negozio_dettaglio=riga.negozio_dettaglio,
                        importo=riga.importo,
                        pagato=riga.pagato,
                    )
                )
            await db.flush()

            riepilogo = build_personal_summary(
                period=period,
                incomes=list(
                    (
                        await db.execute(
                            select(Income).where(Income.personal_period_id == period.id)
                        )
                    ).scalars()
                ),
                expenses=list(
                    (
                        await db.execute(
                            select(PersonalExpense).where(
                                PersonalExpense.personal_period_id == period.id
                            )
                        )
                    ).scalars()
                ),
                valuta=user.household.valuta,
            )
            print(
                f"[+] {period.etichetta}: entrate {riepilogo.entrate_totali} | "
                f"uscite {riepilogo.uscite_totali} | "
                f"saldo carta {riepilogo.saldo_reale} | "
                f"dopo sospese {riepilogo.saldo_dopo_sospese}"
            )

        await db.commit()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True, help="Proprietario del budget personale")
    parser.add_argument(
        "--force", action="store_true", help="Ricrea i mesi gia' presenti"
    )
    args = parser.parse_args()
    return asyncio.run(seed(args.email, args.force))


if __name__ == "__main__":
    raise SystemExit(main())
