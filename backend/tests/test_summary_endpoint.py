"""Test dell'endpoint di riepilogo, del settlement e dell'export CSV."""

from __future__ import annotations

from httpx import AsyncClient


def summary_url(pid: int) -> str:
    return f"/api/v1/periods/{pid}/summary"


async def test_riepilogo_riproduce_i_numeri_del_foglio(
    auth_client: AsyncClient, seeded_period: dict
):
    res = await auth_client.get(summary_url(seeded_period["id"]))
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["period_nome"] == "Ottobre 2025"
    assert body["valuta"] == "EUR"
    assert body["totale_speso"] == 3509.32
    assert body["quota_a_testa"] == 1754.66
    assert body["n_spese"] == 31

    per_membro = {m["member"]["nome"]: m for m in body["per_membro"]}
    assert per_membro["Giuseppe"]["ha_pagato"] == 1709.29
    assert per_membro["Angela"]["ha_pagato"] == 1800.03
    assert per_membro["Giuseppe"]["differenza"] == -45.37
    assert per_membro["Angela"]["differenza"] == 45.37

    assert body["saldo"] == 45.37
    assert body["in_pari"] is False
    assert body["debitore"]["nome"] == "Giuseppe"
    assert body["creditore"]["nome"] == "Angela"
    assert body["chi_deve_a_chi"] == "→ Giuseppe deve a Angela"


async def test_riepilogo_categorie_complete_e_coerenti(
    auth_client: AsyncClient, seeded_period: dict
):
    body = (await auth_client.get(summary_url(seeded_period["id"]))).json()
    categorie = body["per_categoria"]

    assert [c["categoria"] for c in categorie] == [
        "Casa",
        "Affitto",
        "Bollette",
        "Spesa",
        "Trasporti",
        "Svago",
        "Salute",
        "Altro",
    ]
    assert round(sum(c["totale"] for c in categorie), 2) == 3509.32

    per_cat = {c["categoria"]: c["totale"] for c in categorie}
    assert per_cat["Affitto"] == 650.00
    assert per_cat["Casa"] == round(180.50 + 43.15 + 130.00 + 27.35 + 263.97, 2)
    assert per_cat["Bollette"] == round(95.40 + 48.30 + 112.60 + 29.90, 2)
    assert per_cat["Spesa"] == round(142.87 + 68.24 + 55.18 + 156.43 + 42.10 + 88.64, 2)
    assert per_cat["Salute"] == round(34.90 + 250.00 + 80.00, 2)
    assert per_cat["Altro"] == round(45.00 + 15.00, 2)


async def test_riepilogo_periodo_vuoto(auth_client: AsyncClient, period: dict):
    body = (await auth_client.get(summary_url(period["id"]))).json()
    assert body["totale_speso"] == 0.0
    assert body["saldo"] == 0.0
    assert body["in_pari"] is True
    assert body["debitore"] is None
    assert body["chi_deve_a_chi"] == "Siete in pari"
    assert body["rimborso"]["stato"] == "in_pari"
    assert body["rimborso"]["stato_label"] == "Siete in pari"


async def test_riepilogo_si_aggiorna_dopo_le_modifiche(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    base = f"/api/v1/periods/{period['id']}/expenses"

    creata = (
        await auth_client.post(
            base,
            json={
                "descrizione": "Affitto",
                "categoria": "Affitto",
                "paid_by_id": members[1]["id"],
                "importo": "600.00",
            },
        )
    ).json()

    body = (await auth_client.get(summary_url(period["id"]))).json()
    assert body["totale_speso"] == 600.0
    assert body["saldo"] == 300.0
    assert body["debitore"]["nome"] == "Giuseppe"

    await auth_client.patch(f"{base}/{creata['id']}", json={"importo": "400.00"})
    body = (await auth_client.get(summary_url(period["id"]))).json()
    assert body["totale_speso"] == 400.0
    assert body["saldo"] == 200.0

    await auth_client.delete(f"{base}/{creata['id']}")
    body = (await auth_client.get(summary_url(period["id"]))).json()
    assert body["totale_speso"] == 0.0
    assert body["in_pari"] is True


# --------------------------------------------------------------------------
# Settlement
# --------------------------------------------------------------------------


async def test_settlement_da_saldare_poi_saldato(auth_client: AsyncClient, seeded_period: dict):
    pid = seeded_period["id"]

    body = (await auth_client.get(summary_url(pid))).json()["rimborso"]
    assert body == {
        "importo_dovuto": 45.37,
        "rimborso_versato": 0.0,
        "residuo": 45.37,
        "stato": "da_saldare",
        "stato_label": "● Da saldare",
        "ricevuto": False,
    }

    res = await auth_client.put(
        f"/api/v1/periods/{pid}/settlement", json={"rimborso_versato": "20.00"}
    )
    assert res.status_code == 200
    body = (await auth_client.get(summary_url(pid))).json()["rimborso"]
    assert body["residuo"] == 25.37
    assert body["stato"] == "da_saldare"

    await auth_client.put(
        f"/api/v1/periods/{pid}/settlement",
        json={"rimborso_versato": "45.37", "ricevuto": True},
    )
    body = (await auth_client.get(summary_url(pid))).json()["rimborso"]
    assert body["residuo"] == 0.0
    assert body["stato"] == "saldato"
    assert body["stato_label"] == "✓ Saldato"
    assert body["ricevuto"] is True


async def test_settlement_aggiornamento_parziale_del_solo_flag(
    auth_client: AsyncClient, seeded_period: dict
):
    pid = seeded_period["id"]
    await auth_client.put(
        f"/api/v1/periods/{pid}/settlement", json={"rimborso_versato": "10.00"}
    )
    res = await auth_client.put(f"/api/v1/periods/{pid}/settlement", json={"ricevuto": True})
    assert res.status_code == 200
    assert res.json() == {
        "period_id": pid,
        "rimborso_versato": 10.0,
        "ricevuto": True,
    }


async def test_settlement_rifiuta_importi_negativi(auth_client: AsyncClient, period: dict):
    res = await auth_client.put(
        f"/api/v1/periods/{period['id']}/settlement", json={"rimborso_versato": "-1.00"}
    )
    assert res.status_code == 422


async def test_settlement_periodo_inesistente(auth_client: AsyncClient):
    res = await auth_client.put(
        "/api/v1/periods/9999/settlement", json={"rimborso_versato": "1.00"}
    )
    assert res.status_code == 404


# --------------------------------------------------------------------------
# Export CSV
# --------------------------------------------------------------------------


async def test_export_csv(auth_client: AsyncClient, seeded_period: dict):
    res = await auth_client.get(f"/api/v1/periods/{seeded_period['id']}/export.csv")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "spese-ottobre-2025.csv" in res.headers["content-disposition"]

    testo = res.content.decode("utf-8-sig")
    righe = testo.splitlines()
    assert righe[0] == "Data;Descrizione;Categoria;Pagato da;Importo"
    assert "01/10/2025;Affitto;Affitto;Angela;650,00" in righe
    # La riga senza data ha la prima colonna vuota.
    assert ";Spesa Conad;Spesa;Angela;55,18" in righe
    # Coda di riepilogo.
    assert "Totale speso;;;;3509,32" in testo
    assert "Quota a testa (50%);;;;1754,66" in testo
    assert "Saldo;;;;45,37" in testo
    assert "→ Giuseppe deve a Angela" in testo
    assert "Importo dovuto;;;;45,37" in testo


async def test_export_csv_periodo_vuoto(auth_client: AsyncClient, period: dict):
    res = await auth_client.get(f"/api/v1/periods/{period['id']}/export.csv")
    assert res.status_code == 200
    testo = res.content.decode("utf-8-sig")
    assert "Totale speso;;;;0,00" in testo
    assert "Siete in pari" in testo
