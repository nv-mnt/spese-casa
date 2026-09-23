/** Guscio applicativo: sidebar persistente, topbar con breadcrumb, area di lavoro. */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';

import { AppSidebar, LARGHEZZA_APERTA, LARGHEZZA_CHIUSA } from '@/components/layout/app-sidebar';
import { Topbar, type Breadcrumb } from '@/components/layout/topbar';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { OfflineBar, UpdatePrompt } from '@/components/ui/offline-bar';
import { useMese } from '@/context/MeseContext';
import { usePeriods } from '@/hooks/usePeriods';
import { usePersonalPeriods } from '@/hooks/usePersonal';
import { cn } from '@/lib/utils';

const CHIAVE_COLLASSO = 'spese-casa.sidebar-collassata';

function statoIniziale(): boolean {
  try {
    return window.localStorage.getItem(CHIAVE_COLLASSO) === '1';
  } catch {
    return false;
  }
}

export function Layout() {
  const [collassata, setCollassata] = useState(statoIniziale);
  const [drawerAperto, setDrawerAperto] = useState(false);
  const location = useLocation();
  const { periodId } = useParams<{ periodId: string }>();
  const { data: periods } = usePeriods();
  const { data: personalPeriods } = usePersonalPeriods();
  const { mese } = useMese();

  // Il drawer mobile si chiude a ogni cambio di rotta (anche con il tasto
  // "indietro" del browser). Si aggiusta durante il render, non in un effetto:
  // altrimenti il drawer resterebbe visibile per un frame sulla pagina nuova.
  const [percorsoDelDrawer, setPercorsoDelDrawer] = useState(location.pathname);
  if (percorsoDelDrawer !== location.pathname) {
    setPercorsoDelDrawer(location.pathname);
    setDrawerAperto(false);
  }

  // React Router non salta all'ancora da solo: lo facciamo qui. Arrivando da
  // un'altra pagina la sezione non c'e' ancora (i dati stanno caricando), per
  // cui si riprova per un attimo invece di rinunciare al primo tentativo.
  useEffect(() => {
    if (!location.hash) return undefined;

    let tentativi = 0;
    let timer: number | undefined;

    const prova = () => {
      const bersaglio = document.querySelector(location.hash);
      if (bersaglio) {
        bersaglio.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      // ~2 secondi in tutto: se la sezione non compare, si resta in cima.
      if (++tentativi < 20) timer = window.setTimeout(prova, 100);
    };

    prova();
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, location.key]);

  // Blocca lo scroll del corpo mentre il drawer copre la pagina.
  useEffect(() => {
    if (!drawerAperto) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerAperto]);

  const toggleCollasso = () => {
    setCollassata((precedente) => {
      const successivo = !precedente;
      try {
        window.localStorage.setItem(CHIAVE_COLLASSO, successivo ? '1' : '0');
      } catch {
        /* storage non disponibile: la preferenza vale per la sessione */
      }
      return successivo;
    });
  };

  const breadcrumbs = useMemo<Breadcrumb[]>(() => {
    const path = location.pathname;
    // Sulle rotte senza id il mese e' quello selezionato globale; con un id
    // nell'URL vince l'id (che comunque riallinea la selezione globale).
    const daUrlCasa = periodId ? periods?.find((p) => p.id === Number(periodId)) : undefined;
    const nomeMese = daUrlCasa?.nome ?? mese;
    const casa: Breadcrumb = { label: 'Spese casa', to: '/mesi' };
    const personale: Breadcrumb = { label: 'Spese personali', to: '/budget' };

    if (path === '/impostazioni') return [{ label: 'Impostazioni' }];
    if (path === '/cestino') return [{ label: 'Impostazioni' }, { label: 'Cestino' }];
    if (path === '/mesi/andamento') return [casa, { label: 'Andamento' }];
    if (path === '/mesi/elenco') return [casa, { label: 'Mesi' }];
    if (path === '/budget/andamento') return [personale, { label: 'Andamento' }];
    if (path === '/budget/elenco') return [personale, { label: 'Mesi' }];

    if (path.startsWith('/budget')) {
      const idMese = Number(path.split('/')[2]);
      const daUrl = Number.isNaN(idMese)
        ? undefined
        : personalPeriods?.find((p) => p.id === idMese);
      return [personale, { label: daUrl?.etichetta ?? mese }];
    }

    if (path.endsWith('/spese')) {
      return [
        casa,
        { label: nomeMese, to: periodId ? `/mesi/${periodId}` : '/mesi' },
        { label: 'Registro spese' },
      ];
    }
    if (path.startsWith('/mesi')) return [casa, { label: nomeMese }];
    return [{ label: 'Spese Casa' }];
  }, [location.pathname, periodId, periods, personalPeriods, mese]);

  const larghezza = collassata ? LARGHEZZA_CHIUSA : LARGHEZZA_APERTA;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar fissa su desktop */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 ease-boing lg:block"
        style={{ width: larghezza }}
      >
        <AppSidebar collassata={collassata} />
      </aside>

      {/* Drawer su mobile */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          drawerAperto ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!drawerAperto}
      >
        <div
          className={cn(
            'absolute inset-0 bg-ink/40 backdrop-blur-[3px] transition-opacity duration-200',
            drawerAperto ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setDrawerAperto(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-[272px] shadow-sticker-xl transition-transform duration-200 ease-boing',
            drawerAperto ? 'translate-x-0' : '-translate-x-full',
          )}
          role="dialog"
          aria-modal={drawerAperto}
          aria-label="Navigazione"
        >
          <AppSidebar collassata={false} onNavigate={() => setDrawerAperto(false)} />
        </div>
      </div>

      {/* Area di lavoro */}
      <div
        className="flex min-h-screen flex-col transition-[padding] duration-200 ease-out
                   lg:pl-[var(--sidebar-width)]"
        style={{ '--sidebar-width': `${larghezza}px` } as CSSProperties}
      >
        <OfflineBar />
        <Topbar
          breadcrumbs={breadcrumbs}
          collassata={collassata}
          onToggleCollapse={toggleCollasso}
          onOpenMobile={() => setDrawerAperto(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] animate-pop-in">
            {/* Un errore nella pagina resta dentro il riquadro: sidebar e
                topbar continuano a funzionare e si puo' cambiare sezione. */}
            <ErrorBoundary chiave={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
        <UpdatePrompt />
      </div>
    </div>
  );
}
