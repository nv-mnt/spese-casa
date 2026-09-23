/**
 * Identita' visiva di ogni categoria: colore pastello (classi Tailwind, cosi'
 * seguono il tema giorno/notte) e faccina, che nello stile fumettoso conta
 * quanto il colore.
 */

import type { Categoria } from '@/types';

interface StileCategoria {
  /** Riempimento per le barre Recharts. */
  fill: string;
  /** Pastiglia per la legenda. */
  dot: string;
  emoji: string;
}

export const STILI_CATEGORIA: Record<Categoria, StileCategoria> = {
  Casa: { fill: 'fill-chart-1', dot: 'bg-chart-1', emoji: '\u{1F3E0}' },
  Affitto: { fill: 'fill-chart-2', dot: 'bg-chart-2', emoji: '\u{1F511}' },
  Bollette: { fill: 'fill-chart-3', dot: 'bg-chart-3', emoji: '\u{1F4A1}' },
  Spesa: { fill: 'fill-chart-4', dot: 'bg-chart-4', emoji: '\u{1F6D2}' },
  Trasporti: { fill: 'fill-chart-5', dot: 'bg-chart-5', emoji: '\u{1F68C}' },
  Svago: { fill: 'fill-chart-6', dot: 'bg-chart-6', emoji: '\u{1F389}' },
  Salute: { fill: 'fill-chart-7', dot: 'bg-chart-7', emoji: '\u{1F48A}' },
  Altro: { fill: 'fill-chart-8', dot: 'bg-chart-8', emoji: '\u{2728}' },
};

const FALLBACK: StileCategoria = { fill: 'fill-chart-8', dot: 'bg-chart-8', emoji: '\u{2728}' };

export function stileCategoria(categoria: string): StileCategoria {
  return STILI_CATEGORIA[categoria as Categoria] ?? FALLBACK;
}
