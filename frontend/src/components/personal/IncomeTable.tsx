/** Tabella ENTRATE: desktop a colonne, mobile a schede. */

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatEuro } from '@/lib/format';
import { stileEntrata } from '@/lib/personalCategories';
import { cn } from '@/lib/utils';
import type { Income, OrigineVoce } from '@/types';

interface Props {
  incomes: Income[];
  onEdit: (income: Income) => void;
  onDelete: (income: Income) => void;
}

function CategoriaPill({ categoria }: { categoria: string }) {
  const stile = stileEntrata(categoria);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5',
        'text-xs font-bold text-foreground',
        stile.dot,
      )}
    >
      <span aria-hidden="true">{stile.emoji}</span>
      {categoria}
    </span>
  );
}

/** Le voci che arrivano dalle Spese casa non si toccano da qui. */
function OrigineBadge({ origine }: { origine: OrigineVoce }) {
  const testo =
    origine === 'conguaglio'
      ? 'Conguaglio'
      : origine === 'entrata_comune'
        ? 'Entrata comune'
        : 'Spesa casa';
  return (
    <Badge variant="outline" title="Arriva dalle Spese casa: modificala dalla sorgente">
      <span aria-hidden="true">&#128279;</span>
      {testo}
    </Badge>
  );
}

function MenuAzioni({ income, onEdit, onDelete }: { income: Income } & Omit<Props, 'incomes'>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-full border-2
                   border-ink bg-card shadow-sticker-sm transition-all duration-150 ease-boing
                   hover:-translate-y-[2px] hover:bg-accent
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        aria-label={`Azioni su ${income.dettaglio}`}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(income)}>
          <Pencil />
          Modifica
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => onDelete(income)}>
          <Trash2 />
          Elimina
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function IncomeTable({ incomes, onEdit, onDelete }: Props) {
  const totale = incomes.reduce((acc, i) => acc + (i.importo ?? 0), 0);

  return (
    <>
      {/* Mobile */}
      <ul className="space-y-2 p-3 sm:hidden">
        {incomes.map((i) => (
          <li
            key={i.id}
            className="flex items-start justify-between gap-3 rounded-[1.25rem] border-2
                       border-ink bg-muted/50 px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-foreground">
                {i.dettaglio}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <CategoriaPill categoria={i.categoria} />
                {i.source_type && <OrigineBadge origine={i.source_type} />}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="tabular text-sm font-extrabold text-foreground">
                {i.importo === null ? '—' : formatEuro(i.importo)}
              </span>
              {!i.source_type && (
                <MenuAzioni income={i} onEdit={onEdit} onDelete={onDelete} />
              )}
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between rounded-full border-2 border-ink bg-success px-4 py-2.5 shadow-sticker-sm">
          <span className="font-display text-sm font-extrabold text-success-foreground">
            Totale entrate
          </span>
          <span className="tabular text-base font-extrabold text-success-foreground">
            {formatEuro(totale)}
          </span>
        </li>
      </ul>

      {/* Desktop */}
      <div className="hidden sm:block">
        <Table>
          <caption className="sr-only">Entrate del mese</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-44">Categoria</TableHead>
              <TableHead>Dettaglio</TableHead>
              <TableHead className="w-36 text-right">Importo</TableHead>
              <TableHead className="w-10 text-right">
                <span className="sr-only">Azioni</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.map((i) => (
              <TableRow key={i.id}>
                <TableCell>
                  <CategoriaPill categoria={i.categoria} />
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  <span className="flex flex-wrap items-center gap-2">
                    {i.dettaglio}
                    {i.source_type && <OrigineBadge origine={i.source_type} />}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    'tabular whitespace-nowrap text-right font-semibold',
                    i.importo === null ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {i.importo === null ? '—' : formatEuro(i.importo)}
                </TableCell>
                <TableCell className="text-right">
                  {!i.source_type && (
                    <MenuAzioni income={i} onEdit={onEdit} onDelete={onDelete} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="[&>td]:!bg-success">
              <TableCell
                colSpan={2}
                className="py-3 text-right font-display text-sm font-extrabold text-success-foreground"
              >
                Totale entrate ({incomes.length})
              </TableCell>
              <TableCell className="tabular py-3 text-right text-base font-extrabold text-success-foreground">
                {formatEuro(totale)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  );
}
