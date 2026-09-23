/** Tabella USCITE, con toggle "Pagato" in riga e stato ben visibile. */

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatEuro } from '@/lib/format';
import { stileUscita } from '@/lib/personalCategories';
import { cn } from '@/lib/utils';
import type { OrigineVoce, PersonalExpense } from '@/types';

interface Props {
  expenses: PersonalExpense[];
  onEdit: (expense: PersonalExpense) => void;
  onDelete: (expense: PersonalExpense) => void;
  onTogglePagato: (expense: PersonalExpense, pagato: boolean) => void;
  togglingId?: number | null;
}

function CategoriaPill({ categoria }: { categoria: string }) {
  const stile = stileUscita(categoria);
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

function StatoBadge({ pagato }: { pagato: boolean }) {
  return pagato ? (
    <Badge variant="success">&#9989; Pagata</Badge>
  ) : (
    <Badge variant="warning">&#9203; In sospeso</Badge>
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

function MenuAzioni({
  expense,
  onEdit,
  onDelete,
}: {
  expense: PersonalExpense;
  onEdit: Props['onEdit'];
  onDelete: Props['onDelete'];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-full border-2
                   border-ink bg-card shadow-sticker-sm transition-all duration-150 ease-boing
                   hover:-translate-y-[2px] hover:bg-accent
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        aria-label={`Azioni su ${expense.negozio_dettaglio}`}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onEdit(expense)}>
          <Pencil />
          Modifica
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => onDelete(expense)}>
          <Trash2 />
          Elimina
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PersonalExpenseTable({
  expenses,
  onEdit,
  onDelete,
  onTogglePagato,
  togglingId,
}: Props) {
  const totale = expenses.reduce((acc, e) => acc + (e.importo ?? 0), 0);

  return (
    <>
      {/* Mobile */}
      <ul className="space-y-2 p-3 sm:hidden">
        {expenses.map((e) => (
          <li
            key={e.id}
            className={cn(
              'rounded-[1.25rem] border-2 border-ink px-3.5 py-3',
              e.pagato ? 'bg-success/20' : 'bg-muted/50',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {e.negozio_dettaglio}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <CategoriaPill categoria={e.categoria} />
                  <StatoBadge pagato={e.pagato} />
                  {e.source_type && <OrigineBadge origine={e.source_type} />}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="tabular text-sm font-extrabold text-foreground">
                  {e.importo === null ? '—' : formatEuro(e.importo)}
                </span>
                {!e.source_type && (
                  <MenuAzioni expense={e} onEdit={onEdit} onDelete={onDelete} />
                )}
              </div>
            </div>
            <label className="mt-2.5 flex items-center justify-between gap-2 border-t-2 border-dashed border-ink/20 pt-2.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Segna come pagata
              </span>
              <Switch
                checked={e.pagato}
                disabled={togglingId === e.id || Boolean(e.source_type)}
                onCheckedChange={(valore) => onTogglePagato(e, valore)}
                aria-label={`Segna ${e.negozio_dettaglio} come pagata`}
              />
            </label>
          </li>
        ))}
        <li className="flex items-center justify-between rounded-full border-2 border-ink bg-destructive px-4 py-2.5 shadow-sticker-sm">
          <span className="font-display text-sm font-extrabold text-destructive-foreground">
            Totale uscite
          </span>
          <span className="tabular text-base font-extrabold text-destructive-foreground">
            {formatEuro(totale)}
          </span>
        </li>
      </ul>

      {/* Desktop */}
      <div className="hidden sm:block">
        <Table>
          <caption className="sr-only">Uscite del mese</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-44">Categoria</TableHead>
              <TableHead>Negozio / Dettaglio</TableHead>
              <TableHead className="w-32 text-right">Importo</TableHead>
              <TableHead className="w-36">Stato</TableHead>
              <TableHead className="w-24 text-center">Pagato</TableHead>
              <TableHead className="w-10 text-right">
                <span className="sr-only">Azioni</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow
                key={e.id}
                /* Le righe pagate restano distinguibili a colpo d'occhio. */
                className={e.pagato ? '[&>td]:!bg-success/20' : undefined}
              >
                <TableCell>
                  <CategoriaPill categoria={e.categoria} />
                </TableCell>
                <TableCell className="font-medium text-foreground">
                  <span className="flex flex-wrap items-center gap-2">
                    {e.negozio_dettaglio}
                    {e.source_type && <OrigineBadge origine={e.source_type} />}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    'tabular whitespace-nowrap text-right font-semibold',
                    e.importo === null ? 'text-muted-foreground' : 'text-foreground',
                  )}
                >
                  {e.importo === null ? '—' : formatEuro(e.importo)}
                </TableCell>
                <TableCell>
                  <StatoBadge pagato={e.pagato} />
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={e.pagato}
                    disabled={togglingId === e.id || Boolean(e.source_type)}
                    onCheckedChange={(valore) => onTogglePagato(e, valore)}
                    aria-label={`Segna ${e.negozio_dettaglio} come pagata`}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {!e.source_type && (
                    <MenuAzioni expense={e} onEdit={onEdit} onDelete={onDelete} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="[&>td]:!bg-destructive">
              <TableCell
                colSpan={2}
                className="py-3 text-right font-display text-sm font-extrabold text-destructive-foreground"
              >
                Totale uscite ({expenses.length})
              </TableCell>
              <TableCell className="tabular py-3 text-right text-base font-extrabold text-destructive-foreground">
                {formatEuro(totale)}
              </TableCell>
              <TableCell colSpan={3} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </>
  );
}
