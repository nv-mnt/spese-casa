"""
Riflesso delle Spese casa nel Budget personale.

Idea: i movimenti condivisi che toccano davvero la **tua carta** compaiono da
soli fra le tue voci personali, cosi' il "Saldo reale (carta)" e' corretto
senza reinserire niente a mano.

Cosa si riflette, per l'utente collegato al membro coinvolto:

* spesa condivisa pagata da te  -> **uscita** personale dell'importo **intero**
  (dalla tua carta sono usciti tutti quei soldi), gia' pagata;
* entrata comune incassata da te -> **entrata** personale;
* conguaglio che incassi        -> **entrata**; conguaglio che versi -> **uscita**.

Esempio: paghi 300 EUR di affitto (uscita 300) e il partner ti rimborsa 150
(entrata 150): impatto netto -150, cioe' la tua quota reale.

Le voci derivate sono marcate con ``source_type``/``source_id``, sono di sola
lettura e non generano a loro volta altre voci: niente cicli, niente doppi
conteggi.

Il riallineamento e' **idempotente e per periodo**: dopo ogni modifica si
ricalcola l'insieme desiderato e lo si confronta con quello esistente. E' piu'
semplice di una logica incrementale e non puo' andare fuori sincrono.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.trash import cestinati, restore, soft_delete, vivi
from app.models.common_income import CommonIncome
from app.models.enums import (
    CategoriaEntrata,
    CategoriaUscita,
    OrigineVoce,
    categoria_uscita_da_spesa,
)
from app.models.expense import Expense
from app.models.member import Member
from app.models.period import Period
from app.models.personal import Income, PersonalExpense, PersonalPeriod
from app.models.settlement import Settlement
from app.models.user import User
from app.services.summary import compute_balance

ZERO = Decimal("0.00")


@dataclass(frozen=True, slots=True)
class VoceDerivata:
    """Una riga che il budget personale dovrebbe avere."""

    source_type: OrigineVoce
    source_id: int
    descrizione: str
    importo: Decimal
    #: Solo per le uscite.
    categoria_uscita: CategoriaUscita | None = None
    #: Solo per le entrate.
    categoria_entrata: CategoriaEntrata | None = None

    @property
    def chiave(self) -> tuple[OrigineVoce, int]:
        return (self.source_type, self.source_id)


async def _membri(db: AsyncSession, household_id: int) -> list[Member]:
    res = await db.execute(
        select(Member).where(Member.household_id == household_id).order_by(Member.id)
    )
    return list(res.scalars().all())


async def _utenti(db: AsyncSession, household_id: int) -> list[User]:
    res = await db.execute(select(User).where(User.household_id == household_id))
    return list(res.scalars().all())


def _voci_desiderate(
    *,
    member: Member,
    expenses: Sequence[Expense],
    common_incomes: Sequence[CommonIncome],
    conguaglio: tuple[OrigineVoce, int, str, Decimal, bool] | None,
) -> tuple[list[VoceDerivata], list[VoceDerivata]]:
    """Restituisce (entrate, uscite) che il budget di `member` dovrebbe avere."""
    entrate: list[VoceDerivata] = []
    uscite: list[VoceDerivata] = []

    for spesa in expenses:
        if spesa.paid_by_id != member.id:
            continue
        uscite.append(
            VoceDerivata(
                source_type=OrigineVoce.SPESA_CASA,
                source_id=spesa.id,
                descrizione=spesa.descrizione,
                # Importo **intero**: dalla carta sono usciti tutti quei soldi.
                importo=Decimal(spesa.importo),
                categoria_uscita=categoria_uscita_da_spesa(spesa.categoria.value),
            )
        )

    for entrata in common_incomes:
        if entrata.ricevuto_da_id != member.id:
            continue
        entrate.append(
            VoceDerivata(
                source_type=OrigineVoce.ENTRATA_COMUNE,
                source_id=entrata.id,
                descrizione=entrata.descrizione,
                importo=Decimal(entrata.importo),
                categoria_entrata=CategoriaEntrata.ALTRO,
            )
        )

    if conguaglio is not None:
        tipo, source_id, descrizione, importo, in_entrata = conguaglio
        voce = VoceDerivata(
            source_type=tipo,
            source_id=source_id,
            descrizione=descrizione,
            importo=importo,
            categoria_entrata=CategoriaEntrata.ALTRO if in_entrata else None,
            categoria_uscita=None if in_entrata else CategoriaUscita.ALTRO,
        )
        (entrate if in_entrata else uscite).append(voce)

    return entrate, uscite


def _conguaglio_per_membro(
    *,
    member: Member,
    members: Sequence[Member],
    expenses: Sequence[Expense],
    common_incomes: Sequence[CommonIncome],
    settlement: Settlement | None,
    period: Period,
) -> tuple[OrigineVoce, int, str, Decimal, bool] | None:
    """Il conguaglio conta solo per quanto e' stato **davvero** versato."""
    versato = Decimal(settlement.rimborso_versato) if settlement else ZERO
    if versato <= ZERO or len(members) != 2:
        return None

    pagato = {m.id: ZERO for m in members}
    for e in expenses:
        if e.paid_by_id in pagato:
            pagato[e.paid_by_id] += Decimal(e.importo)
    ricevuto = {m.id: ZERO for m in members}
    for i in common_incomes:
        if i.ricevuto_da_id in ricevuto:
            ricevuto[i.ricevuto_da_id] += Decimal(i.importo)

    a, b = members[0], members[1]
    balance = compute_balance(
        pagato[a.id] - ricevuto[a.id], pagato[b.id] - ricevuto[b.id]
    )
    if balance.debitore_index is None:
        return None

    debitore = a if balance.debitore_index == 0 else b
    creditore = b if balance.debitore_index == 0 else a

    if member.id == creditore.id:
        return (
            OrigineVoce.CONGUAGLIO,
            period.id,
            f"Conguaglio ricevuto da {debitore.nome}",
            versato,
            True,
        )
    if member.id == debitore.id:
        return (
            OrigineVoce.CONGUAGLIO,
            period.id,
            f"Conguaglio versato a {creditore.nome}",
            versato,
            False,
        )
    return None


async def _periodo_personale(
    db: AsyncSession, owner_id: int, etichetta: str, *, crea: bool
) -> PersonalPeriod | None:
    """Il mese personale che corrisponde al periodo condiviso, per etichetta."""
    res = await db.execute(
        select(PersonalPeriod).where(
            PersonalPeriod.owner_id == owner_id,
            PersonalPeriod.etichetta == etichetta,
        )
    )
    period = res.scalar_one_or_none()
    if period is not None:
        # Un mese nel cestino torna disponibile se ci finisce dentro qualcosa.
        if period.deleted_at is not None and crea:
            await restore(db, period)
        return period
    if not crea:
        return None
    period = PersonalPeriod(owner_id=owner_id, etichetta=etichetta)
    db.add(period)
    await db.flush()
    return period


async def _riallinea(
    db: AsyncSession,
    *,
    esistenti: Sequence[Income | PersonalExpense],
    desiderate: Sequence[VoceDerivata],
    personal_period_id: int,
    modello: type[Income] | type[PersonalExpense],
) -> None:
    """Crea, aggiorna, ripristina o cestina le voci derivate di una tabella."""
    per_chiave = {(r.source_type, r.source_id): r for r in esistenti}
    volute = {v.chiave: v for v in desiderate}

    for chiave, voce in volute.items():
        riga = per_chiave.get(chiave)
        if riga is None:
            comune = {
                "personal_period_id": personal_period_id,
                "importo": voce.importo,
                "source_type": voce.source_type,
                "source_id": voce.source_id,
            }
            if modello is Income:
                db.add(
                    Income(
                        categoria=voce.categoria_entrata or CategoriaEntrata.ALTRO,
                        dettaglio=voce.descrizione,
                        **comune,
                    )
                )
            else:
                db.add(
                    PersonalExpense(
                        categoria=voce.categoria_uscita or CategoriaUscita.ALTRO,
                        negozio_dettaglio=voce.descrizione,
                        # E' un movimento gia' avvenuto sulla carta.
                        pagato=True,
                        **comune,
                    )
                )
            continue

        # Esiste: la si riallinea alla sorgente (e la si ripesca dal cestino).
        if riga.deleted_at is not None:
            await restore(db, riga)
        riga.importo = voce.importo
        if isinstance(riga, Income):
            riga.dettaglio = voce.descrizione
            riga.categoria = voce.categoria_entrata or CategoriaEntrata.ALTRO
        else:
            riga.negozio_dettaglio = voce.descrizione
            riga.categoria = voce.categoria_uscita or CategoriaUscita.ALTRO
            riga.pagato = True

    # Quel che non e' piu' voluto va nel cestino (non cancellato).
    for chiave, riga in per_chiave.items():
        if chiave not in volute and riga.deleted_at is None:
            await soft_delete(db, riga)

    await db.flush()


async def sync_period(db: AsyncSession, period: Period) -> None:
    """Riallinea le voci derivate di **un** periodo condiviso.

    Va chiamata dopo ogni scrittura su spese, entrate comuni o conguaglio.
    E' idempotente: chiamarla due volte di fila non cambia niente.
    """
    members = await _membri(db, period.household_id)
    users = {u.id: u for u in await _utenti(db, period.household_id)}

    periodo_cestinato = period.deleted_at is not None

    if periodo_cestinato:
        expenses: list[Expense] = []
        common_incomes: list[CommonIncome] = []
        settlement = None
    else:
        expenses = list(
            (
                await db.execute(
                    select(Expense).where(Expense.period_id == period.id, vivi(Expense))
                )
            )
            .unique()
            .scalars()
            .all()
        )
        common_incomes = list(
            (
                await db.execute(
                    select(CommonIncome).where(
                        CommonIncome.period_id == period.id, vivi(CommonIncome)
                    )
                )
            )
            .unique()
            .scalars()
            .all()
        )
        settlement = (
            await db.execute(select(Settlement).where(Settlement.period_id == period.id))
        ).scalar_one_or_none()

    for member in members:
        utente = users.get(member.user_id) if member.user_id else None
        if utente is None:
            # Membro non collegato a nessun account: niente da riflettere.
            continue

        attivo = bool(utente.rifletti_spese_casa) and not periodo_cestinato
        entrate, uscite = (
            _voci_desiderate(
                member=member,
                expenses=expenses,
                common_incomes=common_incomes,
                conguaglio=_conguaglio_per_membro(
                    member=member,
                    members=members,
                    expenses=expenses,
                    common_incomes=common_incomes,
                    settlement=settlement,
                    period=period,
                ),
            )
            if attivo
            else ([], [])
        )

        # Senza niente da riflettere non si crea un mese personale a vuoto.
        deve_esistere = bool(entrate or uscite)
        personale = await _periodo_personale(
            db, utente.id, period.nome, crea=deve_esistere
        )
        if personale is None:
            continue

        derivate_entrate = list(
            (
                await db.execute(
                    select(Income).where(
                        Income.personal_period_id == personale.id,
                        Income.source_type.is_not(None),
                    )
                )
            )
            .scalars()
            .all()
        )
        derivate_uscite = list(
            (
                await db.execute(
                    select(PersonalExpense).where(
                        PersonalExpense.personal_period_id == personale.id,
                        PersonalExpense.source_type.is_not(None),
                    )
                )
            )
            .scalars()
            .all()
        )

        await _riallinea(
            db,
            esistenti=derivate_entrate,
            desiderate=entrate,
            personal_period_id=personale.id,
            modello=Income,
        )
        await _riallinea(
            db,
            esistenti=derivate_uscite,
            desiderate=uscite,
            personal_period_id=personale.id,
            modello=PersonalExpense,
        )


async def sync_household(db: AsyncSession, household_id: int) -> None:
    """Riallinea tutti i periodi di uno household (usata dopo l'opt-in)."""
    res = await db.execute(
        select(Period)
        .where(Period.household_id == household_id)
        .options(selectinload(Period.expenses))
    )
    for period in res.unique().scalars().all():
        await sync_period(db, period)


async def hard_delete_derivate(
    db: AsyncSession, source_type: OrigineVoce, source_id: int
) -> None:
    """Cancella davvero le voci nate da una sorgente eliminata definitivamente."""
    for modello in (Income, PersonalExpense):
        res = await db.execute(
            select(modello).where(
                modello.source_type == source_type, modello.source_id == source_id
            )
        )
        for riga in res.scalars().all():
            await db.delete(riga)
    await db.flush()


__all__ = ["sync_period", "sync_household", "hard_delete_derivate", "cestinati"]
