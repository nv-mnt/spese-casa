from decimal import Decimal

from app.models.enums import Categoria, StatoSaldo
from app.schemas.common import Money, ORMModel
from app.schemas.member import MemberOut


class MemberTotal(ORMModel):
    """Contributo di un membro e posizione rispetto alla quota."""

    member: MemberOut
    #: Somma delle spese che ha pagato.
    ha_pagato: Money
    #: Somma delle entrate comuni che ha incassato.
    ha_ricevuto: Money
    #: ha_pagato - ha_ricevuto. Puo' essere negativo.
    contributo_netto: Money
    #: Quanto grava davvero su questo membro (= quota a testa finche' tutte le
    #: spese sono divise a meta').
    quota: Money
    #: contributo_netto - quota. Positivo = ha anticipato, negativo = deve.
    differenza: Money


class CategoryTotal(ORMModel):
    categoria: Categoria
    totale: Money
    #: Percentuale sul totale del periodo (0 se il totale e' 0).
    percentuale: float


class SettlementBlock(ORMModel):
    """Blocco "Rimborso e saldo" del foglio."""

    importo_dovuto: Money
    rimborso_versato: Money
    residuo: Money
    stato: StatoSaldo
    stato_label: str
    ricevuto: bool


class PeriodSummary(ORMModel):
    period_id: int
    period_nome: str
    valuta: str

    #: Somma delle sole spese.
    totale_speso: Money
    #: Somma delle entrate comuni (resi, rimborsi, bonus).
    entrate_comuni_totali: Money
    #: totale_speso - entrate_comuni_totali: e' questo che si divide a meta'.
    netto_da_dividere: Money
    quota_a_testa: Money
    per_membro: list[MemberTotal]

    #: Valore assoluto di quanto un membro deve all'altro.
    saldo: Money
    debitore: MemberOut | None
    creditore: MemberOut | None
    #: Es. "→ Giuseppe deve a Angela" oppure "Siete in pari".
    chi_deve_a_chi: str
    in_pari: bool

    per_categoria: list[CategoryTotal]
    rimborso: SettlementBlock
    n_spese: int
    n_entrate_comuni: int

    #: Spese intestate per intero a un solo membro (0 nel caso normale).
    totale_a_carico_singolo: Money = Decimal("0.00")
    n_spese_a_carico_singolo: int = 0
    #: True quando tutto e' diviso 50/50: la UI mostra una sola riga
    #: "Quota a testa" invece delle due quote separate.
    divisione_semplice: bool = True
