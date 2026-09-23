/** Tipi condivisi, allineati agli schemi Pydantic del backend. */

export const CATEGORIE = [
  'Casa',
  'Affitto',
  'Bollette',
  'Spesa',
  'Trasporti',
  'Svago',
  'Salute',
  'Altro',
] as const;

export type Categoria = (typeof CATEGORIE)[number];

export type StatoSaldo = 'in_pari' | 'da_saldare' | 'saldato';

export interface Household {
  id: number;
  nome: string;
  valuta: string;
}

export interface User {
  id: number;
  nome: string;
  email: string;
  household_id: number;
  household: Household;
  /** Riflette i movimenti delle Spese casa nel budget personale. */
  rifletti_spese_casa: boolean;
  /** Quale membro del registro di casa "e'" questo utente. */
  member_id: number | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface Member {
  id: number;
  nome: string;
  colore: string;
  iniziali: string;
  /** Account collegato a questo membro, se c'e'. */
  user_id: number | null;
}

export interface Period {
  id: number;
  nome: string;
  created_at: string;
}

export interface PeriodListItem extends Period {
  n_spese: number;
  totale_speso: number;
  entrate_comuni_totali: number;
  /** Saldo netto: tiene gia' conto delle entrate comuni. */
  saldo: number;
  ricevuto: boolean;
}

export interface Expense {
  id: number;
  period_id: number;
  /** Puo' essere nulla, come le celle vuote del foglio. */
  data: string | null;
  descrizione: string;
  categoria: Categoria;
  paid_by_id: number;
  paid_by: Member;
  importo: number;
  created_at: string;
}

export interface ExpensePayload {
  data?: string | null;
  descrizione: string;
  categoria: Categoria;
  paid_by_id: number;
  importo: number;
}

export interface MemberTotal {
  member: Member;
  /** Somma delle spese che ha pagato. */
  ha_pagato: number;
  /** Somma delle entrate comuni che ha incassato. */
  ha_ricevuto: number;
  /** ha_pagato - ha_ricevuto. Puo' essere negativo. */
  contributo_netto: number;
  /** contributo_netto - quota_a_testa. */
  differenza: number;
}

export interface CategoryTotal {
  categoria: Categoria;
  totale: number;
  percentuale: number;
}

export interface SettlementBlock {
  importo_dovuto: number;
  rimborso_versato: number;
  residuo: number;
  stato: StatoSaldo;
  stato_label: string;
  ricevuto: boolean;
}

export interface PeriodSummary {
  period_id: number;
  period_nome: string;
  valuta: string;
  totale_speso: number;
  entrate_comuni_totali: number;
  /** totale_speso - entrate_comuni_totali: e' questo che si divide a meta'. */
  netto_da_dividere: number;
  quota_a_testa: number;
  per_membro: MemberTotal[];
  saldo: number;
  debitore: Member | null;
  creditore: Member | null;
  chi_deve_a_chi: string;
  in_pari: boolean;
  per_categoria: CategoryTotal[];
  rimborso: SettlementBlock;
  n_spese: number;
  n_entrate_comuni: number;
}

export interface Settlement {
  period_id: number;
  rimborso_versato: number;
  ricevuto: boolean;
}

export interface RecurringTemplate {
  id: number;
  descrizione: string;
  categoria: Categoria;
  importo: number | null;
  paid_by_id: number | null;
  attivo: boolean;
  ordine: number;
}



/* ------------------------------------------------------------------- entrate comuni */

export const CATEGORIE_ENTRATA_COMUNE = ['Rimborso', 'Reso', 'Bonus', 'Altro'] as const;

export type CategoriaEntrataComune = (typeof CATEGORIE_ENTRATA_COMUNE)[number];

export interface CommonIncome {
  id: number;
  period_id: number;
  data: string | null;
  descrizione: string;
  categoria: CategoriaEntrataComune;
  ricevuto_da_id: number;
  ricevuto_da: Member;
  importo: number;
  created_at: string;
}

export interface CommonIncomePayload {
  data?: string | null;
  descrizione: string;
  categoria: CategoriaEntrataComune;
  ricevuto_da_id: number;
  importo: number;
}

/* ------------------------------------------------------------------ budget personale */

export const CATEGORIE_ENTRATA = ['Riporto', 'Stipendio', 'Altro'] as const;

export type CategoriaEntrata = (typeof CATEGORIE_ENTRATA)[number];

export const CATEGORIE_USCITA = [
  'Affitto',
  'Assicurazioni',
  'Telefonia',
  'Abbonamenti',
  'Cura persona',
  'Finanziamenti',
  'Spesa',
  'Trasporti',
  'Svago',
  'Salute',
  'Altro',
] as const;

export type CategoriaUscita = (typeof CATEGORIE_USCITA)[number];

export interface PersonalPeriod {
  id: number;
  etichetta: string;
  created_at: string;
}

export interface PersonalPeriodListItem extends PersonalPeriod {
  n_entrate: number;
  n_uscite: number;
  entrate_totali: number;
  uscite_totali: number;
  saldo_reale: number;
  saldo_dopo_sospese: number;
}

/** Da dove nasce una voce derivata del budget personale. */
export type OrigineVoce = 'spesa_casa' | 'entrata_comune' | 'conguaglio';

export interface Income {
  id: number;
  personal_period_id: number;
  categoria: CategoriaEntrata;
  dettaglio: string;
  /** Puo' essere nulla: e' una riga segnaposto, come le celle vuote del foglio. */
  importo: number | null;
  /** Se presente, la voce arriva dalle Spese casa ed e' di sola lettura. */
  source_type: OrigineVoce | null;
  source_id: number | null;
  created_at: string;
}

export interface IncomePayload {
  categoria: CategoriaEntrata;
  dettaglio: string;
  importo: number | null;
}

export interface PersonalExpense {
  id: number;
  personal_period_id: number;
  categoria: CategoriaUscita;
  negozio_dettaglio: string;
  importo: number | null;
  /** false = in sospeso (non incide sul saldo carta), true = gia' addebitata. */
  pagato: boolean;
  /** Se presente, la voce arriva dalle Spese casa ed e' di sola lettura. */
  source_type: OrigineVoce | null;
  source_id: number | null;
  created_at: string;
}

export interface PersonalExpensePayload {
  categoria: CategoriaUscita;
  negozio_dettaglio: string;
  importo: number | null;
  pagato: boolean;
}

export interface CategoriaUscitaTotale {
  categoria: CategoriaUscita;
  totale: number;
  percentuale: number;
}

export interface PersonalSummary {
  personal_period_id: number;
  etichetta: string;
  valuta: string;
  entrate_totali: number;
  uscite_totali: number;
  uscite_pagate: number;
  uscite_in_sospeso: number;
  saldo_reale: number;
  saldo_dopo_sospese: number;
  n_entrate: number;
  n_uscite: number;
  n_uscite_in_sospeso: number;
  per_categoria: CategoriaUscitaTotale[];
}


/* ------------------------------------------------------------------------ andamenti */

export interface PuntoTrendCasa {
  period_id: number;
  etichetta: string;
  spese_totali: number;
  entrate_comuni_totali: number;
  netto_da_dividere: number;
  saldo: number;
  n_spese: number;
}

export interface PuntoTrendPersonale {
  personal_period_id: number;
  etichetta: string;
  entrate_totali: number;
  uscite_totali: number;
  saldo_reale: number;
  saldo_dopo_sospese: number;
  n_uscite: number;
}

export interface MediaCategoria {
  categoria: string;
  totale: number;
  /** Totale diviso i mesi dell'intervallo, non solo quelli con movimenti. */
  media_mensile: number;
  mesi_con_movimenti: number;
}

export interface MeseCaro {
  etichetta: string;
  totale: number;
}

export interface TrendCasa {
  punti: PuntoTrendCasa[];
  per_categoria: MediaCategoria[];
  mesi_piu_cari: MeseCaro[];
  n_mesi: number;
}

export interface TrendPersonale {
  punti: PuntoTrendPersonale[];
  per_categoria: MediaCategoria[];
  mesi_piu_cari: MeseCaro[];
  n_mesi: number;
}

/* -------------------------------------------------------------------------- cestino */

export type TipoCestinato =
  | 'period'
  | 'expense'
  | 'common_income'
  | 'personal_period'
  | 'income'
  | 'personal_expense';

export type SezioneCestino = 'casa' | 'personale';

export interface ElementoCestinato {
  tipo: TipoCestinato;
  sezione: SezioneCestino;
  id: number;
  etichetta: string;
  contesto: string | null;
  importo: number | null;
  deleted_at: string;
  deleted_by: string | null;
}
