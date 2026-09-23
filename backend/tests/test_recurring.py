"""Test del modello configurabile di spese fisse ricorrenti."""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1/recurring-templates"


async def test_default_precaricati(auth_client: AsyncClient):
    res = await auth_client.get(BASE)
    assert res.status_code == 200
    body = res.json()
    assert [t["descrizione"] for t in body] == ["Condominio", "Affitto", "Luce", "Acqua"]
    assert all(t["importo"] is None and t["paid_by_id"] is None for t in body)
    assert all(t["attivo"] for t in body)


async def test_crea_modifica_elimina(auth_client: AsyncClient, members: list[dict]):
    creato = await auth_client.post(
        BASE,
        json={
            "descrizione": "Gas",
            "categoria": "Bollette",
            "importo": "112.60",
            "paid_by_id": members[0]["id"],
            "ordine": 9,
        },
    )
    assert creato.status_code == 201, creato.text
    tpl = creato.json()
    assert tpl["importo"] == 112.60

    res = await auth_client.patch(f"{BASE}/{tpl['id']}", json={"descrizione": "Gas metano"})
    assert res.status_code == 200
    assert res.json()["descrizione"] == "Gas metano"

    assert (await auth_client.delete(f"{BASE}/{tpl['id']}")).status_code == 204
    assert (await auth_client.get(f"{BASE}/{tpl['id']}")).status_code in (404, 405)


async def test_filtro_solo_attivi(auth_client: AsyncClient):
    templates = (await auth_client.get(BASE)).json()
    await auth_client.patch(f"{BASE}/{templates[0]['id']}", json={"attivo": False})
    attivi = (await auth_client.get(BASE, params={"only_active": True})).json()
    assert len(attivi) == len(templates) - 1


async def test_pagante_estraneo(auth_client: AsyncClient):
    res = await auth_client.post(
        BASE, json={"descrizione": "X", "categoria": "Altro", "paid_by_id": 9999}
    )
    assert res.status_code == 422


async def test_template_inesistente(auth_client: AsyncClient):
    assert (await auth_client.patch(f"{BASE}/9999", json={"attivo": False})).status_code == 404
    assert (await auth_client.delete(f"{BASE}/9999")).status_code == 404
