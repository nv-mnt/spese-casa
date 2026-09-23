/**
 * Selettore del mese, stesso pattern dello switcher della sidebar.
 *
 * Scrive sul mese **globale**: cambiandolo qui si spostano insieme la vista,
 * i sottomenu e l'indicatore in cima alla barra laterale.
 */

import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMese } from '@/context/MeseContext';
import { formatEuro } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PersonalPeriodListItem } from '@/types';

export function PersonalPeriodSelect({
  periods,
  attivoId,
}: {
  periods: PersonalPeriodListItem[];
  attivoId: number;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setMese } = useMese();
  const attivo = periods.find((p) => p.id === attivoId);

  const scegli = (etichetta: string) => {
    setMese(etichetta);
    // Su un link diretto `/budget/:id` il mese lo detta l'URL: si torna alla
    // rotta senza id, che segue il mese selezionato.
    if (/^\/budget\/\d+$/.test(pathname)) navigate('/budget');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-w-[13rem] items-center justify-between gap-2 rounded-full border-2
                   border-ink bg-card px-3 py-2 text-left shadow-sticker-sm
                   transition-all duration-150 ease-boing
                   hover:-translate-y-[2px] hover:shadow-sticker
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        aria-label="Cambia mese"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-accent text-sm"
            aria-hidden="true"
          >
            &#128197;
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-extrabold text-foreground">
              {attivo?.etichetta ?? 'Scegli un mese'}
            </span>
            {attivo && (
              <span className="tabular block truncate text-2xs text-muted-foreground">
                carta {formatEuro(attivo.saldo_reale)}
              </span>
            )}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" strokeWidth={2.5} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-[16rem]">
        <DropdownMenuLabel>I tuoi mesi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {periods.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => scegli(p.etichetta)}>
            <Check className={cn('size-4', p.id !== attivoId && 'invisible')} strokeWidth={3} />
            <span className="flex-1 truncate">{p.etichetta}</span>
            <span className="tabular text-2xs">{formatEuro(p.saldo_dopo_sospese)}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/budget/elenco')}>
          <Plus strokeWidth={3} />
          Gestisci i mesi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
