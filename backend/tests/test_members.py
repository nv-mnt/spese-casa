"""Test degli endpoint sui membri."""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1/members"


async def test_list_members(auth_client: AsyncClient):
    res = await auth_client.get(BASE)
    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2
    assert body[0]["nome"] == "Giuseppe"
    assert body[0]["iniziali"] == "G"
    assert body[1]["nome"] == "Angela"
    assert body[0]["colore"].startswith("#")


async def test_update_member(auth_client: AsyncClient, members: list[dict]):
    res = await auth_client.patch(
        f"{BASE}/{members[0]['id']}", json={"nome": "Peppe", "colore": "#123456"}
    )
    assert res.status_code == 200
    assert res.json()["nome"] == "Peppe"
    assert res.json()["colore"] == "#123456"


async def test_update_member_colore_non_valido(auth_client: AsyncClient, members: list[dict]):
    res = await auth_client.patch(f"{BASE}/{members[0]['id']}", json={"colore": "rosso"})
    assert res.status_code == 422


async def test_update_member_nome_duplicato(auth_client: AsyncClient, members: list[dict]):
    res = await auth_client.patch(f"{BASE}/{members[0]['id']}", json={"nome": "Angela"})
    assert res.status_code == 409


async def test_update_member_inesistente(auth_client: AsyncClient):
    res = await auth_client.patch(f"{BASE}/9999", json={"nome": "Tizio"})
    assert res.status_code == 404
