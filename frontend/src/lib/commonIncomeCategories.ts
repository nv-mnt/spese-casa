/** Colore e faccina delle categorie di entrata comune. */

import type { CategoriaEntrataComune } from '@/types';

interface StileCategoria {
  dot: string;
  emoji: string;
}

export const STILI_ENTRATA_COMUNE: Record<CategoriaEntrataComune, StileCategoria> = {
  Rimborso: { dot: 'bg-chart-3', emoji: '\u{1F4B8}' },
  Reso: { dot: 'bg-chart-4', emoji: '\u{21A9}\u{FE0F}' },
  Bonus: { dot: 'bg-chart-6', emoji: '\u{1F381}' },
  Altro: { dot: 'bg-chart-8', emoji: '\u{2728}' },
};

const FALLBACK: StileCategoria = { dot: 'bg-chart-8', emoji: '\u{2728}' };

export function stileEntrataComune(categoria: string): StileCategoria {
  return STILI_ENTRATA_COMUNE[categoria as CategoriaEntrataComune] ?? FALLBACK;
}
