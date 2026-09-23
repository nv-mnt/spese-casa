"""
Dati reali del foglio "Budget mensile 2026" (budget personale).

Riferimenti da riprodurre:
* Ottobre 2026     entrate   1749.0 | uscite   932.73 | saldo previsto   816.27
* Novembre 2026    entrate   1684.0 | uscite   932.73 | saldo previsto   751.27
* Dicembre 2026    entrate   3200.0 | uscite   932.73 | saldo previsto  2267.27

Le celle vuote del foglio restano ``None``: valgono zero nelle somme ma
si distinguono da un importo davvero pari a zero.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

from app.models.enums import CategoriaEntrata, CategoriaUscita


@dataclass(frozen=True, slots=True)
class SeedIncome:
    categoria: CategoriaEntrata
    dettaglio: str
    importo: Decimal | None


@dataclass(frozen=True, slots=True)
class SeedPersonalExpense:
    categoria: CategoriaUscita
    negozio_dettaglio: str
    importo: Decimal | None
    pagato: bool = False


@dataclass(frozen=True, slots=True)
class SeedPersonalPeriod:
    etichetta: str
    incomes: tuple[SeedIncome, ...] = field(default_factory=tuple)
    expenses: tuple[SeedPersonalExpense, ...] = field(default_factory=tuple)


#: I tre mesi del foglio, dal piu' vecchio al piu' recente.
PERSONAL_SEED_PERIODS: tuple[SeedPersonalPeriod, ...] = (
    SeedPersonalPeriod(
        etichetta="Ottobre 2026",
        incomes=(
            SeedIncome(CategoriaEntrata.RIPORTO, "Saldo carta al 9/9 (pre-stipendio)", None),
            SeedIncome(CategoriaEntrata.STIPENDIO, "G-NOUS S.R.L.", Decimal("1684.00")),
            SeedIncome(CategoriaEntrata.STIPENDIO, "Maze", Decimal("65.00")),
        ),
        expenses=(
            SeedPersonalExpense(CategoriaUscita.ASSICURAZIONI, "Alleata Previdenza", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.ASSICURAZIONI, "Semplice Alleanza", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.TELEFONIA, "UnoMobile", Decimal("8.99"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Revolut Metal", Decimal("15.99"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Claude", Decimal("18.00"), False),
            SeedPersonalExpense(CategoriaUscita.CURA_PERSONA, "Barber Shop Di Gelsomino", Decimal("13.00"), False),
            SeedPersonalExpense(CategoriaUscita.FINANZIAMENTI, "iPhone", Decimal("75.00"), False),
            SeedPersonalExpense(CategoriaUscita.FINANZIAMENTI, "Rata Finanziamento", Decimal("290.00"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Sky Wi-Fi", Decimal("11.75"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Condominio", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Affitto", Decimal("300.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Garage", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Luce", None, False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Acqua", None, False),
        ),
    ),
    SeedPersonalPeriod(
        etichetta="Novembre 2026",
        incomes=(
            SeedIncome(CategoriaEntrata.RIPORTO, "Saldo carta al 9/9 (pre-stipendio)", None),
            SeedIncome(CategoriaEntrata.STIPENDIO, "G-NOUS S.R.L.", Decimal("1684.00")),
        ),
        expenses=(
            SeedPersonalExpense(CategoriaUscita.ASSICURAZIONI, "Alleata Previdenza", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.ASSICURAZIONI, "Semplice Alleanza", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.TELEFONIA, "UnoMobile", Decimal("8.99"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Revolut Metal", Decimal("15.99"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Claude", Decimal("18.00"), False),
            SeedPersonalExpense(CategoriaUscita.CURA_PERSONA, "Barber Shop Di Gelsomino", Decimal("13.00"), False),
            SeedPersonalExpense(CategoriaUscita.FINANZIAMENTI, "iPhone", Decimal("75.00"), False),
            SeedPersonalExpense(CategoriaUscita.FINANZIAMENTI, "Rata Finanziamento", Decimal("290.00"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Sky Wi-Fi", Decimal("11.75"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Condominio", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Affitto", Decimal("300.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Garage", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Luce", None, False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Acqua", None, False),
        ),
    ),
    SeedPersonalPeriod(
        etichetta="Dicembre 2026",
        incomes=(
            SeedIncome(CategoriaEntrata.RIPORTO, "Saldo carta al 9/9 (pre-stipendio)", None),
            SeedIncome(CategoriaEntrata.STIPENDIO, "G-NOUS S.R.L.", Decimal("3200.00")),
        ),
        expenses=(
            SeedPersonalExpense(CategoriaUscita.ASSICURAZIONI, "Alleata Previdenza", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.ASSICURAZIONI, "Semplice Alleanza", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.TELEFONIA, "UnoMobile", Decimal("8.99"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Revolut Metal", Decimal("15.99"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Claude", Decimal("18.00"), False),
            SeedPersonalExpense(CategoriaUscita.CURA_PERSONA, "Barber Shop Di Gelsomino", Decimal("13.00"), False),
            SeedPersonalExpense(CategoriaUscita.FINANZIAMENTI, "iPhone", Decimal("75.00"), False),
            SeedPersonalExpense(CategoriaUscita.FINANZIAMENTI, "Rata Finanziamento", Decimal("290.00"), False),
            SeedPersonalExpense(CategoriaUscita.ABBONAMENTI, "Sky Wi-Fi", Decimal("11.75"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Condominio", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Affitto", Decimal("300.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Garage", Decimal("50.00"), False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Luce", None, False),
            SeedPersonalExpense(CategoriaUscita.AFFITTO, "Acqua", None, False),
        ),
    ),
)
