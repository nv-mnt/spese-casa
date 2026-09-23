/**
 * Barra di navigazione laterale del workspace attivo.
 *
 * L'impianto (switcher di contesto in cima + elenco di voci) viene dal
 * componente 21st "Dashboard Sidebar" (@arunjdass), rivestito in stile fumetto.
 *
 * E' un **elenco piatto**: i due workspace non convivono piu' nella stessa
 * barra, si passa dall'uno all'altro dal menu utente in alto a destra. La
 * dashboard non e' una voce, e' la landing del workspace e ci si torna dal
 * marchio qui sopra.
 */

import { CalendarDays, ChevronsUpDown, Check, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { useMese } from '@/context/MeseContext';
import { useWorkspace, type Workspace } from '@/context/WorkspaceContext';
import { usePeriods } from '@/hooks/usePeriods';
import { usePersonalPeriods } from '@/hooks/usePersonal';
import { formatEuro } from '@/lib/format';
import { cn } from '@/lib/utils';

export const LARGHEZZA_APERTA = 276;
export const LARGHEZZA_CHIUSA = 76;

interface VoceNav {
  /** Identita' stabile della voce: e' la `key` di React, mai il percorso. */
  id: string;
  to: string;
  label: string;
  emoji: string;
  /** Regola su misura quando il confronto esatto non basta. */
  match?: (pathname: string) => boolean;
}

/**
 * Una voce e' attiva solo se combaciano **esattamente** percorso e ancora.
 *
 * Il confronto e' esatto di proposito: con `startsWith` una voce restava
 * illuminata anche sulle sottopagine, e piu' voci risultavano attive insieme.
 */
function voceAttiva(voce: VoceNav, pathname: string, hash: string): boolean {
  const [percorso, ancora] = voce.to.split('#');
  const percorsoOk = voce.match ? voce.match(pathname) : pathname === percorso;
  if (!percorsoOk) return false;
  // Con un'ancora serve quella esatta; senza, nessuna ancora.
  return ancora ? hash === `#${ancora}` : hash === '';
}

/** Classi comuni: la forma della voce non cambia fra gli stati. */
const VOCE_BASE = `group flex items-center gap-2.5 rounded-full border-2 py-1.5 pl-2 pr-3
   font-display text-[13px] font-bold transition-all duration-150 ease-boing
   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40`;

/** Stato "illuminato": riservato alla sola voce della pagina corrente. */
const VOCE_ATTIVA = 'border-ink bg-sidebar-accent text-sidebar-foreground shadow-sticker-sm';

/** Riposo + hover: l'evidenziazione compare **solo** al passaggio del mouse. */
const VOCE_RIPOSO = `border-transparent text-sidebar-muted
   hover:-translate-y-[1px] hover:border-ink hover:bg-sidebar-accent/70
   hover:text-sidebar-foreground hover:shadow-sticker-sm`;

function Voce({
  voce,
  attiva,
  onNavigate,
}: {
  voce: VoceNav;
  attiva: boolean;
  onNavigate?: () => void;
}) {
  // `Link` e non `NavLink`: NavLink decide da solo cos'e' "attivo" con un
  // match a prefisso, e finiva per marcare `aria-current="page"` su piu' voci
  // insieme. Qui l'unica fonte di verita' e' `voceAttiva`.
  return (
    <Link
      to={voce.to}
      onClick={onNavigate}
      aria-current={attiva ? 'page' : undefined}
      className={cn(VOCE_BASE, attiva ? VOCE_ATTIVA : VOCE_RIPOSO)}
    >
      <span
        className="flex size-6 shrink-0 items-center justify-center rounded-full border-2
                   border-ink bg-card text-[11px] transition-transform duration-200 ease-boing
                   group-hover:rotate-12"
        aria-hidden="true"
      >
        {voce.emoji}
      </span>
      <span className="truncate">{voce.label}</span>
    </Link>
  );
}

/** Versione a sola icona, usata quando la barra e' ridotta. */
function VoceCollassata({
  voce,
  attiva,
  onNavigate,
}: {
  voce: VoceNav;
  attiva: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to={voce.to}
      onClick={onNavigate}
      title={voce.label}
      aria-label={voce.label}
      aria-current={attiva ? 'page' : undefined}
      className={cn(
        `flex size-10 items-center justify-center rounded-full border-2 text-lg
         transition-all duration-150 ease-boing
         focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40`,
        attiva
          ? 'border-ink bg-card shadow-sticker-sm'
          : `border-transparent hover:-translate-y-[1px] hover:border-ink hover:bg-card
             hover:shadow-sticker-sm`,
      )}
    >
      <span aria-hidden="true">{voce.emoji}</span>
    </Link>
  );
}

/**
 * Selettore del mese: l'unico punto in cui si cambia il mese di **tutta** l'app.
 *
 * Elenca i mesi delle due sezioni fusi per nome, perche' il mese selezionato
 * e' condiviso: resta lo stesso anche cambiando workspace.
 */
function PeriodSwitcher({ collassata }: { collassata: boolean }) {
  const { mese, setMese, meseCorrente, isCorrente } = useMese();
  const { workspace } = useWorkspace();
  const personale = workspace === 'personale';
  const { data: periods } = usePeriods();
  const { data: personalPeriods } = usePersonalPeriods();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Unione dei mesi delle due sezioni: un nome compare una volta sola, perche'
  // il mese e' uno solo. Il dettaglio e i primi posti vanno al workspace
  // attivo: sotto la barra personale si leggono numeri personali.
  const elenco = useMemo(() => {
    const dettagliCasa = new Map<string, string>();
    for (const p of periods ?? []) {
      if (!dettagliCasa.has(p.nome)) {
        dettagliCasa.set(p.nome, `${p.n_spese} voci · ${formatEuro(p.totale_speso)}`);
      }
    }
    const dettagliPersonali = new Map<string, string>();
    for (const p of personalPeriods ?? []) {
      if (!dettagliPersonali.has(p.etichetta)) {
        dettagliPersonali.set(p.etichetta, `carta ${formatEuro(p.saldo_reale)}`);
      }
    }

    const primari = personale ? dettagliPersonali : dettagliCasa;
    const secondari = personale ? dettagliCasa : dettagliPersonali;
    const altrove = personale ? 'Solo spese di casa' : 'Solo budget personale';

    const righe = [
      ...[...primari].map(([nome, dettaglio]) => ({ nome, dettaglio })),
      ...[...secondari.keys()]
        .filter((nome) => !primari.has(nome))
        .map((nome) => ({ nome, dettaglio: altrove })),
    ];

    // Il mese corrente c'e' sempre, anche se non esiste ancora da nessuna
    // parte: e' la vista predefinita e deve poter essere richiamata.
    if (!primari.has(meseCorrente) && !secondari.has(meseCorrente)) {
      righe.unshift({ nome: meseCorrente, dettaglio: 'Ancora da creare' });
    }
    return righe;
  }, [periods, personalPeriods, meseCorrente, personale]);

  const attivo = elenco.find((riga) => riga.nome === mese);

  const scegli = (nome: string) => {
    setMese(nome);
    // Su un URL con id il mese lo detta l'indirizzo: si torna alla rotta senza
    // id, che invece segue il mese selezionato.
    const senzaId = pathname
      .replace(/^\/mesi\/\d+/, '/mesi')
      .replace(/^\/budget\/\d+$/, '/budget');
    if (senzaId !== pathname) navigate(senzaId);
  };

  if (collassata) {
    return (
      <div className="flex justify-center py-1">
        <span
          className="flex size-10 items-center justify-center rounded-full border-2 border-ink
                     bg-accent text-lg shadow-sticker-sm"
          title={mese}
          aria-hidden="true"
        >
          &#128197;
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Mese selezionato: ${mese}. Cambia mese`}
        className="flex w-full items-center justify-between gap-2 rounded-[1.25rem] border-2
                   border-ink bg-card px-2.5 py-2 text-left shadow-sticker-sm
                   transition-all duration-150 ease-boing
                   hover:-translate-y-[2px] hover:shadow-sticker
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full border-2
                       border-ink bg-accent text-base"
            aria-hidden="true"
          >
            &#128197;
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-extrabold leading-tight text-foreground">
              {mese}
            </span>
            <span className="block truncate text-2xs leading-tight text-muted-foreground">
              {attivo?.dettaglio ?? 'Ancora da creare'}
            </span>
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[252px]">
        <DropdownMenuLabel>I tuoi mesi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {elenco.slice(0, 12).map((riga) => (
          <DropdownMenuItem key={riga.nome} onSelect={() => scegli(riga.nome)}>
            <Check className={cn('size-4', riga.nome !== mese && 'invisible')} strokeWidth={3} />
            <span className="flex-1 truncate">{riga.nome}</span>
            {riga.nome === meseCorrente && (
              <span className="rounded-full border-2 border-ink bg-secondary px-1.5 text-2xs font-bold">
                oggi
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {!isCorrente && (
          <DropdownMenuItem onSelect={() => scegli(meseCorrente)}>
            <CalendarDays strokeWidth={3} />
            Vai al mese corrente
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => navigate(personale ? '/budget/elenco' : '/mesi/elenco')}
        >
          <Plus strokeWidth={3} />
          Gestisci i mesi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Le voci del workspace: "Mesi" per prima, mai la dashboard. */
function costruisciVoci(workspace: Workspace): VoceNav[] {
  if (workspace === 'personale') {
    return [
      { id: 'pers-mesi', to: '/budget/elenco', label: 'Mesi', emoji: '\u{1F5C2}\u{FE0F}' },
      {
        id: 'pers-entrate',
        to: '/budget#entrate',
        label: 'Entrate',
        emoji: '\u{1F4B5}',
        match: (path) => path === '/budget' || /^\/budget\/\d+$/.test(path),
      },
      {
        id: 'pers-uscite',
        to: '/budget#uscite',
        label: 'Uscite',
        emoji: '\u{1F4B8}',
        match: (path) => path === '/budget' || /^\/budget\/\d+$/.test(path),
      },
      { id: 'pers-andamento', to: '/budget/andamento', label: 'Andamento', emoji: '\u{1F4C8}' },
    ];
  }

  return [
    { id: 'casa-mesi', to: '/mesi/elenco', label: 'Mesi', emoji: '\u{1F5C2}\u{FE0F}' },
    {
      id: 'casa-entrate-comuni',
      to: '/mesi#entrate-comuni',
      label: 'Entrate comuni',
      emoji: '\u{21A9}\u{FE0F}',
      match: (path) => path === '/mesi' || /^\/mesi\/\d+$/.test(path),
    },
    {
      id: 'casa-rimborso',
      to: '/mesi#rimborso',
      label: 'Rimborso e saldo',
      emoji: '\u{1F91D}',
      match: (path) => path === '/mesi' || /^\/mesi\/\d+$/.test(path),
    },
    { id: 'casa-andamento', to: '/mesi/andamento', label: 'Andamento', emoji: '\u{1F4C8}' },
  ];
}

export function AppSidebar({
  collassata,
  onNavigate,
}: {
  collassata: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const { workspace, home } = useWorkspace();
  const { pathname, hash } = useLocation();

  const voci = useMemo(() => costruisciVoci(workspace), [workspace]);

  const personale = workspace === 'personale';
  const titolo = personale ? 'Spese personali' : 'Spese Casa';
  const sottotitolo = personale
    ? (user?.nome ?? 'Solo tuo')
    : (user?.household.nome ?? 'La nostra casetta');

  return (
    <div className="flex h-full flex-col border-r-3 border-ink bg-sidebar text-sidebar-foreground">
      {/* Marchio: e' anche il ritorno alla dashboard del workspace. */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b-2 border-dashed border-ink/25 px-3',
          collassata && 'justify-center px-0',
        )}
      >
        <Link
          to={home}
          onClick={onNavigate}
          title={`Vai alla dashboard: ${titolo}`}
          className="group flex min-w-0 items-center gap-2.5 rounded-full
                     focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full border-2
                       border-ink bg-primary text-xl shadow-sticker-sm
                       transition-transform duration-300 ease-boing group-hover:rotate-12"
            aria-hidden="true"
          >
            {personale ? '\u{1F45B}' : '\u{1F3E0}'}
          </span>
          {!collassata && (
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-extrabold leading-tight">
                {titolo}
              </span>
              <span className="block truncate text-2xs leading-tight text-sidebar-muted">
                {sottotitolo}
              </span>
            </span>
          )}
        </Link>
      </div>

      <div className={cn('shrink-0 px-3 pt-3', collassata && 'px-2')}>
        <PeriodSwitcher collassata={collassata} />
      </div>

      {/* Navigazione del workspace: elenco piatto, una sola voce attiva. */}
      <nav
        className={cn(
          'scrollbar-none flex-1 overflow-y-auto px-3 py-3',
          collassata && 'flex flex-col items-center gap-2 px-2',
        )}
        aria-label="Navigazione principale"
      >
        {collassata ? (
          voci.map((voce) => (
            <VoceCollassata
              key={voce.id}
              voce={voce}
              attiva={voceAttiva(voce, pathname, hash)}
              onNavigate={onNavigate}
            />
          ))
        ) : (
          <div className="flex flex-col gap-1.5">
            {voci.map((voce) => (
              <Voce
                key={voce.id}
                voce={voce}
                attiva={voceAttiva(voce, pathname, hash)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </nav>

      {!collassata && (
        <div className="shrink-0 border-t-2 border-dashed border-ink/25 px-4 py-3">
          <p className="text-2xs font-semibold leading-relaxed text-sidebar-muted">
            {personale ? (
              <>Solo tuo &#128274; nessuno legge il tuo budget</>
            ) : (
              <>Meta&apos; per uno &#129309; valuta {user?.household.valuta ?? 'EUR'}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
