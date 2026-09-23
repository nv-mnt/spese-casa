"""Export CSV di un mese del budget personale (stesso dialetto del condiviso)."""

from __future__ import annotations

import csv
import io
import re
import unicodedata
from decimal import Decimal
from typing import Sequence

from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.schemas.common import quantize
from app.schemas.personal import PersonalSummary


def _fmt_money(value: Decimal | None) -> str:
    if value is None:
        return ""
    return f"{quantize(value):.2f}".replace(".", ",")


def personal_to_csv(
    *,
    period: PersonalPeriod,
    incomes: Sequence[Income],
    expenses: Sequence[PersonalExpense],
    summary: PersonalSummary,
) -> str:
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, delimiter=";", quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")

    writer.writerow(["Budget personale", period.etichetta])
    writer.writerow([])

    writer.writerow(["ENTRATE"])
    writer.writerow(["Categoria", "Dettaglio", "Importo"])
    for i in incomes:
        writer.writerow([i.categoria.value, i.dettaglio, _fmt_money(i.importo)])
    writer.writerow([])

    writer.writerow(["USCITE"])
    writer.writerow(["Categoria", "Negozio / Dettaglio", "Importo", "Pagato"])
    for e in expenses:
        writer.writerow(
            [
                e.categoria.value,
                e.negozio_dettaglio,
                _fmt_money(e.importo),
                "Si" if e.pagato else "No",
            ]
        )
    writer.writerow([])

    writer.writerow(["RIEPILOGO"])
    for etichetta, valore in (
        ("Entrate totali", summary.entrate_totali),
        ("Uscite totali", summary.uscite_totali),
        ("Uscite pagate", summary.uscite_pagate),
        ("Uscite in sospeso", summary.uscite_in_sospeso),
        ("Saldo reale (carta)", summary.saldo_reale),
        ("Saldo dopo spese in sospeso", summary.saldo_dopo_sospese),
    ):
        writer.writerow([etichetta, _fmt_money(valore)])

    return buffer.getvalue()


def personal_csv_filename(etichetta: str) -> str:
    """'Ottobre 2026' -> 'budget-personale-ottobre-2026.csv'."""
    normalizzato = unicodedata.normalize("NFKD", etichetta)
    ascii_only = normalizzato.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_only.lower()).strip("-")
    return f"budget-personale-{slug or 'periodo'}.csv"
