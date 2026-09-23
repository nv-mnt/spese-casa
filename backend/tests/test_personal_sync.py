"""
Riflesso delle Spese casa nel Budget personale.

Il caso che conta e' quello dell'esempio: paghi 300 EUR, il partner te ne
rimborsa 150, e il tuo saldo personale deve muoversi di -150 senza che tu abbia
digitato niente nel budget personale.
"""

from __future__ import annotations

from httpx import AsyncClient

PERSONAL = "/api/v1/personal/periods"


async def _mese_personale(client: AsyncClient, etichetta: str) -> dict | None:
    periodi = (await client.get(PERSONAL)).json()
    return next((p for p in periodi if p["etichetta"] == etichetta), None)


async def _righe(client: AsyncClient, period_id: int) -> tuple[list, list]:
    entrate = (await client.get(f"{PERSONAL}/{period_id}/incomes")).json()
    uscite = (await client.get(f"{PERSONAL}/{period_id}/expenses")).json()
    return entrate, uscite


async def test_spesa_condivisa_diventa_uscita_personale(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """L'importo riflesso e' quello **intero**: dalla carta esce tutto."""
    await auth_client.post(
        f"/api/v1/periods/{period['id']}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "300.00",
        },
    )

    mese = await _mese_personale(auth_client, period["nome"])
    assert mese is not None, "il mese personale dovrebbe essere creato da solo"

    _, uscite = await _righe(auth_client, mese["id"])
    assert len(uscite) == 1
    riflessa = uscite[0]
    assert riflessa["importo"] == 300.00
    assert riflessa["pagato"] is True
    assert riflessa["categoria"] == "Affitto"
    assert riflessa["source_type"] == "spesa_casa"
    assert riflessa["negozio_dettaglio"] == "Affitto"


async def test_esempio_300_150(
    auth_client: AsyncClient, partner_client: AsyncClient, period: dict, members: list[dict]
):
    """300 pagati + 150 rimborsati dal partner -> impatto netto -150."""
    pid = period["id"]
    await auth_client.post(
        f"/api/v1/periods/{pid}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "300.00",
        },
    )
    # Il partner versa la sua quota.
    res = await auth_client.put(
        f"/api/v1/periods/{pid}/settlement", json={"rimborso_versato": "150.00"}
    )
    assert res.status_code == 200, res.text

    mese = await _mese_personale(auth_client, period["nome"])
    riepilogo = (await auth_client.get(f"{PERSONAL}/{mese['id']}/summary")).json()

    assert riepilogo["uscite_totali"] == 300.00
    assert riepilogo["uscite_pagate"] == 300.00
    assert riepilogo["entrate_totali"] == 150.00
    # -300 di uscita + 150 di conguaglio incassato = -150, la quota reale.
    assert riepilogo["saldo_reale"] == -150.00
    assert riepilogo["saldo_dopo_sospese"] == -150.00


async def test_il_partner_vede_il_conguaglio_come_uscita(
    auth_client: AsyncClient, partner_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    await auth_client.post(
        f"/api/v1/periods/{pid}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "300.00",
        },
    )
    await auth_client.put(
        f"/api/v1/periods/{pid}/settlement", json={"rimborso_versato": "150.00"}
    )

    mese = await _mese_personale(partner_client, period["nome"])
    assert mese is not None
    entrate, uscite = await _righe(partner_client, mese["id"])

    # Il partner non ha pagato nulla: per lui c'e' solo il conguaglio versato.
    assert entrate == []
    assert len(uscite) == 1
    assert uscite[0]["importo"] == 150.00
    assert uscite[0]["source_type"] == "conguaglio"

    riepilogo = (await partner_client.get(f"{PERSONAL}/{mese['id']}/summary")).json()
    assert riepilogo["saldo_reale"] == -150.00


async def test_entrata_comune_diventa_entrata_personale(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await auth_client.post(
        f"/api/v1/periods/{period['id']}/common-incomes",
        json={
            "descrizione": "Reso Amazon",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "40.00",
        },
    )
    mese = await _mese_personale(auth_client, period["nome"])
    entrate, _ = await _righe(auth_client, mese["id"])
    assert len(entrate) == 1
    assert entrate[0]["importo"] == 40.00
    assert entrate[0]["source_type"] == "entrata_comune"


async def test_modifica_della_sorgente_aggiorna_la_derivata(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    creata = await auth_client.post(
        f"/api/v1/periods/{period['id']}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "300.00",
        },
    )
    await auth_client.patch(
        f"/api/v1/periods/{period['id']}/expenses/{creata.json()['id']}",
        json={"importo": "350.00", "descrizione": "Affitto rivisto"},
    )

    mese = await _mese_personale(auth_client, period["nome"])
    _, uscite = await _righe(auth_client, mese["id"])
    assert len(uscite) == 1, "non deve nascere una seconda riga"
    assert uscite[0]["importo"] == 350.00
    assert uscite[0]["negozio_dettaglio"] == "Affitto rivisto"


async def test_cambio_pagante_sposta_la_derivata(
    auth_client: AsyncClient, partner_client: AsyncClient, period: dict, members: list[dict]
):
    creata = await auth_client.post(
        f"/api/v1/periods/{period['id']}/expenses",
        json={
            "descrizione": "Spesa",
            "categoria": "Spesa",
            "paid_by_id": members[0]["id"],
            "importo": "80.00",
        },
    )
    await auth_client.patch(
        f"/api/v1/periods/{period['id']}/expenses/{creata.json()['id']}",
        json={"paid_by_id": members[1]["id"]},
    )

    mio = await _mese_personale(auth_client, period["nome"])
    _, mie_uscite = await _righe(auth_client, mio["id"])
    assert mie_uscite == [], "la mia derivata deve sparire"

    suo = await _mese_personale(partner_client, period["nome"])
    _, sue_uscite = await _righe(partner_client, suo["id"])
    assert len(sue_uscite) == 1
    assert sue_uscite[0]["importo"] == 80.00


async def test_cestinare_la_sorgente_cestina_la_derivata(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    creata = await auth_client.post(
        f"/api/v1/periods/{period['id']}/expenses",
        json={
            "descrizione": "Spesa",
            "categoria": "Spesa",
            "paid_by_id": members[0]["id"],
            "importo": "80.00",
        },
    )
    await auth_client.delete(
        f"/api/v1/periods/{period['id']}/expenses/{creata.json()['id']}"
    )

    mese = await _mese_personale(auth_client, period["nome"])
    _, uscite = await _righe(auth_client, mese["id"])
    assert uscite == []


async def test_derivata_e_di_sola_lettura(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await auth_client.post(
        f"/api/v1/periods/{period['id']}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "300.00",
        },
    )
    mese = await _mese_personale(auth_client, period["nome"])
    _, uscite = await _righe(auth_client, mese["id"])
    derivata_id = uscite[0]["id"]

    res = await auth_client.patch(
        f"{PERSONAL}/{mese['id']}/expenses/{derivata_id}", json={"importo": "1.00"}
    )
    assert res.status_code == 409

    res = await auth_client.delete(f"{PERSONAL}/{mese['id']}/expenses/{derivata_id}")
    assert res.status_code == 409


async def test_nessun_doppio_conteggio_risincronizzando(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """Piu' scritture di fila non moltiplicano le voci derivate."""
    for importo in ("100.00", "110.00", "120.00"):
        creata = await auth_client.post(
            f"/api/v1/periods/{period['id']}/expenses",
            json={
                "descrizione": "Ripetuta",
                "categoria": "Casa",
                "paid_by_id": members[0]["id"],
                "importo": importo,
            },
        )
        await auth_client.patch(
            f"/api/v1/periods/{period['id']}/expenses/{creata.json()['id']}",
            json={"descrizione": "Ancora"},
        )

    mese = await _mese_personale(auth_client, period["nome"])
    _, uscite = await _righe(auth_client, mese["id"])
    assert len(uscite) == 3
    riepilogo = (await auth_client.get(f"{PERSONAL}/{mese['id']}/summary")).json()
    assert riepilogo["uscite_totali"] == 330.00


async def test_optout_rimuove_le_derivate(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await auth_client.post(
        f"/api/v1/periods/{period['id']}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "300.00",
        },
    )
    res = await auth_client.patch(
        "/api/v1/auth/me", json={"rifletti_spese_casa": False}
    )
    assert res.status_code == 200, res.text
    assert res.json()["rifletti_spese_casa"] is False

    mese = await _mese_personale(auth_client, period["nome"])
    _, uscite = await _righe(auth_client, mese["id"])
    assert uscite == []

    # Riattivando, le voci tornano.
    await auth_client.patch("/api/v1/auth/me", json={"rifletti_spese_casa": True})
    _, uscite = await _righe(auth_client, mese["id"])
    assert len(uscite) == 1


async def test_le_derivate_non_generano_altre_derivate(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    """Anti-ciclo: una voce derivata non e' una sorgente."""
    await auth_client.post(
        f"/api/v1/periods/{period['id']}/expenses",
        json={
            "descrizione": "Affitto",
            "categoria": "Affitto",
            "paid_by_id": members[0]["id"],
            "importo": "300.00",
        },
    )
    mese = await _mese_personale(auth_client, period["nome"])
    _, prima = await _righe(auth_client, mese["id"])

    # Una nuova scrittura sulla sorgente non moltiplica nulla.
    await auth_client.put(
        f"/api/v1/periods/{period['id']}/settlement", json={"ricevuto": True}
    )
    _, dopo = await _righe(auth_client, mese["id"])
    assert len(dopo) == len(prima) == 1
