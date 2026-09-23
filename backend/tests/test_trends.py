"""Andamenti multi-mese: totali per mese, medie per categoria, classifica."""

from __future__ import annotations

from httpx import AsyncClient


async def _periodo(client: AsyncClient, nome: str) -> dict:
    res = await client.post(
        "/api/v1/periods", json={"nome": nome, "precompila_ricorrenti": False}
    )
    assert res.status_code == 201, res.text
    return res.json()


async def _spesa(client: AsyncClient, pid: int, member_id: int, categoria: str, importo: str):
    res = await client.post(
        f"/api/v1/periods/{pid}/expenses",
        json={
            "descrizione": categoria,
            "categoria": categoria,
            "paid_by_id": member_id,
            "importo": importo,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


async def test_trend_casa_vuoto(auth_client: AsyncClient):
    body = (await auth_client.get("/api/v1/periods/trends")).json()
    assert body == {"punti": [], "per_categoria": [], "mesi_piu_cari": [], "n_mesi": 0}


async def test_trend_casa_ordinato_dal_piu_vecchio(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """Un andamento si legge da sinistra: il mese piu' vecchio per primo."""
    await _spesa(auth_client, period["id"], members[0]["id"], "Casa", "100.00")
    secondo = await _periodo(auth_client, "Novembre 2025")
    await _spesa(auth_client, secondo["id"], members[0]["id"], "Spesa", "250.00")

    body = (await auth_client.get("/api/v1/periods/trends")).json()
    assert [p["etichetta"] for p in body["punti"]] == ["Ottobre 2025", "Novembre 2025"]
    assert [p["spese_totali"] for p in body["punti"]] == [100.00, 250.00]
    assert body["n_mesi"] == 2


async def test_trend_casa_netto_e_saldo(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await _spesa(auth_client, period["id"], members[0]["id"], "Casa", "100.00")
    await auth_client.post(
        f"/api/v1/periods/{period['id']}/common-incomes",
        json={
            "descrizione": "Reso",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "40.00",
        },
    )

    punto = (await auth_client.get("/api/v1/periods/trends")).json()["punti"][0]
    assert punto["spese_totali"] == 100.00
    assert punto["entrate_comuni_totali"] == 40.00
    assert punto["netto_da_dividere"] == 60.00
    assert punto["saldo"] == 30.00


async def test_media_per_categoria_sui_mesi(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """La media e' sul numero di mesi dell'intervallo, non sui mesi con dati."""
    await _spesa(auth_client, period["id"], members[0]["id"], "Spesa", "100.00")
    secondo = await _periodo(auth_client, "Novembre 2025")
    await _spesa(auth_client, secondo["id"], members[0]["id"], "Spesa", "200.00")

    body = (await auth_client.get("/api/v1/periods/trends")).json()
    per_cat = {c["categoria"]: c for c in body["per_categoria"]}
    assert per_cat["Spesa"]["totale"] == 300.00
    assert per_cat["Spesa"]["media_mensile"] == 150.00
    assert per_cat["Spesa"]["mesi_con_movimenti"] == 2
    assert per_cat["Svago"]["totale"] == 0.00


async def test_classifica_mesi_piu_cari(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await _spesa(auth_client, period["id"], members[0]["id"], "Casa", "100.00")
    caro = await _periodo(auth_client, "Novembre 2025")
    await _spesa(auth_client, caro["id"], members[0]["id"], "Casa", "900.00")

    classifica = (await auth_client.get("/api/v1/periods/trends")).json()["mesi_piu_cari"]
    assert classifica[0] == {"etichetta": "Novembre 2025", "totale": 900.00}
    assert classifica[1]["etichetta"] == "Ottobre 2025"


async def test_filtro_ultimi_mesi(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await _spesa(auth_client, period["id"], members[0]["id"], "Casa", "100.00")
    recente = await _periodo(auth_client, "Novembre 2025")
    await _spesa(auth_client, recente["id"], members[0]["id"], "Casa", "200.00")

    body = (await auth_client.get("/api/v1/periods/trends?mesi=1")).json()
    assert body["n_mesi"] == 1
    assert [p["etichetta"] for p in body["punti"]] == ["Novembre 2025"]


async def test_trend_esclude_gli_elementi_cestinati(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    spesa = await _spesa(auth_client, period["id"], members[0]["id"], "Casa", "100.00")
    await auth_client.delete(f"/api/v1/periods/{period['id']}/expenses/{spesa['id']}")

    punto = (await auth_client.get("/api/v1/periods/trends")).json()["punti"][0]
    assert punto["spese_totali"] == 0.00
    assert punto["n_spese"] == 0


# --------------------------------------------------------------------------- personale


async def test_trend_personale(auth_client: AsyncClient, seeded_personal_period: dict):
    body = (await auth_client.get("/api/v1/personal/trends")).json()
    assert body["n_mesi"] == 1
    punto = body["punti"][0]
    assert punto["entrate_totali"] == 1749.00
    assert punto["uscite_totali"] == 932.73
    assert punto["saldo_reale"] == 1749.00
    assert punto["saldo_dopo_sospese"] == 816.27

    per_cat = {c["categoria"]: c for c in body["per_categoria"]}
    assert per_cat["Affitto"]["totale"] == 400.00
    assert per_cat["Finanziamenti"]["media_mensile"] == 365.00


async def test_trend_personale_e_privato(
    auth_client: AsyncClient, other_client: AsyncClient, seeded_personal_period: dict
):
    mio = (await auth_client.get("/api/v1/personal/trends")).json()
    assert mio["n_mesi"] == 1

    altrui = (await other_client.get("/api/v1/personal/trends")).json()
    assert altrui["n_mesi"] == 0
    assert altrui["punti"] == []
