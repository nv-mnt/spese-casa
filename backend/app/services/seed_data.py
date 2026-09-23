"""Dati d'esempio del foglio Google (periodo "Ottobre 2025").

I totali sono costruiti per riprodurre esattamente il riferimento:

* Totale speso ......... 3.509,32 EUR
* Ha pagato Giuseppe ... 1.709,29 EUR
* Ha pagato Angela ..... 1.800,03 EUR
* Quota a testa (50%) .. 1.754,66 EUR
* Saldo ................    45,37 EUR  ->  Giuseppe deve a Angela

Il seed aggiunge anche un'entrata comune (un reso da 80,00 EUR incassato da
Giuseppe), che sposta i conti su:

* Netto da dividere .... 3.429,32 EUR
* Quota a testa (50%) .. 1.714,66 EUR
* Saldo ................    85,37 EUR  ->  Giuseppe deve a Angela
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from app.models.enums import Categoria, CategoriaEntrataComune

SEED_PERIOD_NOME = "Ottobre 2025"

SEED_USER_NOME = "Giuseppe"
SEED_USER_EMAIL = "demo@spesecasa.it"
SEED_USER_PASSWORD = "demo1234"  # noqa: S105 - credenziale di sola demo


@dataclass(frozen=True, slots=True)
class SeedExpense:
    data: date | None
    descrizione: str
    categoria: Categoria
    #: "A" = primo membro (Giuseppe), "B" = secondo membro (Angela).
    membro: str
    importo: Decimal


def _d(giorno: int) -> date:
    return date(2025, 10, giorno)


SEED_EXPENSES: tuple[SeedExpense, ...] = (
    # --- Angela ---
    SeedExpense(_d(1), "Affitto", Categoria.AFFITTO, "B", Decimal("650.00")),
    SeedExpense(_d(1), "Condominio", Categoria.CASA, "B", Decimal("180.50")),
    SeedExpense(_d(4), "Luce", Categoria.BOLLETTE, "B", Decimal("95.40")),
    SeedExpense(_d(4), "Acqua", Categoria.BOLLETTE, "B", Decimal("48.30")),
    SeedExpense(_d(7), "Spesa Esselunga", Categoria.SPESA, "B", Decimal("142.87")),
    SeedExpense(_d(9), "Spesa Lidl", Categoria.SPESA, "B", Decimal("68.24")),
    SeedExpense(_d(12), "Farmacia", Categoria.SALUTE, "B", Decimal("34.90")),
    SeedExpense(_d(14), "Benzina", Categoria.TRASPORTI, "B", Decimal("60.00")),
    SeedExpense(_d(17), "Cena fuori", Categoria.SVAGO, "B", Decimal("78.50")),
    SeedExpense(_d(17), "Abbonamento Netflix", Categoria.SVAGO, "B", Decimal("12.99")),
    SeedExpense(_d(19), "Detersivi e pulizia casa", Categoria.CASA, "B", Decimal("43.15")),
    SeedExpense(_d(22), "Dentista", Categoria.SALUTE, "B", Decimal("250.00")),
    SeedExpense(_d(25), "Abbonamento metro", Categoria.TRASPORTI, "B", Decimal("35.00")),
    SeedExpense(_d(28), "Regalo compleanno", Categoria.ALTRO, "B", Decimal("45.00")),
    # Riga senza data, come capita nel foglio.
    SeedExpense(None, "Spesa Conad", Categoria.SPESA, "B", Decimal("55.18")),
    # --- Giuseppe ---
    SeedExpense(_d(1), "Gas", Categoria.BOLLETTE, "A", Decimal("112.60")),
    SeedExpense(_d(2), "Internet fibra", Categoria.BOLLETTE, "A", Decimal("29.90")),
    SeedExpense(_d(3), "Spesa Coop", Categoria.SPESA, "A", Decimal("156.43")),
    SeedExpense(_d(5), "Spesa al mercato", Categoria.SPESA, "A", Decimal("42.10")),
    SeedExpense(_d(6), "Assicurazione auto", Categoria.TRASPORTI, "A", Decimal("420.00")),
    SeedExpense(_d(8), "Autostrada e pedaggi", Categoria.TRASPORTI, "A", Decimal("24.80")),
    SeedExpense(_d(10), "Cinema", Categoria.SVAGO, "A", Decimal("22.00")),
    SeedExpense(_d(11), "Abbonamento palestra", Categoria.SVAGO, "A", Decimal("55.00")),
    SeedExpense(_d(13), "Visita medica", Categoria.SALUTE, "A", Decimal("80.00")),
    SeedExpense(_d(15), "Riparazione lavatrice", Categoria.CASA, "A", Decimal("130.00")),
    SeedExpense(_d(16), "Lampadine e ferramenta", Categoria.CASA, "A", Decimal("27.35")),
    SeedExpense(_d(18), "Bollo auto", Categoria.TRASPORTI, "A", Decimal("205.00")),
    SeedExpense(_d(21), "Spesa Carrefour", Categoria.SPESA, "A", Decimal("88.64")),
    SeedExpense(_d(24), "Aperitivo e vino", Categoria.SVAGO, "A", Decimal("36.50")),
    SeedExpense(_d(27), "Spese bancarie", Categoria.ALTRO, "A", Decimal("15.00")),
    SeedExpense(None, "Mobili e arredamento", Categoria.CASA, "A", Decimal("263.97")),
)

@dataclass(frozen=True, slots=True)
class SeedCommonIncome:
    data: date | None
    descrizione: str
    categoria: CategoriaEntrataComune
    #: "A" = primo membro (Giuseppe), "B" = secondo membro (Angela).
    membro: str
    importo: Decimal


#: Entrate comuni d'esempio: un reso incassato da Giuseppe.
SEED_COMMON_INCOMES: tuple[SeedCommonIncome, ...] = (
    SeedCommonIncome(
        _d(19), "Reso Amazon (tostapane)", CategoriaEntrataComune.RESO, "A", Decimal("80.00")
    ),
)

# Valori attesi, usati dal seed come autocontrollo e dai test come riferimento.
EXPECTED_TOTALE = Decimal("3509.32")
EXPECTED_PAGATO_A = Decimal("1709.29")  # Giuseppe
EXPECTED_PAGATO_B = Decimal("1800.03")  # Angela

# Con il reso da 80 EUR incassato da Giuseppe il conto cambia cosi':
#   netto      = 3509.32 - 80.00 = 3429.32
#   quota      = 3429.32 / 2     = 1714.66
#   contributo = 1709.29 - 80.00 = 1629.29  (Giuseppe)
#   saldo      = |1629.29 - 1714.66| = 85.37  -> Giuseppe deve a Angela
#: Riferimenti delle **sole spese** (usati dai test sul motore di calcolo).
EXPECTED_QUOTA = Decimal("1754.66")
EXPECTED_SALDO = Decimal("45.37")

#: Riferimenti **con l'entrata comune**, quelli che il seed verifica.
EXPECTED_ENTRATE_COMUNI = Decimal("80.00")
EXPECTED_NETTO = Decimal("3429.32")
EXPECTED_QUOTA_CON_ENTRATE = Decimal("1714.66")
EXPECTED_SALDO_CON_ENTRATE = Decimal("85.37")

#: Conguaglio gia' versato dal seed: mostra la voce derivata "Conguaglio" nel
#: budget personale di chi lo versa e di chi lo incassa.
SEED_RIMBORSO_VERSATO = Decimal("50.00")
