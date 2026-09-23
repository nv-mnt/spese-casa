/** Registro spese del mese: filtri, tabella, form di aggiunta/modifica. */

import { LayoutDashboard, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '@/api/client';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { ExpenseTable } from '@/components/expenses/ExpenseTable';
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
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from '@/hooks/useExpenses';
import { useMembers } from '@/hooks/useMembers';
import { useMeseCasa } from '@/hooks/useMeseAttivo';
import { useSummary } from '@/hooks/useSummary';
import { formatEuro } from '@/lib/format';
import { CATEGORIE, type Expense, type ExpensePayload } from '@/types';

export function ExpensesPage() {
  // Senza id nell'URL il registro segue il mese selezionato globale.
  const { id, nome: meseSelezionato, stato, refetch: ricaricaMesi } = useMeseCasa();

  const { data: expenses, isPending, isError, error, refetch } = useExpenses(id);
  const { data: members } = useMembers();
  const { data: summary } = useSummary(id);

  const crea = useCreateExpense(id ?? 0);
  const aggiorna = useUpdateExpense(id ?? 0);
  const elimina = useDeleteExpense(id ?? 0);

  const [formAperto, setFormAperto] = useState(false);
  const [inModifica, setInModifica] = useState<Expense | null>(null);
  const [daEliminare, setDaEliminare] = useState<Expense | null>(null);

  // Filtri lato client: il registro di un mese resta di poche decine di righe.
  const [ricerca, setRicerca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [membro, setMembro] = useState('');

  const filtrate = useMemo(() => {
    if (!expenses) return [];
    const testo = ricerca.trim().toLowerCase();
    return expenses.filter((e) => {
      if (testo && !e.descrizione.toLowerCase().includes(testo)) return false;
      if (categoria && e.categoria !== categoria) return false;
      if (membro && String(e.paid_by_id) !== membro) return false;
      return true;
    });
  }, [expenses, ricerca, categoria, membro]);

  const filtriAttivi = ricerca !== '' || categoria !== '' || membro !== '';

  const azzeraFiltri = () => {
    setRicerca('');
    setCategoria('');
    setMembro('');
  };

  if (stato === 'caricamento') return <LoadingState label="Carico il registro&hellip;" />;
  if (stato === 'errore') {
    return <ErrorState message="Impossibile caricare i mesi" onRetry={() => ricaricaMesi()} />;
  }
  // Il mese scelto non esiste fra le spese di casa: lo si dice, senza
  // scivolare di nascosto su un altro mese.
  if (stato === 'assente' || id === null) {
    return (
      <div>
        <PageHeader emoji={'\u{1F9FE}'} eyebrow={meseSelezionato} title="Registro spese" />
        <EmptyState
          emoji={'\u{1F4C5}'}
          title={`${meseSelezionato} non è ancora aperto`}
          description="Nessun registro per questo mese: crealo dall&rsquo;elenco dei mesi, oppure scegli un altro mese dal selettore in cima alla barra laterale."
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

  const apriNuova = () => {
    setInModifica(null);
    setFormAperto(true);
  };

  const apriModifica = (expense: Expense) => {
    setInModifica(expense);
    setFormAperto(true);
  };

  const chiudiForm = () => {
    setFormAperto(false);
    setInModifica(null);
  };

  const salva = async (payload: ExpensePayload) => {
    const esito = inModifica
      ? await aggiorna.mutateAsync({ id: inModifica.id, payload }).catch(() => null)
      : await crea.mutateAsync(payload).catch(() => null);
    if (esito) chiudiForm();
  };

  const confermaEliminazione = async () => {
    if (!daEliminare) return;
    await elimina.mutateAsync(daEliminare.id).catch(() => null);
    setDaEliminare(null);
  };

  const bottoneAggiungi = (
    <Button onClick={apriNuova} disabled={!members || members.length === 0}>
      <Plus />
      Aggiungi spesa
    </Button>
  );

  return (
    <div>
      <PageHeader
        emoji={'\u{1F9FE}'}
        eyebrow={summary?.period_nome ?? 'Mese'}
        title="Registro spese"
        description={
          summary && (
            <>
              {summary.n_spese} {summary.n_spese === 1 ? 'voce' : 'voci'} &middot; totale{' '}
              <span className="tabular font-extrabold text-foreground">
                {formatEuro(summary.totale_speso)}
              </span>
            </>
          )
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/mesi/${id}`}>
                <LayoutDashboard />
                Dashboard
              </Link>
            </Button>
            {bottoneAggiungi}
          </>
        }
      />

      {isPending && <LoadingState label="Carico il registro…" />}

      {isError && (
        <ErrorState
          message={getErrorMessage(error, 'Impossibile caricare le spese')}
          onRetry={() => void refetch()}
        />
      )}

      {expenses && expenses.length === 0 && (
        <EmptyState
          emoji={'\u{1F4AB}'}
          title="Registro ancora vuoto"
          description="Segna la prima spesa: il riepilogo del mese si aggiorna da solo."
          action={bottoneAggiungi}
        />
      )}

      {expenses && expenses.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="gap-3">
            <CardTitle className="sr-only">Filtri</CardTitle>
            <div className="flex w-full flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={ricerca}
                  onChange={(e) => setRicerca(e.target.value)}
                  placeholder="Cerca una spesa…"
                  className="pl-8"
                  aria-label="Cerca fra le spese"
                />
              </div>

              <Select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-auto min-w-[9rem]"
                aria-label="Filtra per categoria"
              >
                <option value="">Tutte le categorie</option>
                {CATEGORIE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>

              <Select
                value={membro}
                onChange={(e) => setMembro(e.target.value)}
                className="w-auto min-w-[9rem]"
                aria-label="Filtra per chi ha pagato"
              >
                <option value="">Tutti i membri</option>
                {members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </Select>

              {filtriAttivi && (
                <Button variant="ghost" size="sm" onClick={azzeraFiltri}>
                  <X />
                  Azzera
                </Button>
              )}

              <span
                className="tabular ml-auto rounded-full border-2 border-ink bg-secondary px-2.5
                           py-0.5 text-2xs font-bold text-secondary-foreground"
              >
                {filtrate.length} di {expenses.length}
              </span>
            </div>
          </CardHeader>

          {filtrate.length > 0 ? (
            <ExpenseTable expenses={filtrate} onEdit={apriModifica} onDelete={setDaEliminare} />
          ) : (
            <p className="px-5 py-12 text-center text-sm font-semibold text-muted-foreground">
              <span aria-hidden="true">&#128373;&#65039;</span> Nessuna spesa con questi filtri.
            </p>
          )}
        </Card>
      )}

      <Dialog open={formAperto} onOpenChange={(aperta) => !aperta && chiudiForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{inModifica ? '\u{270F}\u{FE0F} Modifica spesa' : '\u{2795} Nuova spesa'}</DialogTitle>
            <DialogDescription>
L&apos;importo si divide a met&agrave; tutto da solo. &#129309;
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-0">
            {members && members.length > 0 ? (
              <ExpenseForm
                members={members}
                expense={inModifica}
                submitting={crea.isPending || aggiorna.isPending}
                onSubmit={salva}
                onCancel={chiudiForm}
              />
            ) : (
              <LoadingState label="Carico i membri…" />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={daEliminare !== null}
        title="Eliminare la spesa?"
        message={
          <>
            La spesa <strong className="text-foreground">{daEliminare?.descrizione}</strong> da{' '}
            <strong className="text-foreground">{formatEuro(daEliminare?.importo)}</strong>{' '}
            verr&agrave; eliminata definitivamente.
          </>
        }
        loading={elimina.isPending}
        onConfirm={confermaEliminazione}
        onCancel={() => setDaEliminare(null)}
      />
    </div>
  );
}
