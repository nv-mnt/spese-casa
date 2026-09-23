/**
 * Dashboard del budget personale: stesso impianto di quella delle spese di
 * casa (selettore in alto, riepilogo, tabelle, grafici), ma privata.
 *
 * Senza id nell'URL segue il **mese selezionato** globale, lo stesso della
 * sidebar e delle spese di casa; il selettore in alto lo cambia per tutti.
 */

import { Download, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '@/api/client';
import { personalApi } from '@/api/personal';
import { IncomeForm } from '@/components/personal/IncomeForm';
import { IncomeTable } from '@/components/personal/IncomeTable';
import { PersonalCategoryCard } from '@/components/personal/PersonalCategoryCard';
import { AndamentoMesiCard, EntrateUsciteCard } from '@/components/personal/PersonalCharts';
import { PersonalExpenseForm } from '@/components/personal/PersonalExpenseForm';
import { PersonalExpenseTable } from '@/components/personal/PersonalExpenseTable';
import { PersonalPeriodSelect } from '@/components/personal/PersonalPeriodSelect';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { InlineRename } from '@/components/ui/inline-rename';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DashboardSkeleton, EmptyState, ErrorState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useMesePersonale } from '@/hooks/useMeseAttivo';
import {
  useCreateIncome,
  useCreatePersonalExpense,
  useDeleteIncome,
  useDeletePersonalExpense,
  useIncomes,
  usePersonalExpenses,
  usePersonalPeriods,
  usePersonalSummary,
  useRenamePersonalPeriod,
  useUpdateIncome,
  useUpdatePersonalExpense,
} from '@/hooks/usePersonal';
import { downloadBlob, personalCsvFilename } from '@/lib/download';
import { formatEuro } from '@/lib/format';
import type {
  Income,
  IncomePayload,
  PersonalExpense,
  PersonalExpensePayload,
} from '@/types';

export function PersonalDashboardPage() {
  const periods = usePersonalPeriods();
  // Il mese e' quello globale (o quello dell'URL, sui link diretti).
  const { id, nome: meseSelezionato, stato } = useMesePersonale();

  const summary = usePersonalSummary(id);
  const entrate = useIncomes(id);
  const uscite = usePersonalExpenses(id);
  const rinomina = useRenamePersonalPeriod();
  const toast = useToast();

  const creaEntrata = useCreateIncome(id ?? 0);
  const modificaEntrata = useUpdateIncome(id ?? 0);
  const eliminaEntrata = useDeleteIncome(id ?? 0);

  const creaUscita = useCreatePersonalExpense(id ?? 0);
  const modificaUscita = useUpdatePersonalExpense(id ?? 0);
  const eliminaUscita = useDeletePersonalExpense(id ?? 0);

  const [formEntrata, setFormEntrata] = useState(false);
  const [entrataInModifica, setEntrataInModifica] = useState<Income | null>(null);
  const [entrataDaEliminare, setEntrataDaEliminare] = useState<Income | null>(null);

  const [formUscita, setFormUscita] = useState(false);
  const [uscitaInModifica, setUscitaInModifica] = useState<PersonalExpense | null>(null);
  const [uscitaDaEliminare, setUscitaDaEliminare] = useState<PersonalExpense | null>(null);
  const [toggleInCorso, setToggleInCorso] = useState<number | null>(null);

  if (periods.isPending) return <DashboardSkeleton />;
  if (periods.isError) {
    return (
      <ErrorState
        message={getErrorMessage(periods.error, 'Impossibile caricare il budget personale')}
        onRetry={() => void periods.refetch()}
      />
    );
  }

  // Il mese scelto non esiste nel budget personale (o non ce n'e' ancora
  // nessuno): si dice com'e', senza aprire di nascosto un altro mese.
  if (stato === 'assente' || id === null) {
    return (
      <div>
        <PageHeader emoji={'\u{1F45B}'} eyebrow="Budget personale" title={meseSelezionato} />
        <EmptyState
          emoji={'\u{1F4C5}'}
          title={`${meseSelezionato} non è ancora aperto`}
          description="Il tuo budget personale per questo mese non esiste: crealo dall&rsquo;elenco dei mesi, oppure scegli un altro mese dal selettore in cima alla barra laterale."
          action={
            <Button asChild>
              <Link to="/budget/elenco">
                <Plus />
                Vai ai mesi
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (summary.isPending) return <DashboardSkeleton />;
  if (summary.isError || !summary.data) {
    return (
      <ErrorState
        message={getErrorMessage(summary.error, 'Impossibile caricare il mese')}
        onRetry={() => void summary.refetch()}
      />
    );
  }

  const s = summary.data;

  const scaricaCsv = async () => {
    try {
      const blob = await personalApi.exportCsv(id);
      downloadBlob(blob, personalCsvFilename(s.etichetta));
      toast.success('CSV esportato');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export CSV fallito'));
    }
  };

  const chiudiFormEntrata = () => {
    setFormEntrata(false);
    setEntrataInModifica(null);
  };

  const salvaEntrata = async (payload: IncomePayload) => {
    const esito = entrataInModifica
      ? await modificaEntrata.mutateAsync({ id: entrataInModifica.id, payload }).catch(() => null)
      : await creaEntrata.mutateAsync(payload).catch(() => null);
    if (esito) chiudiFormEntrata();
  };

  const chiudiFormUscita = () => {
    setFormUscita(false);
    setUscitaInModifica(null);
  };

  const salvaUscita = async (payload: PersonalExpensePayload) => {
    const esito = uscitaInModifica
      ? await modificaUscita.mutateAsync({ id: uscitaInModifica.id, payload }).catch(() => null)
      : await creaUscita.mutateAsync(payload).catch(() => null);
    if (esito) chiudiFormUscita();
  };

  const togglePagato = async (expense: PersonalExpense, pagato: boolean) => {
    setToggleInCorso(expense.id);
    await modificaUscita
      .mutateAsync({ id: expense.id, payload: { pagato }, silenzioso: true })
      .catch(() => null);
    setToggleInCorso(null);
  };

  return (
    <div>
      <PageHeader
        emoji={'\u{1F45B}'}
        eyebrow="Budget personale"
        title={s.etichetta}
        titleSlot={
          <InlineRename
            valore={s.etichetta}
            salvataggioInCorso={rinomina.isPending}
            etichettaAccessibile="Rinomina il mese"
            onSalva={(etichetta) => rinomina.mutate({ id, etichetta })}
          />
        }
        description={
          <>
            {s.n_entrate} entrate &middot; {s.n_uscite} uscite
            {s.n_uscite_in_sospeso > 0 && (
              <>
                {' '}
                &middot;{' '}
                <span className="font-bold text-foreground">
                  {s.n_uscite_in_sospeso} ancora da pagare
                </span>
              </>
            )}
          </>
        }
        actions={
          <>
            <PersonalPeriodSelect periods={periods.data ?? []} attivoId={id} />
            <Button variant="outline" onClick={scaricaCsv}>
              <Download />
              Esporta CSV
            </Button>
          </>
        }
      />

      {/* I quattro numeri del blocco RIEPILOGO del foglio. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Entrate totali"
          value={formatEuro(s.entrate_totali)}
          hint={`${s.n_entrate} voci`}
          emoji={'\u{1F4B5}'}
          tone="success"
        />
        <StatCard
          label="Uscite totali"
          value={formatEuro(s.uscite_totali)}
          hint={`di cui ${formatEuro(s.uscite_in_sospeso)} in sospeso`}
          emoji={'\u{1F4B8}'}
          tone="destructive"
        />
        <StatCard
          label="Saldo reale (carta)"
          value={formatEuro(s.saldo_reale)}
          hint="Quanto hai davvero adesso"
          emoji={'\u{1F4B3}'}
          tone="primary"
        />
        <StatCard
          label="Dopo le spese in sospeso"
          value={formatEuro(s.saldo_dopo_sospese)}
          hint="Quanto resta pagando tutto"
          emoji={s.saldo_dopo_sospese >= 0 ? '\u{1F642}' : '\u{1F630}'}
          tone={s.saldo_dopo_sospese >= 0 ? 'warning' : 'destructive'}
        />
      </div>

      {/* Grafici */}
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <PersonalCategoryCard categorie={s.per_categoria} />
        <div className="space-y-4">
          <EntrateUsciteCard summary={s} />
          <AndamentoMesiCard periods={periods.data ?? []} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* ENTRATE */}
        <Card className="scroll-mt-24 overflow-hidden" id="entrate">
          <CardHeader>
            <CardTitle>
              <span aria-hidden="true">&#128184;</span> Entrate
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEntrataInModifica(null);
                setFormEntrata(true);
              }}
            >
              <Plus />
              Aggiungi
            </Button>
          </CardHeader>

          {entrate.isError && (
            <div className="p-4">
              <ErrorState
                message={getErrorMessage(entrate.error, 'Impossibile caricare le entrate')}
                onRetry={() => void entrate.refetch()}
              />
            </div>
          )}

          {entrate.data && entrate.data.length === 0 && (
            <div className="p-4">
              <EmptyState
                emoji={'\u{1F4B0}'}
                title="Nessuna entrata"
                description="Aggiungi stipendio, riporto dal mese scorso o altre entrate."
              />
            </div>
          )}

          {entrate.data && entrate.data.length > 0 && (
            <IncomeTable
              incomes={entrate.data}
              onEdit={(i) => {
                setEntrataInModifica(i);
                setFormEntrata(true);
              }}
              onDelete={setEntrataDaEliminare}
            />
          )}
        </Card>

        {/* USCITE */}
        <Card className="scroll-mt-24 overflow-hidden" id="uscite">
          <CardHeader>
            <CardTitle>
              <span aria-hidden="true">&#129534;</span> Uscite
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setUscitaInModifica(null);
                setFormUscita(true);
              }}
            >
              <Plus />
              Aggiungi
            </Button>
          </CardHeader>

          {uscite.isError && (
            <div className="p-4">
              <ErrorState
                message={getErrorMessage(uscite.error, 'Impossibile caricare le uscite')}
                onRetry={() => void uscite.refetch()}
              />
            </div>
          )}

          {uscite.data && uscite.data.length === 0 && (
            <div className="p-4">
              <EmptyState
                emoji={'\u{1F9FE}'}
                title="Nessuna uscita"
                description="Affitto, abbonamenti, finanziamenti: segna qui tutto quello che esce."
              />
            </div>
          )}

          {uscite.data && uscite.data.length > 0 && (
            <PersonalExpenseTable
              expenses={uscite.data}
              onEdit={(e) => {
                setUscitaInModifica(e);
                setFormUscita(true);
              }}
              onDelete={setUscitaDaEliminare}
              onTogglePagato={togglePagato}
              togglingId={toggleInCorso}
            />
          )}
        </Card>
      </div>

      {/* Dialoghi */}
      <Dialog open={formEntrata} onOpenChange={(aperta) => !aperta && chiudiFormEntrata()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entrataInModifica ? '\u{270F}\u{FE0F} Modifica entrata' : '\u{2795} Nuova entrata'}
            </DialogTitle>
            <DialogDescription>
              Lascia l&apos;importo vuoto se non lo sai ancora.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-0">
            <IncomeForm
              income={entrataInModifica}
              submitting={creaEntrata.isPending || modificaEntrata.isPending}
              onSubmit={salvaEntrata}
              onCancel={chiudiFormEntrata}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog open={formUscita} onOpenChange={(aperta) => !aperta && chiudiFormUscita()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {uscitaInModifica ? '\u{270F}\u{FE0F} Modifica uscita' : '\u{2795} Nuova uscita'}
            </DialogTitle>
            <DialogDescription>
              Le uscite in sospeso pesano solo sul saldo previsto.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-0">
            <PersonalExpenseForm
              expense={uscitaInModifica}
              submitting={creaUscita.isPending || modificaUscita.isPending}
              onSubmit={salvaUscita}
              onCancel={chiudiFormUscita}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={entrataDaEliminare !== null}
        title="Eliminare l'entrata?"
        message={
          <>
            <strong className="text-foreground">{entrataDaEliminare?.dettaglio}</strong> verr&agrave;
            eliminata definitivamente.
          </>
        }
        confirmLabel="S&igrave;, elimina"
        loading={eliminaEntrata.isPending}
        onConfirm={async () => {
          if (!entrataDaEliminare) return;
          await eliminaEntrata.mutateAsync(entrataDaEliminare.id).catch(() => null);
          setEntrataDaEliminare(null);
        }}
        onCancel={() => setEntrataDaEliminare(null)}
      />

      <ConfirmDialog
        open={uscitaDaEliminare !== null}
        title="Eliminare l'uscita?"
        message={
          <>
            <strong className="text-foreground">{uscitaDaEliminare?.negozio_dettaglio}</strong> da{' '}
            <strong className="text-foreground">
              {formatEuro(uscitaDaEliminare?.importo ?? 0)}
            </strong>{' '}
            verr&agrave; eliminata definitivamente.
          </>
        }
        confirmLabel="S&igrave;, elimina"
        loading={eliminaUscita.isPending}
        onConfirm={async () => {
          if (!uscitaDaEliminare) return;
          await eliminaUscita.mutateAsync(uscitaDaEliminare.id).catch(() => null);
          setUscitaDaEliminare(null);
        }}
        onCancel={() => setUscitaDaEliminare(null)}
      />
    </div>
  );
}
