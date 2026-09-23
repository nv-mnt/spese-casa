"""
Isolamento del budget personale.

Questi test sono il cuore del requisito di privacy: un utente non deve poter
leggere, modificare o anche solo scoprire l'esistenza dei dati personali di un
altro. La risposta attesa e' sempre 404 (non 403), perche' un 403 confermerebbe
che quella risorsa esiste.
"""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1/personal/periods"


async def test_ognuno_vede_solo_i_propri_mesi(
    auth_client: AsyncClient, other_client: AsyncClient, personal_period: dict
):
    miei = (await auth_client.get(BASE)).json()
    assert [p["id"] for p in miei] == [personal_period["id"]]

    altrui = (await other_client.get(BASE)).json()
    assert altrui == []


async def test_non_legge_il_mese_altrui(
    other_client: AsyncClient, personal_period: dict
):
    res = await other_client.get(f"{BASE}/{personal_period['id']}")
    assert res.status_code == 404


async def test_non_legge_entrate_e_uscite_altrui(
    other_client: AsyncClient, seeded_personal_period: dict
):
    pid = seeded_personal_period["id"]
    for risorsa in ("incomes", "expenses", "summary", "export.csv"):
        res = await other_client.get(f"{BASE}/{pid}/{risorsa}")
        assert res.status_code == 404, f"{risorsa} ha risposto {res.status_code}"


async def test_non_scrive_nel_mese_altrui(
    other_client: AsyncClient, personal_period: dict
):
    pid = personal_period["id"]

    res = await other_client.post(
        f"{BASE}/{pid}/incomes",
        json={"categoria": "Stipendio", "dettaglio": "Intruso", "importo": "1000.00"},
    )
    assert res.status_code == 404

    res = await other_client.post(
        f"{BASE}/{pid}/expenses",
        json={"categoria": "Spesa", "negozio_dettaglio": "Intruso", "importo": "10.00"},
    )
    assert res.status_code == 404


async def test_non_modifica_ne_cancella_il_mese_altrui(
    other_client: AsyncClient, personal_period: dict
):
    pid = personal_period["id"]

    res = await other_client.patch(f"{BASE}/{pid}", json={"etichetta": "Rubato"})
    assert res.status_code == 404

    res = await other_client.delete(f"{BASE}/{pid}")
    assert res.status_code == 404


async def test_non_tocca_le_righe_altrui(
    auth_client: AsyncClient, other_client: AsyncClient, seeded_personal_period: dict
):
    """Nemmeno conoscendo l'id esatto della riga."""
    pid = seeded_personal_period["id"]
    uscita = (await auth_client.get(f"{BASE}/{pid}/expenses")).json()[0]
    entrata = (await auth_client.get(f"{BASE}/{pid}/incomes")).json()[0]

    assert (
        await other_client.patch(
            f"{BASE}/{pid}/expenses/{uscita['id']}", json={"pagato": True}
        )
    ).status_code == 404
    assert (
        await other_client.delete(f"{BASE}/{pid}/expenses/{uscita['id']}")
    ).status_code == 404
    assert (
        await other_client.patch(
            f"{BASE}/{pid}/incomes/{entrata['id']}", json={"importo": "99999.00"}
        )
    ).status_code == 404
    assert (
        await other_client.delete(f"{BASE}/{pid}/incomes/{entrata['id']}")
    ).status_code == 404

    # E il dato originale e' rimasto intatto.
    dopo = (await auth_client.get(f"{BASE}/{pid}/expenses")).json()[0]
    assert dopo["pagato"] == uscita["pagato"]


async def test_riga_altrui_non_raggiungibile_dal_proprio_mese(
    auth_client: AsyncClient, other_client: AsyncClient, seeded_personal_period: dict
):
    """Incrociare il proprio period_id con l'id di una riga altrui non funziona."""
    pid_altrui = seeded_personal_period["id"]
    uscita_altrui = (await auth_client.get(f"{BASE}/{pid_altrui}/expenses")).json()[0]

    mio = await other_client.post(
        BASE, json={"etichetta": "Mio mese", "precompila_da_precedente": False}
    )
    mio_id = mio.json()["id"]

    res = await other_client.patch(
        f"{BASE}/{mio_id}/expenses/{uscita_altrui['id']}", json={"pagato": True}
    )
    assert res.status_code == 404


async def test_senza_token_nessun_accesso(client: AsyncClient):
    # Niente fixture autenticate qui: `auth_client` scrive l'header su questo
    # stesso oggetto, quindi basterebbe evocarla per non essere piu' anonimi.
    assert "Authorization" not in client.headers
    assert (await client.get(BASE)).status_code == 401
    assert (await client.get(f"{BASE}/1/summary")).status_code == 401
