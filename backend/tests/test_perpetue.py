"""Uscite personali perpetue: si ripresentano ogni mese da sole."""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1/personal/periods"


def urls(pid: int) -> dict[str, str]:
    return {
        "incomes": f"{BASE}/{pid}/incomes",
        "expenses": f"{BASE}/{pid}/expenses",
        "summary": f"{BASE}/{pid}/summary",
    }


def uscita(**kwargs) -> dict:
    body = {
        "categoria": "Altro",
        "negozio_dettaglio": "Qualcosa",
        "importo": "10.00",
        "pagato": False,
    }
    body.update(kwargs)
    return body


async def test_default_non_perpetua(auth_client: AsyncClient, personal_period: dict):
    res = await auth_client.post(urls(personal_period["id"])["expenses"], json=uscita())
    assert res.status_code == 201, res.text
    assert res.json()["perpetua"] is False


async def test_crea_perpetua(auth_client: AsyncClient, personal_period: dict):
    res = await auth_client.post(
        urls(personal_period["id"])["expenses"],
        json=uscita(categoria="Affitto", negozio_dettaglio="Affitto", perpetua=True),
    )
    assert res.status_code == 201
    assert res.json()["perpetua"] is True


async def test_flag_modificabile(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])["expenses"]
    creata = (await auth_client.post(u, json=uscita())).json()

    res = await auth_client.patch(f"{u}/{creata['id']}", json={"perpetua": True})
    assert res.status_code == 200
    assert res.json()["perpetua"] is True

    res = await auth_client.patch(f"{u}/{creata['id']}", json={"perpetua": False})
    assert res.json()["perpetua"] is False


async def test_nuovo_mese_riporta_solo_le_perpetue(
    auth_client: AsyncClient, personal_period: dict
):
    u = urls(personal_period["id"])["expenses"]
    await auth_client.post(
        u, json=uscita(categoria="Affitto", negozio_dettaglio="Affitto", importo="650.00", perpetua=True)
    )
    await auth_client.post(
        u,
        json=uscita(
            categoria="Abbonamenti", negozio_dettaglio="Netflix", importo="12.99", perpetua=True
        ),
    )
    # Una tantum: non deve ripresentarsi.
    await auth_client.post(
        u, json=uscita(categoria="Svago", negozio_dettaglio="Concerto", importo="45.00")
    )

    nuovo = await auth_client.post(
        BASE, json={"etichetta": "Mese dopo", "precompila_da_precedente": True}
    )
    assert nuovo.status_code == 201, nuovo.text

    riportate = (await auth_client.get(urls(nuovo.json()["id"])["expenses"])).json()
    descrizioni = sorted(e["negozio_dettaglio"] for e in riportate)
    assert descrizioni == ["Affitto", "Netflix"]
    assert all(e["perpetua"] for e in riportate)
    # Riportate come da pagare, con l'importo del mese prima.
    assert all(e["pagato"] is False for e in riportate)
    assert sorted(e["importo"] for e in riportate) == [12.99, 650.00]


async def test_la_perpetuita_si_propaga_di_mese_in_mese(
    auth_client: AsyncClient, personal_period: dict
):
    await auth_client.post(
        urls(personal_period["id"])["expenses"],
        json=uscita(categoria="Affitto", negozio_dettaglio="Affitto", perpetua=True),
    )
    secondo = (
        await auth_client.post(
            BASE, json={"etichetta": "Mese due", "precompila_da_precedente": True}
        )
    ).json()
    terzo = (
        await auth_client.post(
            BASE, json={"etichetta": "Mese tre", "precompila_da_precedente": True}
        )
    ).json()

    for periodo in (secondo, terzo):
        righe = (await auth_client.get(urls(periodo["id"])["expenses"])).json()
        assert [e["negozio_dettaglio"] for e in righe] == ["Affitto"]
        assert righe[0]["perpetua"] is True


async def test_senza_precompila_non_riporta_niente(
    auth_client: AsyncClient, personal_period: dict
):
    await auth_client.post(
        urls(personal_period["id"])["expenses"],
        json=uscita(negozio_dettaglio="Affitto", perpetua=True),
    )
    nuovo = (
        await auth_client.post(
            BASE, json={"etichetta": "Mese pulito", "precompila_da_precedente": False}
        )
    ).json()
    assert (await auth_client.get(urls(nuovo["id"])["expenses"])).json() == []


async def test_togliere_il_flag_ferma_il_riporto(
    auth_client: AsyncClient, personal_period: dict
):
    u = urls(personal_period["id"])["expenses"]
    creata = (
        await auth_client.post(u, json=uscita(negozio_dettaglio="Palestra", perpetua=True))
    ).json()
    await auth_client.patch(f"{u}/{creata['id']}", json={"perpetua": False})

    nuovo = (
        await auth_client.post(
            BASE, json={"etichetta": "Dopo la disdetta", "precompila_da_precedente": True}
        )
    ).json()
    assert (await auth_client.get(urls(nuovo["id"])["expenses"])).json() == []
