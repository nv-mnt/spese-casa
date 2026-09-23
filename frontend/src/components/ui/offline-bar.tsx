/**
 * Stato della connessione e aggiornamenti dell'app.
 *
 * Offline la lettura continua a funzionare (il service worker serve quel che
 * e' gia' stato visitato), ma le scritture sono bloccate a monte: qui si dice
 * all'utente perche'.
 */

import { CloudOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

/** Stato della connessione, in un hook riusabile. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine !== false,
  );

  useEffect(() => {
    const su = () => setOnline(true);
    const giu = () => setOnline(false);
    window.addEventListener('online', su);
    window.addEventListener('offline', giu);
    return () => {
      window.removeEventListener('online', su);
      window.removeEventListener('offline', giu);
    };
  }, []);

  return online;
}

export function OfflineBar() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      className="flex items-center justify-center gap-2 border-b-2 border-ink bg-warning px-4 py-2
                 text-center font-display text-xs font-bold text-warning-foreground"
      role="status"
    >
      <CloudOff className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      Sei offline: puoi consultare quel che hai gi&agrave; visitato, ma le modifiche non sono
      disponibili.
    </div>
  );
}

/**
 * Avviso di nuova versione.
 *
 * Il service worker e' in `autoUpdate`: scarica da solo la nuova build, ma
 * applicarla ricarica la pagina, quindi si chiede prima all'utente.
 */
export function UpdatePrompt() {
  const [pronta, setPronta] = useState(false);
  const [aggiorna, setAggiorna] = useState<(() => void) | null>(null);

  useEffect(() => {
    let annullato = false;

    async function registra() {
      try {
        // Import dinamico: in sviluppo il modulo virtuale non esiste.
        const { registerSW } = await import('virtual:pwa-register');
        const update = registerSW({
          immediate: true,
          onNeedRefresh() {
            if (!annullato) setPronta(true);
          },
        });
        if (!annullato) setAggiorna(() => () => void update(true));
      } catch {
        /* service worker non disponibile (dev, o browser senza supporto) */
      }
    }

    void registra();
    return () => {
      annullato = true;
    };
  }, []);

  if (!pronta) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-x-4 bottom-4 z-[70] mx-auto flex max-w-md
                 animate-pop-in flex-wrap items-center gap-3 rounded-[1.25rem] border-2
                 border-ink bg-primary px-4 py-3 shadow-sticker-lg sm:inset-x-auto sm:right-4"
      role="status"
    >
      <span className="text-xl leading-none" aria-hidden="true">
        &#127881;
      </span>
      <span className="flex-1 font-display text-sm font-bold text-primary-foreground">
        C&apos;&egrave; una versione nuova dell&apos;app!
      </span>
      <Button size="sm" variant="outline" onClick={() => aggiorna?.()}>
        <RefreshCw />
        Aggiorna
      </Button>
    </div>
  );
}
