"""Test del motore di calcolo: funzioni pure, nessun database."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from app.models.enums import Categoria, StatoSaldo
from app.models.expense import Expense
from app.models.member import Member
from app.models.period import Period
from app.models.settlement import Settlement
from app.services.seed_data import (
    EXPECTED_PAGATO_A,
    EXPECTED_PAGATO_B,
    EXPECTED_QUOTA,
    EXPECTED_SALDO,
    EXPECTED_TOTALE,
    SEED_EXPENSES,
)
from app.services.summary import (
    build_period_summary,
    compute_balance,
    compute_category_totals,
    compute_settlement_block,
)


def make_members() -> tuple[Member, Member]:
    giuseppe = Member(id=1, household_id=1, nome="Giuseppe", colore="#2563eb")
    angela = Member(id=2, household_id=1, nome="Angela", colore="#db2777")
    return giuseppe, angela


def make_expenses(members: tuple[Member, Member]) -> list[Expense]:
    a, b = members
    ids = {"A": a.id, "B": b.id}
    return [
        Expense(
            id=i + 1,
            period_id=1,
            data=row.data,
            descrizione=row.descrizione,
            categoria=row.categoria,
            paid_by_id=ids[row.membro],
            importo=row.importo,
        )
        for i, row in enumerate(SEED_EXPENSES)
    ]


# --------------------------------------------------------------------------
# compute_balance
# --------------------------------------------------------------------------


def test_balance_riproduce_esempio_del_foglio():
    """Il caso di riferimento: 3.509,32 / 1.709,29 / 1.800,03 -> saldo 45,37."""
    balance = compute_balance(EXPECTED_PAGATO_A, EXPECTED_PAGATO_B)

    assert balance.netto_da_dividere == EXPECTED_TOTALE
    assert balance.contributo_a == EXPECTED_PAGATO_A
    assert balance.contributo_b == EXPECTED_PAGATO_B
    assert balance.quota_a_testa == EXPECTED_QUOTA
    assert balance.saldo == EXPECTED_SALDO
    # Giuseppe (primo membro) ha pagato meno della quota: e' lui il debitore.
    assert balance.debitore_index == 0
    assert balance.in_pari is False


def test_balance_in_pari():
    balance = compute_balance(Decimal("100.00"), Decimal("100.00"))
    assert balance.netto_da_dividere == Decimal("200.00")
    assert balance.quota_a_testa == Decimal("100.00")
    assert balance.saldo == Decimal("0.00")
    assert balance.debitore_index is None
    assert balance.in_pari is True


def test_balance_tutto_pagato_da_uno():
    balance = compute_balance(Decimal("0.00"), Decimal("80.00"))
    assert balance.quota_a_testa == Decimal("40.00")
    assert balance.saldo == Decimal("40.00")
    assert balance.debitore_index == 0


def test_balance_senza_spese():
    balance = compute_balance(Decimal("0"), Decimal("0"))
    assert balance.netto_da_dividere == Decimal("0.00")
    assert balance.saldo == Decimal("0.00")
    assert balance.in_pari is True


def test_balance_debitore_secondo_membro():
    balance = compute_balance(Decimal("300.00"), Decimal("100.00"))
    assert balance.saldo == Decimal("100.00")
    assert balance.debitore_index == 1


def test_balance_arrotonda_la_quota_a_due_decimali():
    """Totale con centesimo dispari: la quota e' arrotondata half-up."""
    balance = compute_balance(Decimal("50.00"), Decimal("50.01"))
    assert balance.netto_da_dividere == Decimal("100.01")
    assert balance.quota_a_testa == Decimal("50.01")  # 50.005 -> 50.01
    assert balance.saldo == Decimal("0.01")
    assert balance.debitore_index == 0


# --------------------------------------------------------------------------
# compute_settlement_block
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("dovuto", "versato", "residuo", "stato"),
    [
        (Decimal("0.00"), Decimal("0.00"), Decimal("0.00"), StatoSaldo.IN_PARI),
        (Decimal("0.00"), Decimal("10.00"), Decimal("-10.00"), StatoSaldo.IN_PARI),
        (Decimal("45.37"), Decimal("0.00"), Decimal("45.37"), StatoSaldo.DA_SALDARE),
        (Decimal("45.37"), Decimal("20.00"), Decimal("25.37"), StatoSaldo.DA_SALDARE),
        (Decimal("45.37"), Decimal("45.37"), Decimal("0.00"), StatoSaldo.SALDATO),
        (Decimal("45.37"), Decimal("50.00"), Decimal("-4.63"), StatoSaldo.SALDATO),
    ],
)
def test_settlement_block(dovuto, versato, residuo, stato):
    block = compute_settlement_block(dovuto, versato, ricevuto=False)
    assert block.importo_dovuto == dovuto
    assert block.rimborso_versato == versato
    assert block.residuo == residuo
    assert block.stato is stato
    assert block.stato_label == stato.label


def test_settlement_labels():
    assert StatoSaldo.IN_PARI.label == "Siete in pari"
    assert StatoSaldo.DA_SALDARE.label == "● Da saldare"
    assert StatoSaldo.SALDATO.label == "✓ Saldato"


def test_settlement_flag_ricevuto():
    block = compute_settlement_block(Decimal("10.00"), Decimal("10.00"), ricevuto=True)
    assert block.ricevuto is True


# --------------------------------------------------------------------------
# compute_category_totals
# --------------------------------------------------------------------------


def test_category_totals_include_sempre_tutte_le_otto_categorie():
    members = make_members()
    expenses = [
        Expense(
            id=1,
            period_id=1,
            data=date(2025, 10, 1),
            descrizione="Affitto",
            categoria=Categoria.AFFITTO,
            paid_by_id=members[0].id,
            importo=Decimal("650.00"),
        )
    ]
    totals = compute_category_totals(expenses, Decimal("650.00"))

    assert len(totals) == 8
    assert [t.categoria for t in totals] == list(Categoria)
    per_cat = {t.categoria: t for t in totals}
    assert per_cat[Categoria.AFFITTO].totale == Decimal("650.00")
    assert per_cat[Categoria.AFFITTO].percentuale == 100.0
    assert per_cat[Categoria.SVAGO].totale == Decimal("0.00")
    assert per_cat[Categoria.SVAGO].percentuale == 0.0


def test_category_totals_totale_zero_non_divide_per_zero():
    totals = compute_category_totals([], Decimal("0.00"))
    assert all(t.totale == Decimal("0.00") and t.percentuale == 0.0 for t in totals)


def test_category_totals_somma_al_totale_del_periodo():
    members = make_members()
    expenses = make_expenses(members)
    totals = compute_category_totals(expenses, EXPECTED_TOTALE)
    assert sum((t.totale for t in totals), Decimal("0.00")) == EXPECTED_TOTALE


# --------------------------------------------------------------------------
# build_period_summary
# --------------------------------------------------------------------------


def test_riepilogo_completo_sul_dataset_di_riferimento():
    members = make_members()
    expenses = make_expenses(members)
    period = Period(id=1, household_id=1, nome="Ottobre 2025")

    summary = build_period_summary(
        period=period, members=list(members), expenses=expenses, settlement=None
    )

    assert summary.totale_speso == EXPECTED_TOTALE
    assert summary.quota_a_testa == EXPECTED_QUOTA
    assert summary.per_membro[0].member.nome == "Giuseppe"
    assert summary.per_membro[0].ha_pagato == EXPECTED_PAGATO_A
    assert summary.per_membro[1].member.nome == "Angela"
    assert summary.per_membro[1].ha_pagato == EXPECTED_PAGATO_B
    assert summary.saldo == EXPECTED_SALDO
    assert summary.in_pari is False
    assert summary.debitore is not None and summary.debitore.nome == "Giuseppe"
    assert summary.creditore is not None and summary.creditore.nome == "Angela"
    assert summary.chi_deve_a_chi == "→ Giuseppe deve a Angela"
    assert summary.n_spese == len(SEED_EXPENSES) == 31

    # Le differenze rispetto alla quota sono simmetriche.
    assert summary.per_membro[0].differenza == Decimal("-45.37")
    assert summary.per_membro[1].differenza == Decimal("45.37")

    # Blocco rimborso: nulla versato -> tutto da saldare.
    assert summary.rimborso.importo_dovuto == EXPECTED_SALDO
    assert summary.rimborso.rimborso_versato == Decimal("0.00")
    assert summary.rimborso.residuo == EXPECTED_SALDO
    assert summary.rimborso.stato is StatoSaldo.DA_SALDARE
    assert summary.rimborso.ricevuto is False


def test_riepilogo_con_rimborso_parziale():
    members = make_members()
    expenses = make_expenses(members)
    period = Period(id=1, household_id=1, nome="Ottobre 2025")
    settlement = Settlement(
        id=1, period_id=1, rimborso_versato=Decimal("20.00"), ricevuto=True
    )

    summary = build_period_summary(
        period=period, members=list(members), expenses=expenses, settlement=settlement
    )
    assert summary.rimborso.residuo == Decimal("25.37")
    assert summary.rimborso.stato is StatoSaldo.DA_SALDARE
    assert summary.rimborso.ricevuto is True


def test_riepilogo_periodo_vuoto_e_in_pari():
    members = make_members()
    period = Period(id=2, household_id=1, nome="Novembre 2025")

    summary = build_period_summary(
        period=period, members=list(members), expenses=[], settlement=None
    )
    assert summary.totale_speso == Decimal("0.00")
    assert summary.saldo == Decimal("0.00")
    assert summary.in_pari is True
    assert summary.debitore is None
    assert summary.creditore is None
    assert summary.chi_deve_a_chi == "Siete in pari"
    assert summary.rimborso.stato is StatoSaldo.IN_PARI
    assert summary.n_spese == 0


def test_riepilogo_richiede_due_membri():
    period = Period(id=1, household_id=1, nome="X")
    solo_uno = [Member(id=1, household_id=1, nome="Giuseppe", colore="#000000")]
    with pytest.raises(ValueError, match="esattamente 2 membri"):
        build_period_summary(
            period=period, members=solo_uno, expenses=[], settlement=None
        )
