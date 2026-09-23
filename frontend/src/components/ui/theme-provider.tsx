/** Tema chiaro/scuro/di sistema, persistito in localStorage. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'spese-casa.theme';

interface ThemeContextValue {
  theme: Theme;
  /** Tema effettivamente applicato una volta risolto "system". */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function letturaIniziale(): Theme {
  try {
    const salvato = window.localStorage.getItem(STORAGE_KEY);
    if (salvato === 'light' || salvato === 'dark' || salvato === 'system') return salvato;
  } catch {
    /* storage non disponibile: si resta su "system" */
  }
  return 'system';
}

function preferenzaSistema(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(letturaIniziale);
  const [sistema, setSistema] = useState<'light' | 'dark'>(preferenzaSistema);

  // Segue il cambio di preferenza del sistema operativo mentre l'app e' aperta.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSistema(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved = theme === 'system' ? sistema : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = useCallback((valore: Theme) => {
    setThemeState(valore);
    try {
      window.localStorage.setItem(STORAGE_KEY, valore);
    } catch {
      /* ignora */
    }
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve essere usato dentro <ThemeProvider>');
  return ctx;
}
