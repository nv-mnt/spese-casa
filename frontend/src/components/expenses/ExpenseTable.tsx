/** Registro spese: tabella su desktop, lista a schede su mobile. */

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MemberAvatar } from '@/components/ui/member-avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { stileCategoria } from '@/lib/categories';
import { formatDate, formatEuro } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Expense } from '@/types';

interface ExpenseTableProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

function CategoriaPill({ categoria }: { categoria: string }) {
  const stile = stileCategoria(categoria);
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

function MenuAzioni({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-full border-2
                   border-ink bg-card shadow-sticker-sm transition-all duration-150 ease-boing
                   hover:-translate-y-[2px] hover:bg-accent
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
        aria-label={`Azioni su ${expense.descrizione}`}
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

export function ExpenseTable({ expenses, onEdit, onDelete }: ExpenseTableProps) {
  const totale = expenses.reduce((acc, e) => acc + e.importo, 0);

  return (
    <>
      {/* Mobile */}
      <ul className="space-y-2 p-3 sm:hidden">
        {expenses.map((e) => (
          <li
            key={e.id}
            className="flex items-start justify-between gap-3 rounded-[1.25rem] border-2
                       border-ink bg-muted/50 px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-foreground">
                {e.descrizione}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDate(e.data)} &middot; {stileCategoria(e.categoria).emoji} {e.categoria}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MemberAvatar {...e.paid_by} size="xs" />
                {e.paid_by.nome}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="tabular text-sm font-extrabold text-foreground">
                {formatEuro(e.importo)}
              </span>
              <MenuAzioni expense={e} onEdit={onEdit} onDelete={onDelete} />
            </div>
          </li>
        ))}
        <li
          className="flex items-center justify-between rounded-full border-2 border-ink
                     bg-primary px-4 py-2.5 shadow-sticker-sm"
        >
          <span className="font-display text-sm font-extrabold text-primary-foreground">
            Totale
          </span>
          <span className="tabular text-base font-extrabold text-primary-foreground">
            {formatEuro(totale)}
          </span>
        </li>
      </ul>

      {/* Desktop */}
      <div className="hidden sm:block">
        <Table>
          <caption className="sr-only">Registro delle spese del mese</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">Data</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="w-36">Categoria</TableHead>
              <TableHead className="w-40">Pagato da</TableHead>
              <TableHead className="w-32 text-right">Importo</TableHead>
              <TableHead className="w-10 text-right">
                <span className="sr-only">Azioni</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                  {formatDate(e.data)}
                </TableCell>
                <TableCell className="font-medium text-foreground">{e.descrizione}</TableCell>
                <TableCell>
                  <CategoriaPill categoria={e.categoria} />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <MemberAvatar {...e.paid_by} size="xs" />
                    {e.paid_by.nome}
                  </span>
                </TableCell>
                <TableCell className="tabular whitespace-nowrap text-right font-semibold text-foreground">
                  {formatEuro(e.importo)}
                </TableCell>
                <TableCell className="text-right">
                  <MenuAzioni expense={e} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="[&>td]:!bg-primary">
              <TableCell
                colSpan={4}
                className="py-3 text-right font-display text-sm font-extrabold text-primary-foreground"
              >
                Totale ({expenses.length} {expenses.length === 1 ? 'voce' : 'voci'})
              </TableCell>
              <TableCell className="tabular py-3 text-right text-base font-extrabold text-primary-foreground">
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
