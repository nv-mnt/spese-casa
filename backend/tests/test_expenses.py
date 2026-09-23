"""Test CRUD delle spese."""

from __future__ import annotations

from httpx import AsyncClient


def url(period_id: int, expense_id: int | None = None) -> str:
    base = f"/api/v1/periods/{period_id}/expenses"
    return base if expense_id is None else f"{base}/{expense_id}"


async def test_registro_vuoto(auth_client: AsyncClient, period: dict):
    res = await auth_client.get(url(period["id"]))
    assert res.status_code == 200
    assert res.json() == []


async def test_crea_spesa(auth_client: AsyncClient, period: dict, members: list[dict]):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "data": "2025-10-01",
            "descrizione": "Spesa Esselunga",
            "categoria": "Spesa",
            "paid_by_id": members[1]["id"],
            "importo": "142.87",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["descrizione"] == "Spesa Esselunga"
    assert body["categoria"] == "Spesa"
    assert body["importo"] == 142.87
    assert body["data"] == "2025-10-01"
    assert body["paid_by"]["nome"] == "Angela"


async def test_crea_spesa_senza_data(auth_client: AsyncClient, period: dict, members: list[dict]):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "Mobili",
            "categoria": "Casa",
            "paid_by_id": members[0]["id"],
            "importo": "263.97",
        },
    )
    assert res.status_code == 201
    assert res.json()["data"] is None


async def test_importo_non_positivo(auth_client: AsyncClient, period: dict, members: list[dict]):
    for importo in ("0", "-5.00"):
        res = await auth_client.post(
            url(period["id"]),
            json={
                "descrizione": "X",
                "categoria": "Altro",
                "paid_by_id": members[0]["id"],
                "importo": importo,
            },
        )
        assert res.status_code == 422, importo


async def test_categoria_non_valida(auth_client: AsyncClient, period: dict, members: list[dict]):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "X",
            "categoria": "Vacanze",
            "paid_by_id": members[0]["id"],
            "importo": "10.00",
        },
    )
    assert res.status_code == 422


async def test_descrizione_vuota(auth_client: AsyncClient, period: dict, members: list[dict]):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "   ",
            "categoria": "Altro",
            "paid_by_id": members[0]["id"],
            "importo": "10.00",
        },
    )
    assert res.status_code == 422


async def test_pagante_estraneo_allhousehold(auth_client: AsyncClient, period: dict):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "X",
            "categoria": "Altro",
            "paid_by_id": 9999,
            "importo": "10.00",
        },
    )
    assert res.status_code == 422


async def test_modifica_spesa(auth_client: AsyncClient, period: dict, members: list[dict]):
    creata = (
        await auth_client.post(
            url(period["id"]),
            json={
                "descrizione": "Spesa",
                "categoria": "Spesa",
                "paid_by_id": members[0]["id"],
                "importo": "10.00",
            },
        )
    ).json()

    res = await auth_client.patch(
        url(period["id"], creata["id"]),
        json={"importo": "99.99", "categoria": "Svago", "paid_by_id": members[1]["id"]},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["importo"] == 99.99
    assert body["categoria"] == "Svago"
    assert body["paid_by"]["nome"] == "Angela"
    assert body["descrizione"] == "Spesa"  # non toccata


async def test_modifica_parziale_non_azzera_la_data(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    creata = (
        await auth_client.post(
            url(period["id"]),
            json={
                "data": "2025-10-05",
                "descrizione": "Spesa",
                "categoria": "Spesa",
                "paid_by_id": members[0]["id"],
                "importo": "10.00",
            },
        )
    ).json()
    res = await auth_client.patch(url(period["id"], creata["id"]), json={"importo": "12.00"})
    assert res.status_code == 200
    assert res.json()["data"] == "2025-10-05"


async def test_modifica_spesa_inesistente(auth_client: AsyncClient, period: dict):
    res = await auth_client.patch(url(period["id"], 9999), json={"importo": "1.00"})
    assert res.status_code == 404


async def test_elimina_spesa(auth_client: AsyncClient, period: dict, members: list[dict]):
    creata = (
        await auth_client.post(
            url(period["id"]),
            json={
                "descrizione": "Spesa",
                "categoria": "Spesa",
                "paid_by_id": members[0]["id"],
                "importo": "10.00",
            },
        )
    ).json()
    assert (await auth_client.delete(url(period["id"], creata["id"]))).status_code == 204
    assert (await auth_client.get(url(period["id"]))).json() == []


async def test_elimina_spesa_inesistente(auth_client: AsyncClient, period: dict):
    assert (await auth_client.delete(url(period["id"], 9999))).status_code == 404


async def test_spesa_di_un_altro_periodo_non_e_raggiungibile(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    altro = (await auth_client.post("/api/v1/periods", json={"nome": "Novembre 2025"})).json()
    creata = (
        await auth_client.post(
            url(period["id"]),
            json={
                "descrizione": "Spesa",
                "categoria": "Spesa",
                "paid_by_id": members[0]["id"],
                "importo": "10.00",
            },
        )
    ).json()
    res = await auth_client.patch(url(altro["id"], creata["id"]), json={"importo": "1.00"})
    assert res.status_code == 404


async def test_ordinamento_data_crescente_vuote_in_fondo(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    def payload(descrizione: str, data: str | None):
        body = {
            "descrizione": descrizione,
            "categoria": "Altro",
            "paid_by_id": members[0]["id"],
            "importo": "1.00",
        }
        if data:
            body["data"] = data
        return body

    await auth_client.post(url(period["id"]), json=payload("senza data", None))
    await auth_client.post(url(period["id"]), json=payload("15 ottobre", "2025-10-15"))
    await auth_client.post(url(period["id"]), json=payload("2 ottobre", "2025-10-02"))

    spese = (await auth_client.get(url(period["id"]))).json()
    assert [s["descrizione"] for s in spese] == ["2 ottobre", "15 ottobre", "senza data"]


async def test_registro_del_dataset_di_riferimento(auth_client: AsyncClient, seeded_period: dict):
    spese = (await auth_client.get(url(seeded_period["id"]))).json()
    assert len(spese) == 31
    assert sum(s["importo"] for s in spese) == 3509.32


async def test_periodo_di_un_altro_utente_non_e_accessibile(
    client: AsyncClient, seeded_period: dict
):
    """Isolamento fra household diversi."""
    reg = await client.post(
        "/api/v1/auth/register",
        json={"nome": "Altro", "email": "altro@spesecasa.it", "password": "password123"},
    )
    token = reg.json()["access_token"]
    res = await client.get(
        url(seeded_period["id"]), headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 404
