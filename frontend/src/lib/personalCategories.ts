/**
 * Identita' visiva delle categorie del budget personale.
 * Stessa impostazione di `categories.ts` della sezione condivisa: classi
 * Tailwind (cosi' seguono il tema giorno/notte) piu' una faccina.
 */

import type { CategoriaEntrata, CategoriaUscita } from '@/types';

interface StileCategoria {
  fill: string;
  dot: string;
  emoji: string;
}

export const STILI_ENTRATA: Record<CategoriaEntrata, StileCategoria> = {
  Riporto: { fill: 'fill-chart-3', dot: 'bg-chart-3', emoji: '\u{1F501}' },
  Stipendio: { fill: 'fill-chart-4', dot: 'bg-chart-4', emoji: '\u{1F4B5}' },
  Altro: { fill: 'fill-chart-8', dot: 'bg-chart-8', emoji: '\u{2728}' },
};

/* Le categorie di uscita sono 11 e i colori del tema 8: le tinte si ripetono,
   ma l'accoppiata colore + faccina resta sempre distinta. */
export const STILI_USCITA: Record<CategoriaUscita, StileCategoria> = {
  Affitto: { fill: 'fill-chart-2', dot: 'bg-chart-2', emoji: '\u{1F511}' },
  Assicurazioni: { fill: 'fill-chart-1', dot: 'bg-chart-1', emoji: '\u{1F6E1}\u{FE0F}' },
  Telefonia: { fill: 'fill-chart-3', dot: 'bg-chart-3', emoji: '\u{1F4F1}' },
  Abbonamenti: { fill: 'fill-chart-6', dot: 'bg-chart-6', emoji: '\u{1F4FA}' },
  'Cura persona': { fill: 'fill-chart-7', dot: 'bg-chart-7', emoji: '\u{1F488}' },
  Finanziamenti: { fill: 'fill-chart-5', dot: 'bg-chart-5', emoji: '\u{1F4B3}' },
  Spesa: { fill: 'fill-chart-4', dot: 'bg-chart-4', emoji: '\u{1F6D2}' },
  Trasporti: { fill: 'fill-chart-5', dot: 'bg-chart-5', emoji: '\u{1F68C}' },
  Svago: { fill: 'fill-chart-6', dot: 'bg-chart-6', emoji: '\u{1F389}' },
  Salute: { fill: 'fill-chart-7', dot: 'bg-chart-7', emoji: '\u{1F48A}' },
  Altro: { fill: 'fill-chart-8', dot: 'bg-chart-8', emoji: '\u{2728}' },
};

const FALLBACK: StileCategoria = { fill: 'fill-chart-8', dot: 'bg-chart-8', emoji: '\u{2728}' };

export function stileEntrata(categoria: string): StileCategoria {
  return STILI_ENTRATA[categoria as CategoriaEntrata] ?? FALLBACK;
}

export function stileUscita(categoria: string): StileCategoria {
  return STILI_USCITA[categoria as CategoriaUscita] ?? FALLBACK;
}
