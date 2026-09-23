"""
Semina (e ri-semina) il database usato dai test end-to-end.

Sta su un file SQLite dedicato, mai sul Postgres di sviluppo: i test possono
cancellare e ricreare tutto senza toccare i dati veri.

I numeri sono scelti tondi apposta, cosi' le asserzioni dei test si leggono
come un conto fatto a mano:

Settembre 2026 (mese corrente)
    Giuseppe  Affitto 900 + Spesa 100 = 1000
    Angela    Casa     200            =  200
    entrata comune: reso 100 incassato da Giuseppe
    -> totale 1200, entrate comuni 100, netto 1100, quota 550
       contributo Giuseppe 900, Angela 200, saldo 350 (Angela deve a Giuseppe)

Agosto 2026 (il caso 300/150 del collegamento casa -> personale)
    Giuseppe paga 300 di affitto, Angela versa 150 di conguaglio
    -> per Giuseppe: uscita derivata 300 + entrata derivata 150 = saldo -150

Luglio 2026 (serve solo ad avere tre mesi per gli andamenti)
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path

RADICE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RADICE))

DB_PATH = Path(os.environ.get("E2E_DB_PATH", RADICE / "e2e.db"))

# Le impostazioni si leggono all'import: l'ambiente va forzato prima.
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{DB_PATH}"
os.environ.setdefault("SECRET_KEY", "chiave-e2e-solo-per-i-test-1234567890")
os.environ["SQL_ECHO"] = "False"

from sqlalchemy import event  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.models.common_income import CommonIncome  # noqa: E402
from app.models.enums import (  # noqa: E402
    Categoria,
    CategoriaEntrata,
    CategoriaEntrataComune,
    CategoriaUscita,
)
from app.models.expense import Expense  # noqa: E402
from app.models.household import Household  # noqa: E402
from app.models.member import Member  # noqa: E402
from app.models.period import Period  # noqa: E402
from app.models.personal import Income, PersonalExpense, PersonalPeriod  # noqa: E402
from app.models.recurring import RecurringExpenseTemplate  # noqa: E402  (registra la tabella)
from app.models.settlement import Settlement  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.personal_sync import sync_household  # noqa: E402

PASSWORD = "password123"
EMAIL_A = "giuseppe@e2etest.it"
EMAIL_B = "angela@e2etest.it"

MESE_CORRENTE = "Settembre 2026"
MESE_PRECEDENTE = "Agosto 2026"
MESE_VECCHIO = "Luglio 2026"


async def semina() -> None:
    motore = create_async_engine(os.environ["DATABASE_URL"], future=True)

    @event.listens_for(motore.sync_engine, "connect")
    def _pragma(dbapi_conn, _record):  # pragma: no cover - hook di connessione
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")
        cur.execute("PRAGMA busy_timeout=10000")
        cur.close()

    async with motore.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    Sessione = async_sessionmaker(motore, expire_on_commit=False)
    async with Sessione() as db:
        casa = Household(id=1, nome="Casa E2E", valuta="EUR")
        db.add(casa)
        await db.flush()

        giuseppe = Member(id=1, household_id=1, nome="Giuseppe", colore="#2563eb")
        angela = Member(id=2, household_id=1, nome="Angela", colore="#db2777")
        db.add_all([giuseppe, angela])
        await db.flush()

        utente_a = User(
            id=1,
            nome="Giuseppe",
            email=EMAIL_A,
            password_hash=hash_password(PASSWORD),
            household_id=1,
        )
        utente_b = User(
            id=2,
            nome="Angela",
            email=EMAIL_B,
            password_hash=hash_password(PASSWORD),
            household_id=1,
        )
        db.add_all([utente_a, utente_b])
        await db.flush()
        giuseppe.user_id = utente_a.id
        angela.user_id = utente_b.id
        await db.flush()

        # --- Luglio: due spese pari, serve solo agli andamenti --------------
        luglio = Period(id=1, household_id=1, nome=MESE_VECCHIO)
        db.add(luglio)
        await db.flush()
        db.add_all(
            [
                Expense(
                    period_id=luglio.id,
                    data=date(2026, 7, 10),
                    descrizione="Spesa luglio",
                    categoria=Categoria.SPESA,
                    paid_by_id=giuseppe.id,
                    importo=Decimal("100.00"),
                ),
                Expense(
                    period_id=luglio.id,
                    data=date(2026, 7, 12),
                    descrizione="Casa luglio",
                    categoria=Categoria.CASA,
                    paid_by_id=angela.id,
                    importo=Decimal("100.00"),
                ),
            ]
        )

        # --- Agosto: il caso 300 / 150 -------------------------------------
        agosto = Period(id=2, household_id=1, nome=MESE_PRECEDENTE)
        db.add(agosto)
        await db.flush()
        db.add(
            Expense(
                period_id=agosto.id,
                data=date(2026, 8, 1),
                descrizione="Affitto agosto",
                categoria=Categoria.AFFITTO,
                paid_by_id=giuseppe.id,
                importo=Decimal("300.00"),
            )
        )
        db.add(
            Settlement(
                period_id=agosto.id,
                rimborso_versato=Decimal("150.00"),
                ricevuto=True,
            )
        )

        # --- Settembre: il mese corrente ------------------------------------
        settembre = Period(id=3, household_id=1, nome=MESE_CORRENTE)
        db.add(settembre)
        await db.flush()
        db.add_all(
            [
                Expense(
                    period_id=settembre.id,
                    data=date(2026, 9, 1),
                    descrizione="Affitto settembre",
                    categoria=Categoria.AFFITTO,
                    paid_by_id=giuseppe.id,
                    importo=Decimal("900.00"),
                ),
                Expense(
                    period_id=settembre.id,
                    data=date(2026, 9, 5),
                    descrizione="Spesa settimanale",
                    categoria=Categoria.SPESA,
                    paid_by_id=giuseppe.id,
                    importo=Decimal("100.00"),
                ),
                Expense(
                    period_id=settembre.id,
                    data=date(2026, 9, 7),
                    descrizione="Detersivi",
                    categoria=Categoria.CASA,
                    paid_by_id=angela.id,
                    importo=Decimal("200.00"),
                ),
            ]
        )
        db.add(
            CommonIncome(
                period_id=settembre.id,
                data=date(2026, 9, 9),
                descrizione="Reso Amazon",
                categoria=CategoriaEntrataComune.RESO,
                ricevuto_da_id=giuseppe.id,
                importo=Decimal("100.00"),
            )
        )

        # --- Budget personale di Giuseppe (le voci scritte a mano) ----------
        personale = PersonalPeriod(id=1, owner_id=utente_a.id, etichetta=MESE_CORRENTE)
        db.add(personale)
        await db.flush()
        db.add_all(
            [
                Income(
                    personal_period_id=personale.id,
                    categoria=CategoriaEntrata.STIPENDIO,
                    dettaglio="Stipendio",
                    importo=Decimal("2000.00"),
                ),
                PersonalExpense(
                    personal_period_id=personale.id,
                    categoria=CategoriaUscita.ALTRO,
                    negozio_dettaglio="Palestra",
                    importo=Decimal("50.00"),
                    pagato=True,
                ),
                PersonalExpense(
                    personal_period_id=personale.id,
                    categoria=CategoriaUscita.ALTRO,
                    negozio_dettaglio="Libro",
                    importo=Decimal("20.00"),
                    pagato=False,
                ),
            ]
        )
        await db.flush()

        # Riflesso casa -> personale: come dopo ogni modifica dalla UI.
        await sync_household(db, casa.id)
        await db.commit()

    await motore.dispose()


if __name__ == "__main__":
    asyncio.run(semina())
    print(f"seed E2E pronto: {DB_PATH}")
