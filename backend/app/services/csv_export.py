"""Export del registro spese in CSV.

Il file usa il punto e virgola come separatore e la virgola come separatore
decimale: e' il formato che Excel/LibreOffice in locale italiano aprono
correttamente con un doppio click.
"""

from __future__ import annotations

import csv
import io
from decimal import Decimal
from typing import Sequence

from app.models.common_income import CommonIncome
from app.models.expense import Expense
from app.models.member import Member
from app.schemas.common import quantize
from app.services.summary import build_period_summary
from app.models.period import Period
from app.models.settlement import Settlement

HEADER = ["Data", "Descrizione", "Categoria", "Pagato da", "Importo"]
HEADER_ENTRATE = ["Data", "Descrizione", "Categoria", "Ricevuto da", "Importo"]


def _fmt_money(value: Decimal) -> str:
    return f"{quantize(value):.2f}".replace(".", ",")


def expenses_to_csv(
    *,
    period: Period,
    members: Sequence[Member],
    expenses: Sequence[Expense],
    settlement: Settlement | None,
    common_incomes: Sequence[CommonIncome] = (),
) -> str:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, delimiter=";", quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")

    writer.writerow(HEADER)
    for e in expenses:
        writer.writerow(
            [
                e.data.strftime("%d/%m/%Y") if e.data else "",
                e.descrizione,
                e.categoria.value,
                e.paid_by.nome if e.paid_by else "",
                _fmt_money(Decimal(e.importo)),
            ]
        )

    if common_incomes:
        writer.writerow([])
        writer.writerow(["ENTRATE COMUNI"])
        writer.writerow(HEADER_ENTRATE)
        for entrata in common_incomes:
            writer.writerow(
                [
                    entrata.data.strftime("%d/%m/%Y") if entrata.data else "",
                    entrata.descrizione,
                    entrata.categoria.value,
                    entrata.ricevuto_da.nome if entrata.ricevuto_da else "",
                    _fmt_money(Decimal(entrata.importo)),
                ]
            )

    summary = build_period_summary(
        period=period,
        members=members,
        expenses=expenses,
        common_incomes=common_incomes,
        settlement=settlement,
    )

    writer.writerow([])
    writer.writerow(["RIEPILOGO", period.nome])
    writer.writerow(["Totale speso", "", "", "", _fmt_money(summary.totale_speso)])
    writer.writerow(
        ["Entrate comuni totali", "", "", "", _fmt_money(summary.entrate_comuni_totali)]
    )
    writer.writerow(["Netto da dividere", "", "", "", _fmt_money(summary.netto_da_dividere)])
    for mt in summary.per_membro:
        writer.writerow([f"Ha pagato {mt.member.nome}", "", "", "", _fmt_money(mt.ha_pagato)])
        if summary.entrate_comuni_totali > 0:
            writer.writerow(
                [f"Ha incassato {mt.member.nome}", "", "", "", _fmt_money(mt.ha_ricevuto)]
            )
            writer.writerow(
                [
                    f"Contributo netto {mt.member.nome}",
                    "",
                    "",
                    "",
                    _fmt_money(mt.contributo_netto),
                ]
            )
    writer.writerow(["Quota a testa (50%)", "", "", "", _fmt_money(summary.quota_a_testa)])
    writer.writerow(["Saldo", "", "", "", _fmt_money(summary.saldo)])
    writer.writerow([summary.chi_deve_a_chi])

    writer.writerow([])
    writer.writerow(["PER CATEGORIA"])
    for ct in summary.per_categoria:
        writer.writerow([ct.categoria.value, "", "", "", _fmt_money(ct.totale)])

    writer.writerow([])
    writer.writerow(["RIMBORSO E SALDO"])
    writer.writerow(["Importo dovuto", "", "", "", _fmt_money(summary.rimborso.importo_dovuto)])
    writer.writerow(["Rimborso versato", "", "", "", _fmt_money(summary.rimborso.rimborso_versato)])
    writer.writerow(["Residuo", "", "", "", _fmt_money(summary.rimborso.residuo)])
    writer.writerow(["Stato", summary.rimborso.stato_label])
    writer.writerow(["Ricevuto?", "Si" if summary.rimborso.ricevuto else "No"])

    return buffer.getvalue()


def csv_filename(period_nome: str) -> str:
    slug = "".join(c if c.isalnum() else "-" for c in period_nome.strip().lower())
    slug = "-".join(part for part in slug.split("-") if part) or "periodo"
    return f"spese-{slug}.csv"
