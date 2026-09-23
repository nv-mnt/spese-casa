/**
 * Mese selezionato: uno solo, condiviso da tutta l'app.
 *
 * Il mese e' identificato dalla sua **etichetta** ("Settembre 2026") e non da
 * un id, perche' le due sezioni hanno id indipendenti ma condividono i nomi:
 * e' gia' cosi' che il riflesso Spese casa -> Budget personale accoppia i mesi.
 *
 * Ogni sezione risolve l'etichetta dentro i propri dati; se li' quel mese non
 * esiste mostra il proprio stato vuoto, **senza** cambiare il mese globale e
 * senza ripiegare su un altro mese.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { suggestPeriodName } from '@/lib/format';

interface MeseContextValue {
  /** Etichetta del mese selezionato, es. "Settembre 2026". */
  mese: string;
  setMese: (etichetta: string) => void;
  /** Etichetta del mese di calendario corrente. */
  meseCorrente: string;
  /** true se il mese selezionato e' quello corrente. */
  isCorrente: boolean;
}

const MeseContext = createContext<MeseContextValue | null>(null);

export function MeseProvider({ children }: { children: ReactNode }) {
  // Volutamente **non** persistito: all'apertura si parte sempre dal mese
  // corrente, come da specifica, non dall'ultimo consultato.
  const meseCorrente = useMemo(() => suggestPeriodName(), []);
  const [mese, setMeseState] = useState(meseCorrente);

  const setMese = useCallback((etichetta: string) => {
    const pulito = etichetta.trim();
    if (pulito) setMeseState(pulito);
  }, []);

  const value = useMemo<MeseContextValue>(
    () => ({ mese, setMese, meseCorrente, isCorrente: mese === meseCorrente }),
    [mese, setMese, meseCorrente],
  );

  return <MeseContext.Provider value={value}>{children}</MeseContext.Provider>;
}

export function useMese(): MeseContextValue {
  const ctx = useContext(MeseContext);
  if (!ctx) throw new Error('useMese deve essere usato dentro <MeseProvider>');
  return ctx;
}

/**
 * Risolve il mese selezionato dentro l'elenco di una sezione.
 *
 * Restituisce `undefined` quando quel mese non esiste nella sezione: e' un
 * caso normale (lo stato vuoto), non un errore.
 */
export function risolviMese<T>(
  elenco: T[] | undefined,
  etichetta: string,
  nomeDi: (voce: T) => string,
): T | undefined {
  return elenco?.find((voce) => nomeDi(voce) === etichetta);
}
