"""Test degli endpoint di autenticazione."""

from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import USER_PAYLOAD

BASE = "/api/v1/auth"


async def test_health(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


async def test_register_restituisce_i_token(client: AsyncClient):
    res = await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"] and body["refresh_token"]
    assert body["expires_in"] > 0


async def test_register_crea_household_e_due_membri(client: AsyncClient):
    await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    login = await client.post(
        f"{BASE}/login",
        json={"email": USER_PAYLOAD["email"], "password": USER_PAYLOAD["password"]},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    me = await client.get(f"{BASE}/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == USER_PAYLOAD["email"]
    assert me.json()["household"]["valuta"] == "EUR"

    members = await client.get("/api/v1/members", headers=headers)
    assert members.status_code == 200
    nomi = [m["nome"] for m in members.json()]
    assert nomi == ["Giuseppe", "Angela"]


async def test_register_email_duplicata(client: AsyncClient):
    await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    res = await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    assert res.status_code == 409


async def test_register_password_troppo_corta(client: AsyncClient):
    res = await client.post(
        f"{BASE}/register", json={**USER_PAYLOAD, "email": "x@y.it", "password": "corta"}
    )
    assert res.status_code == 422


async def test_login_password_errata(client: AsyncClient):
    await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    res = await client.post(
        f"{BASE}/login", json={"email": USER_PAYLOAD["email"], "password": "sbagliata"}
    )
    assert res.status_code == 401


async def test_login_utente_inesistente(client: AsyncClient):
    res = await client.post(
        f"{BASE}/login", json={"email": "nessuno@spesecasa.it", "password": "password123"}
    )
    assert res.status_code == 401


async def test_login_form_per_swagger(client: AsyncClient):
    await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    res = await client.post(
        f"{BASE}/token",
        data={"username": USER_PAYLOAD["email"], "password": USER_PAYLOAD["password"]},
    )
    assert res.status_code == 200
    assert res.json()["access_token"]


async def test_refresh_rinnova_i_token(client: AsyncClient):
    reg = await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    refresh_token = reg.json()["refresh_token"]

    res = await client.post(f"{BASE}/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    assert res.json()["access_token"]


async def test_refresh_rifiuta_un_access_token(client: AsyncClient):
    """Un access token non deve essere accettato come refresh token."""
    reg = await client.post(f"{BASE}/register", json=USER_PAYLOAD)
    res = await client.post(
        f"{BASE}/refresh", json={"refresh_token": reg.json()["access_token"]}
    )
    assert res.status_code == 401


async def test_refresh_token_malformato(client: AsyncClient):
    res = await client.post(f"{BASE}/refresh", json={"refresh_token": "non-un-jwt"})
    assert res.status_code == 401


async def test_endpoint_protetti_senza_token(client: AsyncClient):
    for url in ("/api/v1/auth/me", "/api/v1/members", "/api/v1/periods"):
        res = await client.get(url)
        assert res.status_code == 401, url


async def test_token_non_valido(client: AsyncClient):
    res = await client.get(
        "/api/v1/periods", headers={"Authorization": "Bearer token.non.valido"}
    )
    assert res.status_code == 401
