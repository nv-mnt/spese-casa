"""Enum di dominio."""

import enum


class Categoria(str, enum.Enum):
    """Categorie fisse del foglio: non modificabili dall'utente."""

    CASA = "Casa"
    AFFITTO = "Affitto"
    BOLLETTE = "Bollette"
    SPESA = "Spesa"
    TRASPORTI = "Trasporti"
    SVAGO = "Svago"
    SALUTE = "Salute"
    ALTRO = "Altro"


#: Ordine canonico usato nei riepiloghi (lo stesso del foglio Google).
CATEGORIE_ORDINATE: tuple[Categoria, ...] = tuple(Categoria)


class StatoSaldo(str, enum.Enum):
    """Stato del blocco "Rimborso e saldo" di un periodo."""

    IN_PARI = "in_pari"
    DA_SALDARE = "da_saldare"
    SALDATO = "saldato"

    @property
    def label(self) -> str:
        return {
            StatoSaldo.IN_PARI: "Siete in pari",
            StatoSaldo.DA_SALDARE: "● Da saldare",
            StatoSaldo.SALDATO: "✓ Saldato",
        }[self]


class CategoriaEntrata(str, enum.Enum):
    """Categorie delle entrate del budget personale."""

    RIPORTO = "Riporto"
    STIPENDIO = "Stipendio"
    ALTRO = "Altro"


#: Ordine canonico usato nei menu e nei riepiloghi.
CATEGORIE_ENTRATA: tuple[CategoriaEntrata, ...] = tuple(CategoriaEntrata)


class CategoriaUscita(str, enum.Enum):
    """Categorie delle uscite del budget personale.

    Include anche ``Casa`` e ``Bollette``, che esistono fra le spese di casa:
    servono a riflettere una spesa condivisa mantenendone la categoria.
    """

    AFFITTO = "Affitto"
    ASSICURAZIONI = "Assicurazioni"
    TELEFONIA = "Telefonia"
    ABBONAMENTI = "Abbonamenti"
    CURA_PERSONA = "Cura persona"
    FINANZIAMENTI = "Finanziamenti"
    SPESA = "Spesa"
    TRASPORTI = "Trasporti"
    SVAGO = "Svago"
    SALUTE = "Salute"
    CASA = "Casa"
    BOLLETTE = "Bollette"
    ALTRO = "Altro"


#: Ordine canonico usato nei menu e nei riepiloghi.
CATEGORIE_USCITA: tuple[CategoriaUscita, ...] = tuple(CategoriaUscita)


#: Come una categoria di spesa condivisa diventa una categoria personale.
#: Coincidono tutte per nome, quindi la mappa e' diretta.
def categoria_uscita_da_spesa(valore: str) -> CategoriaUscita:
    try:
        return CategoriaUscita(valore)
    except ValueError:  # pragma: no cover - categorie allineate per costruzione
        return CategoriaUscita.ALTRO


class CategoriaEntrataComune(str, enum.Enum):
    """Categorie delle entrate comuni del periodo condiviso."""

    RIMBORSO = "Rimborso"
    RESO = "Reso"
    BONUS = "Bonus"
    ALTRO = "Altro"


#: Ordine canonico usato nei menu e nei riepiloghi.
CATEGORIE_ENTRATA_COMUNE: tuple[CategoriaEntrataComune, ...] = tuple(CategoriaEntrataComune)


class OrigineVoce(str, enum.Enum):
    """Da dove nasce una voce **derivata** del budget personale."""

    SPESA_CASA = "spesa_casa"
    ENTRATA_COMUNE = "entrata_comune"
    CONGUAGLIO = "conguaglio"
