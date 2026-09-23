"""CRUD e calcoli del budget personale."""

from __future__ import annotations

from httpx import AsyncClient

BASE = "/api/v1/personal/periods"


def urls(period_id: int) -> dict[str, str]:
    return {
        "incomes": f"{BASE}/{period_id}/incomes",
        "expenses": f"{BASE}/{period_id}/expenses",
        "summary": f"{BASE}/{period_id}/summary",
        "csv": f"{BASE}/{period_id}/export.csv",
    }


async def test_lista_vuota(auth_client: AsyncClient):
    res = await auth_client.get(BASE)
    assert res.status_code == 200
    assert res.json() == []


async def test_crea_mese(auth_client: AsyncClient):
    res = await auth_client.post(
        BASE, json={"etichetta": "Ottobre 2026", "precompila_da_precedente": False}
    )
    assert res.status_code == 201, res.text
    assert res.json()["etichetta"] == "Ottobre 2026"


async def test_etichetta_duplicata_rifiutata(auth_client: AsyncClient, personal_period: dict):
    res = await auth_client.post(
        BASE, json={"etichetta": "ottobre 2026", "precompila_da_precedente": False}
    )
    assert res.status_code == 409


async def test_crea_entrata_e_uscita(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])

    res = await auth_client.post(
        u["incomes"],
        json={"categoria": "Stipendio", "dettaglio": "G-NOUS S.R.L.", "importo": "1684.00"},
    )
    assert res.status_code == 201, res.text
    assert res.json()["importo"] == 1684.0

    res = await auth_client.post(
        u["expenses"],
        json={
            "categoria": "Telefonia",
            "negozio_dettaglio": "UnoMobile",
            "importo": "8.99",
            "pagato": False,
        },
    )
    assert res.status_code == 201, res.text
    assert res.json()["pagato"] is False


async def test_riga_senza_importo_ammessa(auth_client: AsyncClient, personal_period: dict):
    """Le celle vuote del foglio restano vuote, non diventano zero."""
    res = await auth_client.post(
        urls(personal_period["id"])["incomes"],
        json={"categoria": "Riporto", "dettaglio": "Saldo carta al 9/9", "importo": None},
    )
    assert res.status_code == 201, res.text
    assert res.json()["importo"] is None


async def test_importo_negativo_rifiutato(auth_client: AsyncClient, personal_period: dict):
    res = await auth_client.post(
        urls(personal_period["id"])["expenses"],
        json={"categoria": "Spesa", "negozio_dettaglio": "Conad", "importo": "-5.00"},
    )
    assert res.status_code == 422


async def test_toggle_pagato(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])
    creata = await auth_client.post(
        u["expenses"],
        json={"categoria": "Abbonamenti", "negozio_dettaglio": "Claude", "importo": "18.00"},
    )
    expense_id = creata.json()["id"]

    res = await auth_client.patch(f"{u['expenses']}/{expense_id}", json={"pagato": True})
    assert res.status_code == 200, res.text
    assert res.json()["pagato"] is True

    riepilogo = (await auth_client.get(u["summary"])).json()
    assert riepilogo["uscite_pagate"] == 18.0
    assert riepilogo["uscite_in_sospeso"] == 0.0


async def test_elimina_uscita(auth_client: AsyncClient, personal_period: dict):
    u = urls(personal_period["id"])
    creata = await auth_client.post(
        u["expenses"],
        json={"categoria": "Svago", "negozio_dettaglio": "Cinema", "importo": "12.00"},
    )
    res = await auth_client.delete(f"{u['expenses']}/{creata.json()['id']}")
    assert res.status_code == 204
    assert (await auth_client.get(u["expenses"])).json() == []


# --------------------------------------------------------------------------- calcoli


async def test_riepilogo_riproduce_il_foglio(
    auth_client: AsyncClient, seeded_personal_period: dict
):
    """Ottobre 2026 del foglio: 1.749,00 / 932,73 / 1.749,00 / 816,27."""
    res = await auth_client.get(urls(seeded_personal_period["id"])["summary"])
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["entrate_totali"] == 1749.00
    assert body["uscite_totali"] == 932.73
    assert body["uscite_pagate"] == 0.00
    assert body["uscite_in_sospeso"] == 932.73
    assert body["saldo_reale"] == 1749.00
    assert body["saldo_dopo_sospese"] == 816.27


async def test_saldo_reale_segue_le_uscite_pagate(
    auth_client: AsyncClient, seeded_personal_period: dict
):
    u = urls(seeded_personal_period["id"])
    uscite = (await auth_client.get(u["expenses"])).json()
    da_pagare = next(e for e in uscite if e["negozio_dettaglio"] == "Affitto")

    await auth_client.patch(f"{u['expenses']}/{da_pagare['id']}", json={"pagato": True})

    body = (await auth_client.get(u["summary"])).json()
    assert body["uscite_pagate"] == 300.00
    assert body["uscite_in_sospeso"] == 632.73
    # Il saldo carta cala di quanto e' stato addebitato...
    assert body["saldo_reale"] == 1449.00
    # ...mentre il saldo previsto non cambia: l'uscita era gia' conteggiata.
    assert body["saldo_dopo_sospese"] == 816.27


async def test_percentuali_per_categoria(
    auth_client: AsyncClient, seeded_personal_period: dict
):
    body = (await auth_client.get(urls(seeded_personal_period["id"])["summary"])).json()
    per_cat = {c["categoria"]: c for c in body["per_categoria"]}

    # Affitto = Condominio 50 + Affitto 300 + Garage 50 (Luce e Acqua sono vuote).
    assert per_cat["Affitto"]["totale"] == 400.00
    assert per_cat["Finanziamenti"]["totale"] == 365.00
    assert per_cat["Salute"]["totale"] == 0.00
    assert round(sum(c["percentuale"] for c in body["per_categoria"])) == 100


async def test_lista_mesi_con_totali(auth_client: AsyncClient, seeded_personal_period: dict):
    body = (await auth_client.get(BASE)).json()
    assert len(body) == 1
    riga = body[0]
    assert riga["entrate_totali"] == 1749.00
    assert riga["uscite_totali"] == 932.73
    assert riga["saldo_reale"] == 1749.00
    assert riga["saldo_dopo_sospese"] == 816.27


async def test_precompila_da_precedente(
    auth_client: AsyncClient, seeded_personal_period: dict
):
    res = await auth_client.post(
        BASE, json={"etichetta": "Novembre 2026", "precompila_da_precedente": True}
    )
    assert res.status_code == 201, res.text
    nuovo = res.json()["id"]

    uscite = (await auth_client.get(urls(nuovo)["expenses"])).json()
    assert len(uscite) == 14
    assert all(e["pagato"] is False for e in uscite)

    entrate = (await auth_client.get(urls(nuovo)["incomes"])).json()
    riporti = [i for i in entrate if i["categoria"] == "Riporto"]
    assert len(riporti) == 1
    # Il riporto e' il saldo previsto del mese precedente.
    assert riporti[0]["importo"] == 816.27


async def test_export_csv(auth_client: AsyncClient, seeded_personal_period: dict):
    res = await auth_client.get(urls(seeded_personal_period["id"])["csv"])
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    testo = res.content.decode("utf-8-sig")
    assert "ENTRATE" in testo and "USCITE" in testo
    assert "932,73" in testo
    assert "816,27" in testo
