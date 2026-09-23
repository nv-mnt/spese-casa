"""
Entrate comuni: CRUD e ricalcolo del saldo netto.

Un'entrata comune e' una spesa negativa intestata a chi l'ha incassata:
abbassa il netto da dividere e il contributo di quel membro.
"""

from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.services.summary import compute_balance


def url(period_id: int, income_id: int | None = None) -> str:
    base = f"/api/v1/periods/{period_id}/common-incomes"
    return base if income_id is None else f"{base}/{income_id}"


def summary_url(period_id: int) -> str:
    return f"/api/v1/periods/{period_id}/summary"


# --------------------------------------------------------------------------- CRUD


async def test_elenco_vuoto(auth_client: AsyncClient, period: dict):
    res = await auth_client.get(url(period["id"]))
    assert res.status_code == 200
    assert res.json() == []


async def test_crea_entrata_comune(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "data": "2026-09-10",
            "descrizione": "Reso Amazon",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "40.00",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["descrizione"] == "Reso Amazon"
    assert body["categoria"] == "Reso"
    assert body["importo"] == 40.0
    assert body["ricevuto_da"]["nome"] == "Giuseppe"


async def test_crea_senza_data(auth_client: AsyncClient, period: dict, members: list[dict]):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "Bonus",
            "categoria": "Bonus",
            "ricevuto_da_id": members[1]["id"],
            "importo": "25.00",
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["data"] is None


async def test_importo_non_positivo_rifiutato(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "Sbagliata",
            "categoria": "Altro",
            "ricevuto_da_id": members[0]["id"],
            "importo": "0",
        },
    )
    assert res.status_code == 422


async def test_membro_di_altro_household_rifiutato(
    auth_client: AsyncClient, period: dict
):
    res = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "Intrusa",
            "categoria": "Altro",
            "ricevuto_da_id": 9999,
            "importo": "10.00",
        },
    )
    assert res.status_code == 422


async def test_modifica_ed_elimina(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    creata = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "Reso",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "40.00",
        },
    )
    income_id = creata.json()["id"]

    res = await auth_client.patch(
        url(period["id"], income_id), json={"importo": "55.50", "categoria": "Rimborso"}
    )
    assert res.status_code == 200, res.text
    assert res.json()["importo"] == 55.5
    assert res.json()["categoria"] == "Rimborso"

    res = await auth_client.delete(url(period["id"], income_id))
    assert res.status_code == 204
    assert (await auth_client.get(url(period["id"]))).json() == []


async def test_entrata_di_un_altro_periodo_non_raggiungibile(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    creata = await auth_client.post(
        url(period["id"]),
        json={
            "descrizione": "Reso",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "10.00",
        },
    )
    altro = await auth_client.post(
        "/api/v1/periods", json={"nome": "Altro mese", "precompila_ricorrenti": False}
    )
    res = await auth_client.patch(
        url(altro.json()["id"], creata.json()["id"]), json={"importo": "99.00"}
    )
    assert res.status_code == 404


# --------------------------------------------------------------------------- calcoli


async def test_esempio_di_riferimento(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """100 € spesi da Giuseppe + reso da 40 € incassato da Giuseppe.

    Netto 60 €, quota 30 €, contributo netto Giuseppe 60 € e Angela 0 €
    -> Angela deve 30,00 € a Giuseppe.
    """
    pid = period["id"]
    giuseppe, angela = members[0], members[1]

    await auth_client.post(
        f"/api/v1/periods/{pid}/expenses",
        json={
            "descrizione": "Acquisto",
            "categoria": "Casa",
            "paid_by_id": giuseppe["id"],
            "importo": "100.00",
        },
    )
    await auth_client.post(
        url(pid),
        json={
            "descrizione": "Reso Amazon",
            "categoria": "Reso",
            "ricevuto_da_id": giuseppe["id"],
            "importo": "40.00",
        },
    )

    body = (await auth_client.get(summary_url(pid))).json()

    assert body["totale_speso"] == 100.00
    assert body["entrate_comuni_totali"] == 40.00
    assert body["netto_da_dividere"] == 60.00
    assert body["quota_a_testa"] == 30.00

    per_membro = {m["member"]["nome"]: m for m in body["per_membro"]}
    assert per_membro["Giuseppe"]["ha_pagato"] == 100.00
    assert per_membro["Giuseppe"]["ha_ricevuto"] == 40.00
    assert per_membro["Giuseppe"]["contributo_netto"] == 60.00
    assert per_membro["Angela"]["contributo_netto"] == 0.00

    assert body["saldo"] == 30.00
    assert body["in_pari"] is False
    assert body["debitore"]["nome"] == "Angela"
    assert body["creditore"]["nome"] == "Giuseppe"
    assert body["chi_deve_a_chi"] == "→ Angela deve a Giuseppe"
    # Il blocco rimborso segue il saldo netto.
    assert body["rimborso"]["importo_dovuto"] == 30.00


async def test_entrata_puo_riportare_in_pari(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """Giuseppe spende 100, Angela incassa un bonus da 100: netto zero."""
    pid = period["id"]
    await auth_client.post(
        f"/api/v1/periods/{pid}/expenses",
        json={
            "descrizione": "Acquisto",
            "categoria": "Casa",
            "paid_by_id": members[0]["id"],
            "importo": "100.00",
        },
    )
    await auth_client.post(
        url(pid),
        json={
            "descrizione": "Bonus",
            "categoria": "Bonus",
            "ricevuto_da_id": members[0]["id"],
            "importo": "100.00",
        },
    )

    body = (await auth_client.get(summary_url(pid))).json()
    assert body["netto_da_dividere"] == 0.00
    assert body["saldo"] == 0.00
    assert body["in_pari"] is True
    assert body["chi_deve_a_chi"] == "Siete in pari"


async def test_contributo_netto_negativo(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """Chi incassa piu' di quanto spende ha un contributo netto negativo."""
    pid = period["id"]
    await auth_client.post(
        f"/api/v1/periods/{pid}/expenses",
        json={
            "descrizione": "Spesa",
            "categoria": "Spesa",
            "paid_by_id": members[1]["id"],
            "importo": "200.00",
        },
    )
    await auth_client.post(
        url(pid),
        json={
            "descrizione": "Grosso reso",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "60.00",
        },
    )

    body = (await auth_client.get(summary_url(pid))).json()
    per_membro = {m["member"]["nome"]: m for m in body["per_membro"]}

    assert body["netto_da_dividere"] == 140.00
    assert body["quota_a_testa"] == 70.00
    assert per_membro["Giuseppe"]["contributo_netto"] == -60.00
    # Giuseppe e' sotto la quota di 130 €: li deve ad Angela.
    assert body["saldo"] == 130.00
    assert body["debitore"]["nome"] == "Giuseppe"


async def test_senza_entrate_i_numeri_non_cambiano(
    auth_client: AsyncClient, seeded_period: dict
):
    """Retrocompatibilita': il periodo di riferimento resta quello di prima."""
    body = (await auth_client.get(summary_url(seeded_period["id"]))).json()
    assert body["entrate_comuni_totali"] == 0.00
    assert body["netto_da_dividere"] == body["totale_speso"]
    assert body["quota_a_testa"] == 1754.66
    assert body["saldo"] == 45.37


async def test_lista_periodi_usa_il_saldo_netto(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    await auth_client.post(
        f"/api/v1/periods/{pid}/expenses",
        json={
            "descrizione": "Acquisto",
            "categoria": "Casa",
            "paid_by_id": members[0]["id"],
            "importo": "100.00",
        },
    )
    await auth_client.post(
        url(pid),
        json={
            "descrizione": "Reso",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "40.00",
        },
    )

    riga = next(p for p in (await auth_client.get("/api/v1/periods")).json() if p["id"] == pid)
    assert riga["totale_speso"] == 100.00
    assert riga["entrate_comuni_totali"] == 40.00
    assert riga["saldo"] == 30.00


async def test_export_csv_include_le_entrate(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    await auth_client.post(
        url(pid),
        json={
            "descrizione": "Reso Amazon",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "40.00",
        },
    )
    res = await auth_client.get(f"/api/v1/periods/{pid}/export.csv")
    assert res.status_code == 200
    testo = res.content.decode("utf-8-sig")
    assert "ENTRATE COMUNI" in testo
    assert "Reso Amazon" in testo
    assert "Netto da dividere" in testo


# --------------------------------------------------------------------------- funzione pura


@pytest.mark.parametrize(
    ("contributo_a", "contributo_b", "netto", "quota", "saldo", "debitore"),
    [
        (Decimal("60"), Decimal("0"), Decimal("60.00"), Decimal("30.00"), Decimal("30.00"), 1),
        (Decimal("0"), Decimal("0"), Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), None),
        (Decimal("-60"), Decimal("200"), Decimal("140.00"), Decimal("70.00"), Decimal("130.00"), 0),
    ],
)
def test_compute_balance_con_contributi_netti(
    contributo_a, contributo_b, netto, quota, saldo, debitore
):
    balance = compute_balance(contributo_a, contributo_b)
    assert balance.netto_da_dividere == netto
    assert balance.quota_a_testa == quota
    assert balance.saldo == saldo
    assert balance.debitore_index == debitore
