/** Formattazioni in stile italiano. */

const currencyFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

/** 1754.66 -> "1.754,66 €" */
export function formatEuro(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return currencyFormatter.format(value);
}

/** 1754.66 -> "1.754,66" (senza simbolo, per gli input) */
export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return numberFormatter.format(value);
}

/** "2025-10-01" -> "01/10/2025"; null -> "—" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateFormatter.format(parsed);
}

/** Data lunga, per i timestamp di creazione. */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return dateTimeFormatter.format(parsed);
}

/**
 * Converte un importo digitato all'italiana ("1.754,66" o "1754,66") nel
 * numero corrispondente. Restituisce NaN se la stringa non e' valida.
 */
export function parseItalianAmount(input: string): number {
  const pulito = input.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (pulito === '') return Number.NaN;
  const valore = Number(pulito);
  return Number.isFinite(valore) ? valore : Number.NaN;
}

/** Percentuale con una cifra decimale: 18.38 -> "18,4%" */
export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

/** Suggerisce l'etichetta del mese corrente, es. "Ottobre 2025". */
export function suggestPeriodName(date: Date = new Date()): string {
  const mese = new Intl.DateTimeFormat('it-IT', { month: 'long' }).format(date);
  return `${mese.charAt(0).toUpperCase()}${mese.slice(1)} ${date.getFullYear()}`;
}
