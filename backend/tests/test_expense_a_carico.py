"""Spese condivise interamente a carico di un solo membro."""

from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.models.expense import Expense
from app.models.member import Member
from app.models.period import Period
from app.services.summary import build_period_summary, compute_dovuto_a


def url(period_id: int, expense_id: int | None = None) -> str:
    base = f"/api/v1/periods/{period_id}/expenses"
    return base if expense_id is None else f"{base}/{expense_id}"


def spesa(auth_client_members: list[dict], **kwargs) -> dict:
    body = {
        "descrizione": "Acquisto",
        "categoria": "Altro",
        "paid_by_id": auth_client_members[0]["id"],
        "importo": "100.00",
    }
    body.update(kwargs)
    return body


# --------------------------------------------------------------------------
# Calcolo puro
# --------------------------------------------------------------------------


def make_members() -> tuple[Member, Member]:
    return (
        Member(id=1, household_id=1, nome="Giuseppe", colore="#2563eb"),
        Member(id=2, household_id=1, nome="Angela", colore="#db2777"),
    )


def make_expense(importo: str, paid_by_id: int, a_carico_di_id: int | None = None) -> Expense:
    return Expense(
        id=1,
        period_id=1,
        data=None,
        descrizione="X",
        categoria="Altro",
        paid_by_id=paid_by_id,
        a_carico_di_id=a_carico_di_id,
        importo=Decimal(importo),
    )


def test_quota_di_spesa_divisa():
    e = make_expense("100.00", paid_by_id=1)
    assert e.divisa_a_meta is True
    assert e.quota_di(1) == Decimal("50")
    assert e.quota_di(2) == Decimal("50")


def test_quota_di_spesa_intestata():
    e = make_expense("100.00", paid_by_id=1, a_carico_di_id=2)
    assert e.divisa_a_meta is False
    assert e.quota_di(1) == Decimal("0")
    assert e.quota_di(2) == Decimal("100.00")


def test_compute_dovuto_a_mix():
    """Due spese divise e una intestata: le quote non sono piu' uguali."""
    spese = [
        make_expense("100.00", paid_by_id=1),
        make_expense("60.00", paid_by_id=2),
        make_expense("40.00", paid_by_id=1, a_carico_di_id=2),
    ]
    # Giuseppe: meta' di 160. Angela: l'altra meta' piu' i 40 intestati a lei.
    assert compute_dovuto_a(member_a_id=1, expenses=spese) == Decimal("80.00")
    assert compute_dovuto_a(member_a_id=2, expenses=spese) == Decimal("120.00")


def test_riepilogo_spesa_tutta_a_carico_dellaltro():
    """Giuseppe paga 100 per una cosa di Angela: Angela gli deve 100."""
    a, b = make_members()
    period = Period(id=1, household_id=1, nome="Test")
    spese = [make_expense("100.00", paid_by_id=a.id, a_carico_di_id=b.id)]

    s = build_period_summary(
        period=period, members=[a, b], expenses=spese, settlement=None
    )
    assert s.totale_speso == Decimal("100.00")
    assert s.per_membro[0].quota == Decimal("0.00")
    assert s.per_membro[1].quota == Decimal("100.00")
    assert s.saldo == Decimal("100.00")
    assert s.debitore is not None and s.debitore.nome == "Angela"
    assert s.chi_deve_a_chi == "→ Angela deve a Giuseppe"
    assert s.divisione_semplice is False
    assert s.totale_a_carico_singolo == Decimal("100.00")
    assert s.n_spese_a_carico_singolo == 1


def test_riepilogo_spesa_a_carico_di_chi_paga_e_neutra():
    """Se te la paghi da solo, il saldo non si muove."""
    a, b = make_members()
    period = Period(id=1, household_id=1, nome="Test")
    spese = [make_expense("100.00", paid_by_id=a.id, a_carico_di_id=a.id)]

    s = build_period_summary(
        period=period, members=[a, b], expenses=spese, settlement=None
    )
    assert s.totale_speso == Decimal("100.00")
    assert s.saldo == Decimal("0.00")
    assert s.in_pari is True
    assert s.chi_deve_a_chi == "Siete in pari"
    assert s.per_membro[0].quota == Decimal("100.00")
    assert s.per_membro[1].quota == Decimal("0.00")


def test_riepilogo_senza_intestazioni_resta_come_prima():
    a, b = make_members()
    period = Period(id=1, household_id=1, nome="Test")
    spese = [make_expense("100.00", paid_by_id=a.id)]

    s = build_period_summary(
        period=period, members=[a, b], expenses=spese, settlement=None
    )
    assert s.divisione_semplice is True
    assert s.totale_a_carico_singolo == Decimal("0.00")
    assert s.quota_a_testa == Decimal("50.00")
    assert s.per_membro[0].quota == s.per_membro[1].quota == Decimal("50.00")
    assert s.saldo == Decimal("50.00")
    assert s.debitore is not None and s.debitore.nome == "Angela"


def test_le_quote_sommano_sempre_al_netto():
    a, b = make_members()
    period = Period(id=1, household_id=1, nome="Test")
    spese = [
        make_expense("33.33", paid_by_id=a.id),
        make_expense("10.01", paid_by_id=b.id, a_carico_di_id=a.id),
    ]
    s = build_period_summary(
        period=period, members=[a, b], expenses=spese, settlement=None
    )
    quote = s.per_membro[0].quota + s.per_membro[1].quota
    assert quote == s.netto_da_dividere


# --------------------------------------------------------------------------
# API
# --------------------------------------------------------------------------


async def test_crea_spesa_a_carico_di(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    res = await auth_client.post(
        url(period["id"]),
        json=spesa(members, a_carico_di_id=members[1]["id"]),
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["a_carico_di_id"] == members[1]["id"]
    assert body["a_carico_di"]["nome"] == "Angela"
    assert body["divisa_a_meta"] is False


async def test_spesa_senza_a_carico_resta_divisa(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    res = await auth_client.post(url(period["id"]), json=spesa(members))
    assert res.status_code == 201
    assert res.json()["a_carico_di_id"] is None
    assert res.json()["divisa_a_meta"] is True


async def test_riepilogo_api_con_spesa_intestata(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await auth_client.post(
        url(period["id"]), json=spesa(members, a_carico_di_id=members[1]["id"])
    )
    body = (await auth_client.get(f"/api/v1/periods/{period['id']}/summary")).json()

    assert body["saldo"] == 100.0
    assert body["debitore"]["nome"] == "Angela"
    assert body["divisione_semplice"] is False
    assert body["totale_a_carico_singolo"] == 100.0
    per_membro = {m["member"]["nome"]: m for m in body["per_membro"]}
    assert per_membro["Giuseppe"]["quota"] == 0.0
    assert per_membro["Angela"]["quota"] == 100.0


async def test_modifica_verso_e_da_spesa_intestata(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    creata = (await auth_client.post(url(period["id"]), json=spesa(members))).json()
    summary_url = f"/api/v1/periods/{period['id']}/summary"
    assert (await auth_client.get(summary_url)).json()["saldo"] == 50.0

    # La intesto ad Angela: ora gli deve tutti e 100.
    res = await auth_client.patch(
        url(period["id"], creata["id"]), json={"a_carico_di_id": members[1]["id"]}
    )
    assert res.status_code == 200
    assert (await auth_client.get(summary_url)).json()["saldo"] == 100.0

    # Torno alla divisione a meta' passando null.
    res = await auth_client.patch(
        url(period["id"], creata["id"]), json={"a_carico_di_id": None}
    )
    assert res.status_code == 200
    assert res.json()["divisa_a_meta"] is True
    assert (await auth_client.get(summary_url)).json()["saldo"] == 50.0


async def test_a_carico_di_estraneo_allhousehold(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    res = await auth_client.post(url(period["id"]), json=spesa(members, a_carico_di_id=9999))
    assert res.status_code == 422


async def test_lista_periodi_riflette_il_saldo(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    await auth_client.post(
        url(period["id"]), json=spesa(members, a_carico_di_id=members[1]["id"])
    )
    item = next(
        p for p in (await auth_client.get("/api/v1/periods")).json() if p["id"] == period["id"]
    )
    assert item["totale_speso"] == 100.0
    assert item["saldo"] == 100.0


async def test_mix_divise_e_intestate_via_api(
    auth_client: AsyncClient, period: dict, members: list[dict]
):
    g, a = members[0]["id"], members[1]["id"]
    await auth_client.post(url(period["id"]), json=spesa(members, importo="100.00", paid_by_id=g))
    await auth_client.post(url(period["id"]), json=spesa(members, importo="60.00", paid_by_id=a))
    await auth_client.post(
        url(period["id"]),
        json=spesa(members, importo="40.00", paid_by_id=g, a_carico_di_id=a),
    )

    body = (await auth_client.get(f"/api/v1/periods/{period['id']}/summary")).json()
    assert body["totale_speso"] == 200.0
    per_membro = {m["member"]["nome"]: m for m in body["per_membro"]}
    assert per_membro["Giuseppe"]["ha_pagato"] == 140.0
    assert per_membro["Giuseppe"]["quota"] == 80.0
    assert per_membro["Angela"]["ha_pagato"] == 60.0
    assert per_membro["Angela"]["quota"] == 120.0
    # Giuseppe ha messo 140 ma gliene spettavano 80: Angela gli deve 60.
    assert body["saldo"] == 60.0
    assert body["debitore"]["nome"] == "Angela"


@pytest.mark.parametrize("importo", ["0.01", "9999.99"])
async def test_estremi_importo_con_intestazione(
    auth_client: AsyncClient, period: dict, members: list[dict], importo: str
):
    res = await auth_client.post(
        url(period["id"]),
        json=spesa(members, importo=importo, a_carico_di_id=members[1]["id"]),
    )
    assert res.status_code == 201
    body = (await auth_client.get(f"/api/v1/periods/{period['id']}/summary")).json()
    assert body["saldo"] == float(importo)
