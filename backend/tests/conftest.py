"""Fixture di test: app FastAPI su SQLite in-memory + client HTTP autenticato."""

from __future__ import annotations

import os

# Le impostazioni vengono lette all'import: forziamo l'ambiente di test prima
# di importare qualsiasi modulo applicativo.
os.environ["ENVIRONMENT"] = "test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["SECRET_KEY"] = "chiave-di-test-solo-per-i-test-1234567890"
os.environ["SQL_ECHO"] = "False"

from collections.abc import AsyncGenerator  # noqa: E402
from decimal import Decimal  # noqa: E402

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import event, select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api.deps import get_session  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models.expense import Expense  # noqa: E402
from app.models.member import Member  # noqa: E402
from app.models.period import Period  # noqa: E402
from app.models.settlement import Settlement  # noqa: E402
from app.services.seed_data import SEED_EXPENSES  # noqa: E402

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

USER_PAYLOAD = {
    "nome": "Giuseppe",
    "email": "test@spesecasa.it",
    "password": "password123",
}


@pytest_asyncio.fixture
async def engine():
    """Engine SQLite in-memory condiviso da tutte le connessioni del test."""
    eng = create_async_engine(
        TEST_DB_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    # SQLite disattiva le foreign key per default: senza questo pragma le
    # ON DELETE CASCADE non scatterebbero (in Postgres sono attive di base).
    @event.listens_for(eng.sync_engine, "connect")
    def _fk_pragma(dbapi_conn, _record):  # pragma: no cover - hook di connessione
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def session_factory(engine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


@pytest_asyncio.fixture
async def db(session_factory) -> AsyncGenerator[AsyncSession, None]:
    async with session_factory() as s:
        yield s


@pytest_asyncio.fixture
async def client(session_factory) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as s:
            try:
                yield s
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient) -> AsyncGenerator[AsyncClient, None]:
    """Client con utente registrato e header Authorization impostato."""
    res = await client.post("/api/v1/auth/register", json=USER_PAYLOAD)
    assert res.status_code == 201, res.text
    tokens = res.json()
    client.headers["Authorization"] = f"Bearer {tokens['access_token']}"
    yield client


@pytest_asyncio.fixture
async def members(auth_client: AsyncClient) -> list[dict]:
    res = await auth_client.get("/api/v1/members")
    assert res.status_code == 200, res.text
    return res.json()


@pytest_asyncio.fixture
async def period(auth_client: AsyncClient) -> dict:
    res = await auth_client.post(
        "/api/v1/periods", json={"nome": "Ottobre 2025", "precompila_ricorrenti": False}
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest_asyncio.fixture
async def seeded_period(db: AsyncSession, auth_client: AsyncClient, period: dict) -> dict:
    """Periodo popolato con le 31 spese di riferimento del foglio."""
    res = await db.execute(select(Member).order_by(Member.id))
    member_a, member_b = list(res.scalars().all())
    by_key = {"A": member_a, "B": member_b}

    for row in SEED_EXPENSES:
        db.add(
            Expense(
                period_id=period["id"],
                data=row.data,
                descrizione=row.descrizione,
                categoria=row.categoria,
                paid_by_id=by_key[row.membro].id,
                importo=row.importo,
            )
        )
    await db.commit()
    return period


@pytest_asyncio.fixture
async def period_obj(db: AsyncSession, period: dict) -> Period:
    res = await db.execute(select(Period).where(Period.id == period["id"]))
    return res.scalar_one()


@pytest.fixture
def zero() -> Decimal:
    return Decimal("0.00")


@pytest_asyncio.fixture
async def settlement_of(db: AsyncSession):
    async def _get(period_id: int) -> Settlement | None:
        res = await db.execute(select(Settlement).where(Settlement.period_id == period_id))
        return res.scalar_one_or_none()

    return _get


SECOND_USER_PAYLOAD = {
    "nome": "Angela",
    "email": "altra@spesecasa.it",
    "password": "password456",
}


@pytest_asyncio.fixture
async def other_client(session_factory) -> AsyncGenerator[AsyncClient, None]:
    """Secondo utente, con client HTTP separato: serve ai test di isolamento."""

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as s:
            try:
                yield s
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/v1/auth/register", json=SECOND_USER_PAYLOAD)
        assert res.status_code == 201, res.text
        ac.headers["Authorization"] = f"Bearer {res.json()['access_token']}"
        yield ac


@pytest_asyncio.fixture
async def personal_period(auth_client: AsyncClient) -> dict:
    res = await auth_client.post(
        "/api/v1/personal/periods",
        json={"etichetta": "Ottobre 2026", "precompila_da_precedente": False},
    )
    assert res.status_code == 201, res.text
    return res.json()


@pytest_asyncio.fixture
async def seeded_personal_period(auth_client: AsyncClient, personal_period: dict) -> dict:
    """Mese popolato con le righe reali del foglio "Budget mensile 2026"."""
    from app.services.personal_seed_data import PERSONAL_SEED_PERIODS

    modello = PERSONAL_SEED_PERIODS[0]
    base = f"/api/v1/personal/periods/{personal_period['id']}"

    for riga in modello.incomes:
        res = await auth_client.post(
            f"{base}/incomes",
            json={
                "categoria": riga.categoria.value,
                "dettaglio": riga.dettaglio,
                "importo": str(riga.importo) if riga.importo is not None else None,
            },
        )
        assert res.status_code == 201, res.text

    for riga in modello.expenses:
        res = await auth_client.post(
            f"{base}/expenses",
            json={
                "categoria": riga.categoria.value,
                "negozio_dettaglio": riga.negozio_dettaglio,
                "importo": str(riga.importo) if riga.importo is not None else None,
                "pagato": riga.pagato,
            },
        )
        assert res.status_code == 201, res.text

    return personal_period


PARTNER_PAYLOAD = {
    "nome": "Angela",
    "email": "partner@spesecasa.it",
    "password": "password789",
}


@pytest_asyncio.fixture
async def partner_client(
    session_factory, db: AsyncSession, auth_client: AsyncClient
) -> AsyncGenerator[AsyncClient, None]:
    """Secondo utente **dello stesso household**, collegato al membro B.

    Non esiste un flusso di invito: per i test si crea l'utente a mano e lo si
    aggancia al secondo membro, che e' quel che farebbe un invito.
    """
    from app.core.security import create_access_token, hash_password
    from app.models.user import User

    primo = (
        await db.execute(select(User).where(User.email == USER_PAYLOAD["email"]))
    ).unique().scalar_one()

    partner = User(
        nome=PARTNER_PAYLOAD["nome"],
        email=PARTNER_PAYLOAD["email"],
        password_hash=hash_password(PARTNER_PAYLOAD["password"]),
        household_id=primo.household_id,
    )
    db.add(partner)
    await db.flush()

    membri = (
        await db.execute(
            select(Member).where(Member.household_id == primo.household_id).order_by(Member.id)
        )
    ).scalars().all()
    membri[1].user_id = partner.id
    await db.commit()

    async def override_get_session() -> AsyncGenerator[AsyncSession, None]:
        async with session_factory() as s:
            try:
                yield s
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_session] = override_get_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        ac.headers["Authorization"] = f"Bearer {create_access_token(partner.id)}"
        yield ac
