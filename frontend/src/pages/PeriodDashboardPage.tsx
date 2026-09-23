/** Dashboard del periodo: KPI di testa, contributi, rimborso e categorie. */

import { Download, Plus, Receipt } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '@/api/client';
import { periodsApi } from '@/api/periods';
import { CommonIncomeForm } from '@/components/common-incomes/CommonIncomeForm';
import { CommonIncomeTable } from '@/components/common-incomes/CommonIncomeTable';
import { CategoryCard } from '@/components/period/CategoryCard';
import { SettlementCard } from '@/components/period/SettlementCard';
import { SummaryCard } from '@/components/period/SummaryCard';
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
import { DashboardSkeleton, EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import {
  useCommonIncomes,
  useCreateCommonIncome,
  useDeleteCommonIncome,
  useUpdateCommonIncome,
} from '@/hooks/useCommonIncomes';
import { useMembers } from '@/hooks/useMembers';
import { useMeseCasa } from '@/hooks/useMeseAttivo';
import { useRenamePeriod } from '@/hooks/usePeriods';
import { useSummary } from '@/hooks/useSummary';
import { csvFilename, downloadBlob } from '@/lib/download';
import { formatEuro } from '@/lib/format';
import type { CommonIncome, CommonIncomePayload } from '@/types';

export function PeriodDashboardPage() {
  // Il mese arriva dall'URL quando c'e' un id, altrimenti dalla selezione
  // globale condivisa con la sidebar e con il budget personale.
  const { id, nome: meseSelezionato, stato, refetch: ricaricaMesi } = useMeseCasa();
  const { data: summary, isPending, isError, error, refetch } = useSummary(id);
  const { data: members } = useMembers();
  const entrate = useCommonIncomes(id);
  const creaEntrata = useCreateCommonIncome(id ?? 0);
  const modificaEntrata = useUpdateCommonIncome(id ?? 0);
  const eliminaEntrata = useDeleteCommonIncome(id ?? 0);
  const rinomina = useRenamePeriod();
  const toast = useToast();

  const [formEntrata, setFormEntrata] = useState(false);
  const [entrataInModifica, setEntrataInModifica] = useState<CommonIncome | null>(null);
  const [entrataDaEliminare, setEntrataDaEliminare] = useState<CommonIncome | null>(null);

  const scaricaCsv = async () => {
    if (!summary) return;
    try {
      const blob = await periodsApi.exportCsv(summary.period_id);
      downloadBlob(blob, csvFilename(summary.period_nome));
      toast.success('CSV esportato');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export CSV fallito'));
    }
  };

  if (stato === 'caricamento') return <DashboardSkeleton />;
  if (stato === 'errore') {
    return (
      <ErrorState
        message="Impossibile caricare i mesi"
        onRetry={() => ricaricaMesi()}
      />
    );
  }
  // Il mese scelto non esiste in questa sezione: si dice, invece di mostrare
  // di nascosto un altro mese.
  if (stato === 'assente' || id === null) {
    return (
      <div>
        <PageHeader
          emoji={'\u{1F4CA}'}
          eyebrow="Dashboard mese"
          title={meseSelezionato}
          description="Questo mese non c&rsquo;&egrave; ancora nelle spese di casa."
        />
        <EmptyState
          emoji={'\u{1F4C5}'}
          title={`${meseSelezionato} non è ancora aperto`}
          description="Le spese di casa per questo mese non esistono: creale dall&rsquo;elenco dei mesi, oppure scegli un altro mese dal selettore in cima alla barra laterale."
          action={
            <Button asChild>
              <Link to="/mesi/elenco">
                <Plus />
                Vai ai mesi
              </Link>
            </Button>
          }
        />
      </div>
    );
  }
  if (isPending) return <DashboardSkeleton />;
  if (isError || !summary) {
    return (
      <ErrorState
        message={getErrorMessage(error, 'Impossibile caricare il riepilogo')}
        onRetry={() => void refetch()}
      />
    );
  }

  const { rimborso } = summary;

  const chiudiFormEntrata = () => {
    setFormEntrata(false);
    setEntrataInModifica(null);
  };

  const salvaEntrata = async (payload: CommonIncomePayload) => {
    const esito = entrataInModifica
      ? await modificaEntrata.mutateAsync({ id: entrataInModifica.id, payload }).catch(() => null)
      : await creaEntrata.mutateAsync(payload).catch(() => null);
    if (esito) chiudiFormEntrata();
  };

  return (
    <div>
      <PageHeader
        emoji={'\u{1F4CA}'}
        eyebrow="Dashboard mese"
        title={summary.period_nome}
        titleSlot={
          <InlineRename
            valore={summary.period_nome}
            salvataggioInCorso={rinomina.isPending}
            etichettaAccessibile="Rinomina il mese"
            onSalva={(nome) => rinomina.mutate({ id, nome })}
          />
        }
        description={
          summary.n_spese === 0
            ? 'Qui non c\u2019\u00e8 ancora niente: comincia dal registro!'
            : `${summary.n_spese} ${summary.n_spese === 1 ? 'voce segnata' : 'voci segnate'} finora.`
        }
        actions={
          <>
            <Button variant="outline" onClick={scaricaCsv}>
              <Download />
              Esporta CSV
            </Button>
            <Button asChild>
              <Link to={`/mesi/${id}/spese`}>
                <Receipt />
                Registro spese
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Totale speso"
          value={formatEuro(summary.totale_speso)}
          hint={
            summary.entrate_comuni_totali > 0
              ? `meno ${formatEuro(summary.entrate_comuni_totali)} di entrate comuni`
              : `${summary.n_spese} ${summary.n_spese === 1 ? 'voce' : 'voci'}`
          }
          emoji={'\u{1F4B8}'}
          tone="primary"
        />
        <StatCard
          label="Quota a testa"
          value={formatEuro(summary.quota_a_testa)}
          hint={
            summary.entrate_comuni_totali > 0
              ? `metà di ${formatEuro(summary.netto_da_dividere)} netti`
              : 'Metà per uno'
          }
          emoji={'\u{1F91D}'}
        />
        <StatCard
          label="Saldo"
          value={formatEuro(summary.saldo)}
          hint={summary.chi_deve_a_chi}
          emoji={summary.in_pari ? '\u{2696}\u{FE0F}' : '\u{1F440}'}
          tone={summary.in_pari ? 'success' : 'primary'}
        />
        <StatCard
          label="Resta da dare"
          value={formatEuro(rimborso.residuo)}
          hint={rimborso.stato_label}
          emoji={rimborso.residuo > 0 ? '\u{23F3}' : '\u{1F389}'}
          tone={
            rimborso.residuo > 0 ? 'warning' : rimborso.residuo < 0 ? 'default' : 'success'
          }
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          <SummaryCard summary={summary} />
          <SettlementCard summary={summary} />
        </div>
        <div className="xl:col-span-2">
          <CategoryCard categorie={summary.per_categoria} />
        </div>
      </div>

      {/* Entrate comuni: soldi che rientrano e si dividono 50/50. */}
      <Card className="mt-4 overflow-hidden scroll-mt-24" id="entrate-comuni">
        <CardHeader>
          <CardTitle>
            <span aria-hidden="true">&#8617;&#65039;</span> Entrate comuni
          </CardTitle>
          <div className="flex items-center gap-3">
            {summary.entrate_comuni_totali > 0 && (
              <span className="tabular text-xs font-bold text-muted-foreground">
                {formatEuro(summary.entrate_comuni_totali)} in totale
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={!members || members.length === 0}
              onClick={() => {
                setEntrataInModifica(null);
                setFormEntrata(true);
              }}
            >
              <Plus />
              Aggiungi
            </Button>
          </div>
        </CardHeader>

        {entrate.isPending && <LoadingState label="Carico le entrate comuni…" />}

        {entrate.isError && (
          <div className="p-4">
            <ErrorState
              message={getErrorMessage(entrate.error, 'Impossibile caricare le entrate comuni')}
              onRetry={() => void entrate.refetch()}
            />
          </div>
        )}

        {entrate.data && entrate.data.length === 0 && (
          <div className="p-4">
            <EmptyState
              emoji={'\u{1F4B8}'}
              title="Nessuna entrata comune"
              description="Un reso, un rimborso o un bonus: segnalo qui e verrà sottratto dal totale da dividere."
            />
          </div>
        )}

        {entrate.data && entrate.data.length > 0 && (
          <CommonIncomeTable
            incomes={entrate.data}
            onEdit={(i) => {
              setEntrataInModifica(i);
              setFormEntrata(true);
            }}
            onDelete={setEntrataDaEliminare}
          />
        )}
      </Card>

      <Dialog open={formEntrata} onOpenChange={(aperta) => !aperta && chiudiFormEntrata()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entrataInModifica
                ? '\u{270F}\u{FE0F} Modifica entrata comune'
                : '\u{2795} Nuova entrata comune'}
            </DialogTitle>
            <DialogDescription>
              Viene sottratta dal totale e divisa a metà, come una spesa al contrario.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-0">
            {members && members.length > 0 ? (
              <CommonIncomeForm
                members={members}
                income={entrataInModifica}
                submitting={creaEntrata.isPending || modificaEntrata.isPending}
                onSubmit={salvaEntrata}
                onCancel={chiudiFormEntrata}
              />
            ) : (
              <LoadingState label="Carico i membri…" />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={entrataDaEliminare !== null}
        title="Eliminare l'entrata comune?"
        message={
          <>
            <strong className="text-foreground">{entrataDaEliminare?.descrizione}</strong> da{' '}
            <strong className="text-foreground">
              {formatEuro(entrataDaEliminare?.importo)}
            </strong>{' '}
            verrà eliminata e il saldo tornerà a salire.
          </>
        }
        confirmLabel="Sì, elimina"
        loading={eliminaEntrata.isPending}
        onConfirm={async () => {
          if (!entrataDaEliminare) return;
          await eliminaEntrata.mutateAsync(entrataDaEliminare.id).catch(() => null);
          setEntrataDaEliminare(null);
        }}
        onCancel={() => setEntrataDaEliminare(null)}
      />
    </div>
  );
}
