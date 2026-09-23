"""Test CRUD dei periodi e precompilazione delle spese fisse."""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1/periods"


async def test_lista_vuota(auth_client: AsyncClient):
    res = await auth_client.get(BASE)
    assert res.status_code == 200
    assert res.json() == []


async def test_crea_periodo(auth_client: AsyncClient):
    res = await auth_client.post(BASE, json={"nome": "Ottobre 2025"})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["nome"] == "Ottobre 2025"
    assert body["id"] > 0
    assert body["created_at"]


async def test_crea_periodo_inizializza_il_settlement(auth_client: AsyncClient):
    period = (await auth_client.post(BASE, json={"nome": "Ottobre 2025"})).json()
    res = await auth_client.get(f"{BASE}/{period['id']}/settlement")
    assert res.status_code == 200
    assert res.json() == {
        "period_id": period["id"],
        "rimborso_versato": 0.0,
        "ricevuto": False,
    }


async def test_nome_duplicato(auth_client: AsyncClient):
    await auth_client.post(BASE, json={"nome": "Ottobre 2025"})
    res = await auth_client.post(BASE, json={"nome": "ottobre 2025"})
    assert res.status_code == 409


async def test_nome_vuoto(auth_client: AsyncClient):
    res = await auth_client.post(BASE, json={"nome": ""})
    assert res.status_code == 422


async def test_lista_con_totali(auth_client: AsyncClient, seeded_period: dict):
    res = await auth_client.get(BASE)
    assert res.status_code == 200
    item = next(p for p in res.json() if p["id"] == seeded_period["id"])
    assert item["n_spese"] == 31
    assert item["totale_speso"] == 3509.32
    assert item["saldo"] == 45.37
    assert item["ricevuto"] is False


async def test_dettaglio_periodo(auth_client: AsyncClient, period: dict):
    res = await auth_client.get(f"{BASE}/{period['id']}")
    assert res.status_code == 200
    assert res.json()["nome"] == "Ottobre 2025"


async def test_periodo_inesistente(auth_client: AsyncClient):
    assert (await auth_client.get(f"{BASE}/9999")).status_code == 404


async def test_rinomina_periodo(auth_client: AsyncClient, period: dict):
    res = await auth_client.patch(f"{BASE}/{period['id']}", json={"nome": "Novembre 2025"})
    assert res.status_code == 200
    assert res.json()["nome"] == "Novembre 2025"


async def test_rinomina_su_nome_esistente(auth_client: AsyncClient, period: dict):
    await auth_client.post(BASE, json={"nome": "Novembre 2025"})
    res = await auth_client.patch(f"{BASE}/{period['id']}", json={"nome": "Novembre 2025"})
    assert res.status_code == 409


async def test_elimina_periodo_e_le_sue_spese(
    auth_client: AsyncClient, seeded_period: dict
):
    res = await auth_client.delete(f"{BASE}/{seeded_period['id']}")
    assert res.status_code == 204
    assert (await auth_client.get(f"{BASE}/{seeded_period['id']}")).status_code == 404
    assert (await auth_client.get(BASE)).json() == []


async def test_piu_periodi_indipendenti(auth_client: AsyncClient, members: list[dict]):
    ott = (await auth_client.post(BASE, json={"nome": "Ottobre 2025"})).json()
    nov = (await auth_client.post(BASE, json={"nome": "Novembre 2025"})).json()

    await auth_client.post(
        f"{BASE}/{ott['id']}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "700.00",
        },
    )

    riep_ott = (await auth_client.get(f"{BASE}/{ott['id']}/summary")).json()
    riep_nov = (await auth_client.get(f"{BASE}/{nov['id']}/summary")).json()
    assert riep_ott["totale_speso"] == 700.0
    assert riep_nov["totale_speso"] == 0.0
    assert riep_nov["chi_deve_a_chi"] == "Siete in pari"


async def test_precompila_spese_ricorrenti(auth_client: AsyncClient):
    period = (
        await auth_client.post(
            BASE, json={"nome": "Dicembre 2025", "precompila_ricorrenti": True}
        )
    ).json()

    spese = (await auth_client.get(f"{BASE}/{period['id']}/expenses")).json()
    descrizioni = [s["descrizione"] for s in spese]
    assert descrizioni == ["Condominio", "Affitto", "Luce", "Acqua"]
    # Segnaposto da completare a mano: data vuota e importo minimo.
    assert all(s["data"] is None for s in spese)
    assert all(s["importo"] == 0.01 for s in spese)
    assert [s["categoria"] for s in spese] == ["Casa", "Affitto", "Bollette", "Bollette"]


async def test_precompila_usa_importo_e_pagante_del_modello(
    auth_client: AsyncClient, members: list[dict]
):
    templates = (await auth_client.get("/api/v1/recurring-templates")).json()
    affitto = next(t for t in templates if t["descrizione"] == "Affitto")
    await auth_client.patch(
        f"/api/v1/recurring-templates/{affitto['id']}",
        json={"importo": "650.00", "paid_by_id": members[1]["id"]},
    )

    period = (
        await auth_client.post(
            BASE, json={"nome": "Gennaio 2026", "precompila_ricorrenti": True}
        )
    ).json()
    spese = (await auth_client.get(f"{BASE}/{period['id']}/expenses")).json()
    riga = next(s for s in spese if s["descrizione"] == "Affitto")
    assert riga["importo"] == 650.0
    assert riga["paid_by_id"] == members[1]["id"]


async def test_precompila_ignora_le_ricorrenti_disattivate(auth_client: AsyncClient):
    templates = (await auth_client.get("/api/v1/recurring-templates")).json()
    await auth_client.patch(
        f"/api/v1/recurring-templates/{templates[0]['id']}", json={"attivo": False}
    )
    period = (
        await auth_client.post(
            BASE, json={"nome": "Febbraio 2026", "precompila_ricorrenti": True}
        )
    ).json()
    spese = (await auth_client.get(f"{BASE}/{period['id']}/expenses")).json()
    assert templates[0]["descrizione"] not in [s["descrizione"] for s in spese]
