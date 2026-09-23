/** Elenco dei periodi in forma di tabella gestionale, con KPI di sintesi. */

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarPlus, ChevronRight, Layers, MoreHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { getErrorMessage } from '@/api/client';
import { Badge } from '@/components/ui/badge';
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
import { useCreatePeriod, useDeletePeriod, usePeriods } from '@/hooks/usePeriods';
import { useTemplates } from '@/hooks/useTemplates';
import { formatEuro, formatLongDate, suggestPeriodName } from '@/lib/format';
import type { PeriodListItem } from '@/types';

const schema = z.object({
  nome: z.string().trim().min(1, 'Dai un nome al mese').max(120),
  precompila_ricorrenti: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

function SaldoBadge({ period }: { period: PeriodListItem }) {
  if (period.saldo === 0) return <Badge variant="neutral">&#129309; In pari</Badge>;
  if (period.ricevuto) return <Badge variant="success">&#127881; Saldato</Badge>;
  return <Badge variant="warning">&#9203; Da saldare</Badge>;
}

export function PeriodsPage() {
  const { data: periods, isPending, isError, error, refetch } = usePeriods();
  const { data: templates } = useTemplates();
  const creaPeriodo = useCreatePeriod();
  const eliminaPeriodo = useDeletePeriod();
  const navigate = useNavigate();

  const [modaleAperta, setModaleAperta] = useState(false);
  const [daEliminare, setDaEliminare] = useState<PeriodListItem | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nome: suggestPeriodName(), precompila_ricorrenti: true },
  });

  const apriModale = () => {
    reset({ nome: suggestPeriodName(), precompila_ricorrenti: true });
    setModaleAperta(true);
  };

  const invia = handleSubmit(async (values) => {
    const period = await creaPeriodo.mutateAsync(values).catch(() => null);
    if (period) {
      setModaleAperta(false);
      navigate(`/mesi/${period.id}`);
    }
  });

  const confermaEliminazione = async () => {
    if (!daEliminare) return;
    await eliminaPeriodo.mutateAsync(daEliminare.id).catch(() => null);
    setDaEliminare(null);
  };

  const ricorrentiAttive = templates?.filter((t) => t.attivo) ?? [];
  const precompila = watch('precompila_ricorrenti');

  const totaleComplessivo = periods?.reduce((acc, p) => acc + p.totale_speso, 0) ?? 0;
  const totaleVoci = periods?.reduce((acc, p) => acc + p.n_spese, 0) ?? 0;
  const daSaldare = periods?.filter((p) => p.saldo !== 0 && !p.ricevuto).length ?? 0;

  const bottoneNuovo = (
    <Button onClick={apriModale}>
      <CalendarPlus />
      Nuovo mese
    </Button>
  );

  return (
    <div>
      <PageHeader
        emoji={'\u{1F5C2}\u{FE0F}'}
        eyebrow="Panoramica"
        title="I nostri mesi"
        description="Ogni mese raccoglie le sue spese e il conto finale."
        actions={bottoneNuovo}
      />

      {periods && periods.length > 0 && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Mesi"
            value={periods.length}
            hint="Quanti ne abbiamo"
            emoji={'\u{1F5D3}\u{FE0F}'}
            tone="primary"
          />
          <StatCard
            label="Spesa totale"
            value={formatEuro(totaleComplessivo)}
            hint="Somma di tutti i periodi"
            emoji={'\u{1F4B0}'}
          />
          <StatCard
            label="Voci segnate"
            value={totaleVoci}
            hint="Righe nei registri"
            emoji={'\u{1F4DD}'}
          />
          <StatCard
            label="Da saldare"
            value={daSaldare}
            hint={daSaldare === 0 ? 'Tutto a posto!' : 'Mesi ancora aperti'}
            emoji={daSaldare === 0 ? '\u{1F389}' : '\u{23F3}'}
            tone={daSaldare === 0 ? 'success' : 'warning'}
          />
        </div>
      )}

      {isPending && <LoadingState label="Carico i mesi…" />}

      {isError && (
        <ErrorState
          message={getErrorMessage(error, 'Impossibile caricare i mesi')}
          onRetry={() => void refetch()}
        />
      )}

      {periods && periods.length === 0 && (
        <EmptyState
          emoji={'\u{1F423}'}
          title="Ancora nessun mese"
          description="Crea il primo mese e inizia a segnare le spese."
          action={bottoneNuovo}
        />
      )}

      {periods && periods.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle><span aria-hidden="true">&#128198;</span> Elenco mesi</CardTitle>
            <span className="text-xs font-bold text-muted-foreground">
              {periods.length} {periods.length === 1 ? 'mese' : 'mesi'}
            </span>
          </CardHeader>

          {/* Desktop: tabella gestionale */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Mese</TableHead>
                  <TableHead>Creato il</TableHead>
                  <TableHead className="text-right">Voci</TableHead>
                  <TableHead className="text-right">Totale speso</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-10 text-right">
                    <span className="sr-only">Azioni</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id} className="group">
                    <TableCell>
                      <Link
                        to={`/mesi/${p.id}`}
                        className="flex items-center gap-2.5 font-display font-bold text-foreground"
                      >
                        <span
                          className="flex size-8 shrink-0 items-center justify-center rounded-full
                                     border-2 border-ink bg-accent text-sm"
                          aria-hidden="true"
                        >
                          &#128197;
                        </span>
                        {p.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatLongDate(p.created_at)}
                    </TableCell>
                    <TableCell className="tabular text-right text-muted-foreground">
                      {p.n_spese}
                    </TableCell>
                    <TableCell className="tabular text-right font-semibold">
                      {formatEuro(p.totale_speso)}
                    </TableCell>
                    <TableCell className="tabular text-right text-muted-foreground">
                      {p.saldo === 0 ? '—' : formatEuro(p.saldo)}
                    </TableCell>
                    <TableCell>
                      <SaldoBadge period={p} />
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
                          aria-label={`Azioni su ${p.nome}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/mesi/${p.id}`}>
                              <ChevronRight />
                              Apri dashboard
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/mesi/${p.id}/spese`}>
                              <Layers />
                              Registro spese
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

          {/* Mobile: righe a scheda */}
          <ul className="space-y-2 p-3 md:hidden">
            {periods.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/mesi/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-[1.25rem] border-2
                             border-ink bg-muted/50 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-extrabold text-foreground">
                      {p.nome}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.n_spese} {p.n_spese === 1 ? 'voce' : 'voci'} &middot;{' '}
                      {formatLongDate(p.created_at)}
                    </p>
                    <div className="mt-1.5">
                      <SaldoBadge period={p} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-sm font-extrabold text-foreground">
                      {formatEuro(p.totale_speso)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setDaEliminare(p);
                      }}
                      className="mt-2 inline-flex items-center gap-1 rounded-full border-2 border-ink
                                 bg-destructive px-2 py-0.5 text-2xs font-bold
                                 text-destructive-foreground"
                    >
                      <Trash2 className="size-3" />
                      Elimina
                    </button>
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
              <DialogDescription>
Un contenitore fresco fresco per le spese del mese.
              </DialogDescription>
            </DialogHeader>

            <DialogBody className="space-y-4">
              <TextField
                label="Nome del periodo"
                placeholder="Ottobre 2025"
                error={errors.nome?.message}
                {...register('nome')}
              />

              <div className="flex items-start gap-3 rounded-[1.25rem] border-2 border-ink bg-secondary/40 p-3.5">
                <Checkbox
                  id="precompila"
                  className="mt-0.5"
                  checked={precompila}
                  onCheckedChange={(valore) =>
                    setValue('precompila_ricorrenti', valore === true, { shouldDirty: true })
                  }
                />
                <label htmlFor="precompila" className="cursor-pointer text-sm">
                  <span className="font-display font-bold text-foreground">
                    Precompila le spese fisse &#128260;
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {ricorrentiAttive.length > 0
                      ? `Verranno create le righe: ${ricorrentiAttive
                          .map((t) => t.descrizione)
                          .join(', ')}. Importi e "Pagato da" mancanti restano da completare a mano.`
                      : 'Nessuna spesa fissa configurata: puoi aggiungerle da Impostazioni.'}
                  </span>
                </label>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModaleAperta(false)}
                disabled={creaPeriodo.isPending}
              >
                Annulla
              </Button>
              <Button type="submit" loading={creaPeriodo.isPending}>
                Crea periodo
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
            Il mese <strong className="text-foreground">{daEliminare?.nome}</strong> e tutte le
            sue {daEliminare?.n_spese ?? 0} spese verranno eliminati definitivamente.
          </>
        }
        confirmLabel="Sì, elimina"
        loading={eliminaPeriodo.isPending}
        onConfirm={confermaEliminazione}
        onCancel={() => setDaEliminare(null)}
      />
    </div>
  );
}
