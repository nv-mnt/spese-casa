/**
 * Il mese su cui lavora la pagina corrente.
 *
 * Due strade portano allo stesso posto:
 *  - l'URL porta un id (link diretto, segnalibro): comanda l'id, e il mese
 *    globale gli si allinea, cosi' la sidebar mostra sempre la verita';
 *  - l'URL non porta un id: si usa il **mese selezionato** globale, risolto
 *    per nome dentro l'elenco della sezione.
 *
 * Quando quel mese nella sezione non esiste lo stato e' `assente`: la pagina
 * mostra il proprio vuoto, senza ripiegare in silenzio su un altro mese.
 */

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { risolviMese, useMese } from '@/context/MeseContext';
import { usePeriods } from '@/hooks/usePeriods';
import { usePersonalPeriods } from '@/hooks/usePersonal';

export type StatoMese = 'caricamento' | 'trovato' | 'assente' | 'errore';

export interface MeseAttivo {
  /** Id del mese nella sezione, `null` finche' non e' risolto. */
  id: number | null;
  /** Nome del mese selezionato (anche quando nella sezione non esiste). */
  nome: string;
  stato: StatoMese;
  refetch: () => void;
}

/** Tiene allineato il mese globale all'id presente nell'URL. */
function useAllineaDaUrl(nomeDallUrl: string | undefined) {
  const { mese, setMese } = useMese();
  useEffect(() => {
    if (nomeDallUrl && nomeDallUrl !== mese) setMese(nomeDallUrl);
  }, [nomeDallUrl, mese, setMese]);
}

export function useMeseCasa(): MeseAttivo {
  const { periodId } = useParams<{ periodId: string }>();
  const { mese } = useMese();
  const { data: periods, isPending, isError, refetch } = usePeriods();

  const idUrl = periodId ? Number(periodId) : null;
  const daUrl = idUrl !== null ? periods?.find((p) => p.id === idUrl) : undefined;
  const daNome = risolviMese(periods, mese, (p) => p.nome);

  useAllineaDaUrl(daUrl?.nome);

  if (idUrl !== null) {
    // Con un id esplicito la pagina si fida dell'id: il riepilogo dira' da
    // solo se quel mese non esiste piu'.
    return { id: idUrl, nome: daUrl?.nome ?? mese, stato: 'trovato', refetch };
  }

  if (isError) return { id: null, nome: mese, stato: 'errore', refetch };
  if (isPending) return { id: null, nome: mese, stato: 'caricamento', refetch };
  if (!daNome) return { id: null, nome: mese, stato: 'assente', refetch };
  return { id: daNome.id, nome: daNome.nome, stato: 'trovato', refetch };
}

export function useMesePersonale(): MeseAttivo {
  const { personalPeriodId } = useParams<{ personalPeriodId: string }>();
  const { mese } = useMese();
  const { data: periods, isPending, isError, refetch } = usePersonalPeriods();

  const idUrl = personalPeriodId ? Number(personalPeriodId) : null;
  const daUrl = idUrl !== null ? periods?.find((p) => p.id === idUrl) : undefined;
  const daNome = risolviMese(periods, mese, (p) => p.etichetta);

  useAllineaDaUrl(daUrl?.etichetta);

  if (idUrl !== null) {
    return { id: idUrl, nome: daUrl?.etichetta ?? mese, stato: 'trovato', refetch };
  }

  if (isError) return { id: null, nome: mese, stato: 'errore', refetch };
  if (isPending) return { id: null, nome: mese, stato: 'caricamento', refetch };
  if (!daNome) return { id: null, nome: mese, stato: 'assente', refetch };
  return { id: daNome.id, nome: daNome.etichetta, stato: 'trovato', refetch };
}
