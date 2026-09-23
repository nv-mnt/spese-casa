"""
Cestino: le eliminazioni sono recuperabili e non falsano i conti.

Il punto delicato e' che un elemento cestinato sparisca **subito** dai calcoli
ma resti ripristinabile con i suoi valori intatti.
"""

from __future__ import annotations

from httpx import AsyncClient

TRASH = "/api/v1/trash"


async def _crea_spesa(client: AsyncClient, period_id: int, member_id: int, importo: str):
    res = await client.post(
        f"/api/v1/periods/{period_id}/expenses",
        json={
            "descrizione": "Spesa di prova",
            "categoria": "Spesa",
            "paid_by_id": member_id,
            "importo": importo,
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


async def test_cestino_vuoto(auth_client: AsyncClient):
    res = await auth_client.get(TRASH)
    assert res.status_code == 200
    assert res.json() == []


async def test_spesa_cestinata_sparisce_dai_conti_ma_resta_nel_cestino(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    spesa = await _crea_spesa(auth_client, pid, members[0]["id"], "100.00")

    prima = (await auth_client.get(f"/api/v1/periods/{pid}/summary")).json()
    assert prima["totale_speso"] == 100.00

    res = await auth_client.delete(f"/api/v1/periods/{pid}/expenses/{spesa['id']}")
    assert res.status_code == 204

    dopo = (await auth_client.get(f"/api/v1/periods/{pid}/summary")).json()
    assert dopo["totale_speso"] == 0.00
    assert (await auth_client.get(f"/api/v1/periods/{pid}/expenses")).json() == []

    cestino = (await auth_client.get(TRASH)).json()
    assert len(cestino) == 1
    voce = cestino[0]
    assert voce["tipo"] == "expense"
    assert voce["sezione"] == "casa"
    assert voce["etichetta"] == "Spesa di prova"
    assert voce["importo"] == 100.00
    assert voce["contesto"] == period["nome"]
    assert voce["deleted_by"] == "Giuseppe"


async def test_ripristino(auth_client: AsyncClient, period: dict, members: list[dict]):
    pid = period["id"]
    spesa = await _crea_spesa(auth_client, pid, members[0]["id"], "100.00")
    await auth_client.delete(f"/api/v1/periods/{pid}/expenses/{spesa['id']}")

    res = await auth_client.post(f"{TRASH}/expense/{spesa['id']}/restore")
    assert res.status_code == 204

    assert (await auth_client.get(TRASH)).json() == []
    registro = (await auth_client.get(f"/api/v1/periods/{pid}/expenses")).json()
    assert len(registro) == 1
    assert registro[0]["importo"] == 100.00
    riepilogo = (await auth_client.get(f"/api/v1/periods/{pid}/summary")).json()
    assert riepilogo["totale_speso"] == 100.00


async def test_eliminazione_definitiva(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    spesa = await _crea_spesa(auth_client, pid, members[0]["id"], "100.00")
    await auth_client.delete(f"/api/v1/periods/{pid}/expenses/{spesa['id']}")

    res = await auth_client.delete(f"{TRASH}/expense/{spesa['id']}")
    assert res.status_code == 204
    assert (await auth_client.get(TRASH)).json() == []
    # Non e' piu' ripristinabile.
    assert (await auth_client.post(f"{TRASH}/expense/{spesa['id']}/restore")).status_code == 404


async def test_periodo_cestinato_sparisce_dalla_lista(
    auth_client: AsyncClient, period: dict
):
    await auth_client.delete(f"/api/v1/periods/{period['id']}")
    assert (await auth_client.get("/api/v1/periods")).json() == []

    cestino = (await auth_client.get(TRASH)).json()
    assert [v["tipo"] for v in cestino] == ["period"]

    await auth_client.post(f"{TRASH}/period/{period['id']}/restore")
    assert len(((await auth_client.get("/api/v1/periods")).json())) == 1


async def test_entrata_comune_cestinata_rialza_il_saldo(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    await _crea_spesa(auth_client, pid, members[0]["id"], "100.00")
    entrata = await auth_client.post(
        f"/api/v1/periods/{pid}/common-incomes",
        json={
            "descrizione": "Reso",
            "categoria": "Reso",
            "ricevuto_da_id": members[0]["id"],
            "importo": "40.00",
        },
    )
    assert (await auth_client.get(f"/api/v1/periods/{pid}/summary")).json()["saldo"] == 30.00

    await auth_client.delete(f"/api/v1/periods/{pid}/common-incomes/{entrata.json()['id']}")
    assert (await auth_client.get(f"/api/v1/periods/{pid}/summary")).json()["saldo"] == 50.00


async def test_voce_personale_cestinata(auth_client: AsyncClient, personal_period: dict):
    pid = personal_period["id"]
    creata = await auth_client.post(
        f"/api/v1/personal/periods/{pid}/expenses",
        json={"categoria": "Svago", "negozio_dettaglio": "Cinema", "importo": "12.00"},
    )
    await auth_client.delete(f"/api/v1/personal/periods/{pid}/expenses/{creata.json()['id']}")

    riepilogo = (await auth_client.get(f"/api/v1/personal/periods/{pid}/summary")).json()
    assert riepilogo["uscite_totali"] == 0.00

    cestino = (await auth_client.get(TRASH)).json()
    assert [v["sezione"] for v in cestino] == ["personale"]
    assert cestino[0]["tipo"] == "personal_expense"

    await auth_client.post(f"{TRASH}/personal_expense/{creata.json()['id']}/restore")
    riepilogo = (await auth_client.get(f"/api/v1/personal/periods/{pid}/summary")).json()
    assert riepilogo["uscite_totali"] == 12.00


async def test_filtro_per_sezione(
    auth_client: AsyncClient, period: dict, members: list[dict], personal_period: dict
):
    spesa = await _crea_spesa(auth_client, period["id"], members[0]["id"], "10.00")
    await auth_client.delete(f"/api/v1/periods/{period['id']}/expenses/{spesa['id']}")

    uscita = await auth_client.post(
        f"/api/v1/personal/periods/{personal_period['id']}/expenses",
        json={"categoria": "Svago", "negozio_dettaglio": "Cinema", "importo": "12.00"},
    )
    await auth_client.delete(
        f"/api/v1/personal/periods/{personal_period['id']}/expenses/{uscita.json()['id']}"
    )

    solo_casa = (await auth_client.get(f"{TRASH}?sezione=casa")).json()
    assert [v["tipo"] for v in solo_casa] == ["expense"]

    solo_personale = (await auth_client.get(f"{TRASH}?sezione=personale")).json()
    assert [v["tipo"] for v in solo_personale] == ["personal_expense"]


async def test_cestino_personale_e_privato(
    auth_client: AsyncClient, other_client: AsyncClient, personal_period: dict
):
    pid = personal_period["id"]
    creata = await auth_client.post(
        f"/api/v1/personal/periods/{pid}/expenses",
        json={"categoria": "Svago", "negozio_dettaglio": "Segreto", "importo": "12.00"},
    )
    await auth_client.delete(f"/api/v1/personal/periods/{pid}/expenses/{creata.json()['id']}")

    # L'altro utente non lo vede e non puo' toccarlo.
    assert (await other_client.get(TRASH)).json() == []
    assert (
        await other_client.post(f"{TRASH}/personal_expense/{creata.json()['id']}/restore")
    ).status_code == 404
    assert (
        await other_client.delete(f"{TRASH}/personal_expense/{creata.json()['id']}")
    ).status_code == 404


async def test_ripristino_sorgente_ripristina_la_derivata(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    spesa = await _crea_spesa(auth_client, pid, members[0]["id"], "300.00")

    periodi = (await auth_client.get("/api/v1/personal/periods")).json()
    mese = next(p for p in periodi if p["etichetta"] == period["nome"])

    await auth_client.delete(f"/api/v1/periods/{pid}/expenses/{spesa['id']}")
    uscite = (await auth_client.get(f"/api/v1/personal/periods/{mese['id']}/expenses")).json()
    assert uscite == []

    await auth_client.post(f"{TRASH}/expense/{spesa['id']}/restore")
    uscite = (await auth_client.get(f"/api/v1/personal/periods/{mese['id']}/expenses")).json()
    assert len(uscite) == 1
    assert uscite[0]["importo"] == 300.00


async def test_hard_delete_sorgente_rimuove_la_derivata(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    pid = period["id"]
    spesa = await _crea_spesa(auth_client, pid, members[0]["id"], "300.00")
    periodi = (await auth_client.get("/api/v1/personal/periods")).json()
    mese = next(p for p in periodi if p["etichetta"] == period["nome"])

    await auth_client.delete(f"/api/v1/periods/{pid}/expenses/{spesa['id']}")
    await auth_client.delete(f"{TRASH}/expense/{spesa['id']}")

    uscite = (await auth_client.get(f"/api/v1/personal/periods/{mese['id']}/expenses")).json()
    assert uscite == []
    # E non ricompare nel cestino personale: e' sparita davvero.
    assert (await auth_client.get(f"{TRASH}?sezione=personale")).json() == []
