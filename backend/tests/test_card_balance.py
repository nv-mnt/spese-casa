"""Rilevazione manuale del saldo carta nel budget personale."""

from __future__ import annotations

from decimal import Decimal

from httpx import AsyncClient

from app.models.personal import CardBalanceReading
from app.services.card_balance import (
    Tracciato,
    saldo_carta_corrente,
    scostamenti,
    scostamento_di,
)


def reading(
    id: int, saldo: str, entrate: str, pagate: str, giorno: int = 1
) -> CardBalanceReading:
    from datetime import UTC, datetime

    return CardBalanceReading(
        id=id,
        personal_period_id=1,
        saldo=Decimal(saldo),
        rilevato_il=datetime(2026, 10, giorno, tzinfo=UTC),
        nota=None,
        entrate_tracciate=Decimal(entrate),
        uscite_pagate_tracciate=Decimal(pagate),
    )


def urls(pid: int) -> dict[str, str]:
    base = f"/api/v1/personal/periods/{pid}"
    return {
        "incomes": f"{base}/incomes",
        "expenses": f"{base}/expenses",
        "summary": f"{base}/summary",
        "readings": f"{base}/card-readings",
    }


# --------------------------------------------------------------------------
# Calcolo puro
# --------------------------------------------------------------------------


def test_senza_rilevazioni_vale_il_calcolo_classico():
    tracciato = Tracciato(entrate_totali=Decimal("2000.00"), uscite_pagate=Decimal("750.00"))
    assert saldo_carta_corrente(ultima_rilevazione=None, tracciato=tracciato) == Decimal(
        "1250.00"
    )


def test_scostamento_prima_rilevazione():
    """Dichiari 1.180 ma dal tracciato risultavano 1.250: 70 non segnati."""
    r = reading(1, saldo="1180.00", entrate="2000.00", pagate="750.00")
    assert scostamento_di(r, None) == Decimal("-70.00")


def test_saldo_dopo_la_rilevazione_applica_solo_i_movimenti_nuovi():
    r = reading(1, saldo="1180.00", entrate="2000.00", pagate="750.00")
    # Da allora: +0 entrate, +200 di uscite pagate in piu'.
    tracciato = Tracciato(entrate_totali=Decimal("2000.00"), uscite_pagate=Decimal("950.00"))
    assert saldo_carta_corrente(ultima_rilevazione=r, tracciato=tracciato) == Decimal("980.00")


def test_entrata_registrata_dopo_la_rilevazione_alza_il_saldo():
    r = reading(1, saldo="1180.00", entrate="2000.00", pagate="750.00")
    tracciato = Tracciato(entrate_totali=Decimal("2100.00"), uscite_pagate=Decimal("750.00"))
    assert saldo_carta_corrente(ultima_rilevazione=r, tracciato=tracciato) == Decimal("1280.00")


def test_scostamento_seconda_rilevazione_parte_dalla_prima():
    prima = reading(1, saldo="1180.00", entrate="2000.00", pagate="750.00", giorno=1)
    # Nel frattempo 200 di uscite pagate: ci si aspettava 980, dichiara 950.
    seconda = reading(2, saldo="950.00", entrate="2000.00", pagate="950.00", giorno=15)
    assert scostamento_di(seconda, prima) == Decimal("-30.00")

    tutti = scostamenti([seconda, prima])
    assert tutti == {1: Decimal("-70.00"), 2: Decimal("-30.00")}


def test_scostamento_positivo_quando_entra_piu_del_previsto():
    r = reading(1, saldo="1300.00", entrate="2000.00", pagate="750.00")
    assert scostamento_di(r, None) == Decimal("50.00")


def test_saldo_negativo_ammesso():
    r = reading(1, saldo="-40.00", entrate="100.00", pagate="100.00")
    tracciato = Tracciato(entrate_totali=Decimal("100.00"), uscite_pagate=Decimal("100.00"))
    assert saldo_carta_corrente(ultima_rilevazione=r, tracciato=tracciato) == Decimal("-40.00")


# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------


async def test_storico_vuoto(auth_client: AsyncClient, personal_period: dict):
    res = await auth_client.get(urls(personal_period["id"])["readings"])
    assert res.status_code == 200
    assert res.json() == []


async def test_riepilogo_senza_rilevazioni(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])
    await auth_client.post(
        u["incomes"], json={"categoria": "Stipendio", "dettaglio": "Ottobre", "importo": "2000.00"}
    )
    await auth_client.post(
        u["expenses"],
        json={
            "categoria": "Affitto",
            "negozio_dettaglio": "Affitto",
            "importo": "750.00",
            "pagato": True,
        },
    )
    body = (await auth_client.get(u["summary"])).json()
    assert body["carta"]["rilevato"] is False
    assert body["carta"]["saldo_carta"] == 1250.0
    assert body["carta"]["saldo_tracciato"] == 1250.0
    assert body["carta"]["scostamento_cumulato"] == 0.0
    assert body["saldo_reale"] == 1250.0


async def test_rilevazione_corregge_il_saldo(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])
    await auth_client.post(
        u["incomes"], json={"categoria": "Stipendio", "dettaglio": "Ottobre", "importo": "2000.00"}
    )
    await auth_client.post(
        u["expenses"],
        json={
            "categoria": "Affitto",
            "negozio_dettaglio": "Affitto",
            "importo": "750.00",
            "pagato": True,
        },
    )

    res = await auth_client.post(
        u["readings"], json={"saldo": "1180.00", "nota": "letto dall'app della banca"}
    )
    assert res.status_code == 201, res.text
    r = res.json()
    assert r["saldo"] == 1180.0
    assert r["entrate_tracciate"] == 2000.0
    assert r["uscite_pagate_tracciate"] == 750.0
    assert r["scostamento"] == -70.0

    body = (await auth_client.get(u["summary"])).json()
    assert body["carta"]["rilevato"] is True
    assert body["carta"]["saldo_carta"] == 1180.0
    assert body["carta"]["saldo_tracciato"] == 1250.0
    assert body["carta"]["scostamento_cumulato"] == -70.0
    assert body["carta"]["n_rilevazioni"] == 1
    assert body["saldo_reale"] == 1180.0


async def test_spesa_pagata_dopo_la_rilevazione_scala_il_saldo(
    auth_client: AsyncClient, personal_period: dict
):
    u = urls(personal_period["id"])
    await auth_client.post(
        u["incomes"], json={"categoria": "Stipendio", "dettaglio": "Ottobre", "importo": "2000.00"}
    )
    await auth_client.post(u["readings"], json={"saldo": "1900.00"})

    # Registro una spesa gia' pagata DOPO aver rilevato il saldo.
    await auth_client.post(
        u["expenses"],
        json={
            "categoria": "Spesa",
            "negozio_dettaglio": "Supermercato",
            "importo": "100.00",
            "pagato": True,
        },
    )
    body = (await auth_client.get(u["summary"])).json()
    assert body["carta"]["saldo_carta"] == 1800.0
    # Lo scostamento storico non cambia: resta quello del momento di rilevazione.
    assert body["carta"]["ultima_rilevazione"]["scostamento"] == -100.0


async def test_spesa_in_sospeso_non_tocca_il_saldo_carta(
    auth_client: AsyncClient, personal_period: dict
):
    u = urls(personal_period["id"])
    await auth_client.post(u["readings"], json={"saldo": "500.00"})
    await auth_client.post(
        u["expenses"],
        json={
            "categoria": "Svago",
            "negozio_dettaglio": "Da pagare",
            "importo": "80.00",
            "pagato": False,
        },
    )
    body = (await auth_client.get(u["summary"])).json()
    assert body["carta"]["saldo_carta"] == 500.0
    assert body["uscite_in_sospeso"] == 80.0
    assert body["saldo_dopo_sospese"] == 420.0


async def test_due_rilevazioni_consecutive(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])
    await auth_client.post(
        u["incomes"], json={"categoria": "Stipendio", "dettaglio": "Ottobre", "importo": "2000.00"}
    )
    await auth_client.post(
        u["readings"],
        json={"saldo": "1900.00", "rilevato_il": "2026-10-01T10:00:00Z"},
    )
    await auth_client.post(
        u["expenses"],
        json={
            "categoria": "Spesa",
            "negozio_dettaglio": "Supermercato",
            "importo": "100.00",
            "pagato": True,
        },
    )
    # Ci si aspetterebbe 1800, ne dichiara 1750: altri 50 non segnati.
    await auth_client.post(
        u["readings"],
        json={"saldo": "1750.00", "rilevato_il": "2026-10-15T10:00:00Z"},
    )

    storico = (await auth_client.get(u["readings"])).json()
    assert [r["scostamento"] for r in storico] == [-100.0, -50.0]

    body = (await auth_client.get(u["summary"])).json()
    assert body["carta"]["saldo_carta"] == 1750.0
    assert body["carta"]["n_rilevazioni"] == 2
    assert body["carta"]["scostamento_cumulato"] == -150.0


async def test_correggi_ed_elimina_rilevazione(
    auth_client: AsyncClient, personal_period: dict
):
    u = urls(personal_period["id"])
    creata = (await auth_client.post(u["readings"], json={"saldo": "100.00"})).json()

    res = await auth_client.patch(
        f"{u['readings']}/{creata['id']}", json={"saldo": "120.00", "nota": "corretto"}
    )
    assert res.status_code == 200
    assert res.json()["saldo"] == 120.0
    assert res.json()["nota"] == "corretto"

    assert (await auth_client.delete(f"{u['readings']}/{creata['id']}")).status_code == 204
    assert (await auth_client.get(u["readings"])).json() == []
    body = (await auth_client.get(u["summary"])).json()
    assert body["carta"]["rilevato"] is False


async def test_rilevazione_inesistente(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])
    assert (await auth_client.patch(f"{u['readings']}/9999", json={"saldo": "1"})).status_code == 404
    assert (await auth_client.delete(f"{u['readings']}/9999")).status_code == 404


async def test_rilevazioni_isolate_fra_utenti(
    auth_client: AsyncClient, personal_period: dict, other_client: AsyncClient
):
    u = urls(personal_period["id"])
    await auth_client.post(u["readings"], json={"saldo": "500.00"})
    assert (await other_client.get(u["readings"])).status_code == 404
    assert (await other_client.post(u["readings"], json={"saldo": "1.00"})).status_code == 404
