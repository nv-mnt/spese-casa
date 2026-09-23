/** Elenco dei mesi del budget personale (sezione privata dell'utente). */

import { CalendarPlus, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TextField } from '@/components/ui/field';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreatePersonalPeriod,
  useDeletePersonalPeriod,
  usePersonalPeriods,
} from '@/hooks/usePersonal';
import { formatEuro, formatLongDate, suggestPeriodName } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PersonalPeriodListItem } from '@/types';

export function PersonalBudgetPage() {
  const { data: periods, isPending, isError, error, refetch } = usePersonalPeriods();
  const creaMese = useCreatePersonalPeriod();
  const eliminaMese = useDeletePersonalPeriod();
  const navigate = useNavigate();

  const [modaleAperta, setModaleAperta] = useState(false);
  const [etichetta, setEtichetta] = useState(suggestPeriodName());
  const [precompila, setPrecompila] = useState(true);
  const [daEliminare, setDaEliminare] = useState<PersonalPeriodListItem | null>(null);

  const apriModale = () => {
    setEtichetta(suggestPeriodName());
    setPrecompila((periods?.length ?? 0) > 0);
    setModaleAperta(true);
  };

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (etichetta.trim() === '') return;
    const creato = await creaMese
      .mutateAsync({
        etichetta: etichetta.trim(),
        precompila_da_precedente: precompila,
      })
      .catch(() => null);
    if (creato) {
      setModaleAperta(false);
      navigate(`/budget/${creato.id}`);
    }
  };

  const confermaEliminazione = async () => {
    if (!daEliminare) return;
    await eliminaMese.mutateAsync(daEliminare.id).catch(() => null);
    setDaEliminare(null);
  };

  const ultimo = periods?.[0];
  const bottoneNuovo = (
    <Button onClick={apriModale}>
      <CalendarPlus />
      Nuovo mese
    </Button>
  );

  return (
    <div>
      <PageHeader
        emoji={'\u{1F45B}'}
        eyebrow="Solo tuo"
        title="Budget personale"
        description="Entrate e uscite del tuo mese. Nessuno pu&ograve; vederle, nemmeno chi condivide la casa con te."
        actions={bottoneNuovo}
      />

      {ultimo && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={`Entrate ${ultimo.etichetta}`}
            value={formatEuro(ultimo.entrate_totali)}
            hint={`${ultimo.n_entrate} voci`}
            emoji={'\u{1F4B5}'}
            tone="success"
          />
          <StatCard
            label="Uscite"
            value={formatEuro(ultimo.uscite_totali)}
            hint={`${ultimo.n_uscite} voci`}
            emoji={'\u{1F4B8}'}
            tone="destructive"
          />
          <StatCard
            label="Saldo carta"
            value={formatEuro(ultimo.saldo_reale)}
            hint="Soldi disponibili ora"
            emoji={'\u{1F4B3}'}
            tone="primary"
          />
          <StatCard
            label="Dopo le sospese"
            value={formatEuro(ultimo.saldo_dopo_sospese)}
            hint="Quando avrai pagato tutto"
            emoji={ultimo.saldo_dopo_sospese >= 0 ? '\u{1F642}' : '\u{1F630}'}
            tone={ultimo.saldo_dopo_sospese >= 0 ? 'warning' : 'destructive'}
          />
        </div>
      )}

      {isPending && <LoadingState label="Carico il tuo budget…" />}

      {isError && (
        <ErrorState
          message={getErrorMessage(error, 'Impossibile caricare il budget personale')}
          onRetry={() => void refetch()}
        />
      )}

      {periods && periods.length === 0 && (
        <EmptyState
          emoji={'\u{1F4B3}'}
          title="Il tuo budget &egrave; tutto da scrivere"
          description="Crea il primo mese, segna quanto entra e quanto esce, e scopri cosa ti resta davvero sulla carta."
          action={bottoneNuovo}
        />
      )}

      {periods && periods.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              <span aria-hidden="true">&#128198;</span> I tuoi mesi
            </CardTitle>
            <span className="text-xs font-bold text-muted-foreground">
              {periods.length} {periods.length === 1 ? 'mese' : 'mesi'}
            </span>
          </CardHeader>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Mese</TableHead>
                  <TableHead className="text-right">Entrate</TableHead>
                  <TableHead className="text-right">Uscite</TableHead>
                  <TableHead className="text-right">Saldo carta</TableHead>
                  <TableHead className="text-right">Dopo sospese</TableHead>
                  <TableHead className="w-10 text-right">
                    <span className="sr-only">Azioni</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        to={`/budget/${p.id}`}
                        className="flex items-center gap-2.5 font-display font-bold text-foreground"
                      >
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-accent text-sm"
                          aria-hidden="true"
                        >
                          &#128181;
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{p.etichetta}</span>
                          <span className="block text-2xs font-normal text-muted-foreground">
                            {formatLongDate(p.created_at)}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="tabular text-right font-semibold text-foreground">
                      {formatEuro(p.entrate_totali)}
                    </TableCell>
                    <TableCell className="tabular text-right font-semibold text-foreground">
                      {formatEuro(p.uscite_totali)}
                    </TableCell>
                    <TableCell className="tabular text-right font-extrabold text-foreground">
                      {formatEuro(p.saldo_reale)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'tabular text-right font-extrabold',
                        p.saldo_dopo_sospese < 0 ? 'text-destructive-foreground' : 'text-foreground',
                      )}
                    >
                      {formatEuro(p.saldo_dopo_sospese)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-8 items-center justify-center rounded-full
                                     border-2 border-ink bg-card shadow-sticker-sm
                                     transition-all duration-150 ease-boing
                                     hover:-translate-y-[2px] hover:bg-accent
                                     focus-visible:outline-none focus-visible:ring-4
                                     focus-visible:ring-ring/40"
                          aria-label={`Azioni su ${p.etichetta}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/budget/${p.id}`}>
                              <ChevronRight />
                              Apri il mese
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => setDaEliminare(p)}>
                            <Trash2 />
                            Elimina mese
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <ul className="space-y-2 p-3 md:hidden">
            {periods.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/budget/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-[1.25rem] border-2 border-ink bg-muted/50 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-extrabold text-foreground">
                      {p.etichetta}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.n_entrate} entrate &middot; {p.n_uscite} uscite
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-extrabold text-foreground">
                      {formatEuro(p.saldo_reale)}
                    </p>
                    <p className="tabular text-2xs text-muted-foreground">
                      poi {formatEuro(p.saldo_dopo_sospese)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Dialog open={modaleAperta} onOpenChange={setModaleAperta}>
        <DialogContent>
          <form onSubmit={invia} noValidate className="contents">
            <DialogHeader>
              <DialogTitle>&#10024; Nuovo mese</DialogTitle>
              <DialogDescription>Un foglio nuovo per entrate e uscite.</DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <TextField
                label="Nome del mese"
                placeholder="Ottobre 2026"
                value={etichetta}
                onChange={(e) => setEtichetta(e.target.value)}
              />

              <div className="flex items-start gap-3 rounded-[1.25rem] border-2 border-ink bg-secondary/40 p-3.5">
                <Checkbox
                  id="precompila-budget"
                  className="mt-0.5"
                  checked={precompila}
                  disabled={(periods?.length ?? 0) === 0}
                  onCheckedChange={(valore) => setPrecompila(valore === true)}
                />
                <label htmlFor="precompila-budget" className="cursor-pointer text-sm">
                  <span className="font-display font-bold text-foreground">
                    Ricopia dal mese precedente &#128260;
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {(periods?.length ?? 0) === 0
                      ? 'Disponibile dal secondo mese in poi.'
                      : `Riporta le uscite fisse di "${periods?.[0]?.etichetta}" come "in sospeso" e aggiunge un Riporto con il saldo previsto.`}
                  </span>
                </label>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModaleAperta(false)}
                disabled={creaMese.isPending}
              >
                Annulla
              </Button>
              <Button type="submit" loading={creaMese.isPending}>
                Crea mese
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={daEliminare !== null}
        title="Eliminare il mese?"
        message={
          <>
            <strong className="text-foreground">{daEliminare?.etichetta}</strong> e tutte le sue{' '}
            {(daEliminare?.n_entrate ?? 0) + (daEliminare?.n_uscite ?? 0)} righe verranno
            eliminati definitivamente.
          </>
        }
        confirmLabel="S&igrave;, elimina"
        loading={eliminaMese.isPending}
        onConfirm={confermaEliminazione}
        onCancel={() => setDaEliminare(null)}
      />
    </div>
  );
}
