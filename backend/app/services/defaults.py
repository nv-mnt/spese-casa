"""Valori di default del dominio."""

from dataclasses import dataclass

from app.models.enums import Categoria


@dataclass(frozen=True, slots=True)
class RecurringDefault:
    descrizione: str
    categoria: Categoria


#: Spese fisse ricorrenti precaricate alla creazione di un household.
#: Importo e "Pagato da" restano vuoti: si completano a mano, come nel foglio.
DEFAULT_RECURRING_TEMPLATES: tuple[RecurringDefault, ...] = (
    RecurringDefault("Condominio", Categoria.CASA),
    RecurringDefault("Affitto", Categoria.AFFITTO),
    RecurringDefault("Luce", Categoria.BOLLETTE),
    RecurringDefault("Acqua", Categoria.BOLLETTE),
)
