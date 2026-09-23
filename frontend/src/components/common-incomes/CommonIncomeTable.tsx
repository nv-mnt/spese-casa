/** Tabella ENTRATE COMUNI: stessa impostazione del registro spese. */

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
import { stileEntrataComune } from '@/lib/commonIncomeCategories';
import { formatDate, formatEuro } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CommonIncome } from '@/types';

interface Props {
  incomes: CommonIncome[];
  onEdit: (income: CommonIncome) => void;
  onDelete: (income: CommonIncome) => void;
}

function CategoriaPill({ categoria }: { categoria: string }) {
  const stile = stileEntrataComune(categoria);
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
  income,
  onEdit,
  onDelete,
}: {
  income: CommonIncome;
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
        aria-label={`Azioni su ${income.descrizione}`}
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

export function CommonIncomeTable({ incomes, onEdit, onDelete }: Props) {
  const totale = incomes.reduce((acc, i) => acc + i.importo, 0);

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
                {i.descrizione}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(i.data)}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <CategoriaPill categoria={i.categoria} />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MemberAvatar {...i.ricevuto_da} size="xs" />
                {i.ricevuto_da.nome}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="tabular text-sm font-extrabold text-success-foreground">
                +{formatEuro(i.importo)}
              </span>
              <MenuAzioni income={i} onEdit={onEdit} onDelete={onDelete} />
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
          <caption className="sr-only">Entrate comuni del mese</caption>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-28">Data</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead className="w-40">Categoria</TableHead>
              <TableHead className="w-40">Ricevuto da</TableHead>
              <TableHead className="w-32 text-right">Importo</TableHead>
              <TableHead className="w-10 text-right">
                <span className="sr-only">Azioni</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="tabular whitespace-nowrap text-muted-foreground">
                  {formatDate(i.data)}
                </TableCell>
                <TableCell className="font-medium text-foreground">{i.descrizione}</TableCell>
                <TableCell>
                  <CategoriaPill categoria={i.categoria} />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <MemberAvatar {...i.ricevuto_da} size="xs" />
                    {i.ricevuto_da.nome}
                  </span>
                </TableCell>
                <TableCell className="tabular whitespace-nowrap text-right font-semibold text-foreground">
                  +{formatEuro(i.importo)}
                </TableCell>
                <TableCell className="text-right">
                  <MenuAzioni income={i} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="[&>td]:!bg-success">
              <TableCell
                colSpan={4}
                className="py-3 text-right font-display text-sm font-extrabold text-success-foreground"
              >
                Totale entrate comuni ({incomes.length})
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
