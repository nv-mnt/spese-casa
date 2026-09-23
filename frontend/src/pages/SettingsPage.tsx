/** Impostazioni: i due membri e il modello di spese fisse ricorrenti. */

import { Plus, Power, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { getErrorMessage } from '@/api/client';
import { AccountCard } from '@/components/settings/AccountCard';
import { CategoriesCard } from '@/components/settings/CategoriesCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AmountField, FieldWrapper, SelectField, TextField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useToast } from '@/components/ui/toast';
import { useMembers, useUpdateMember } from '@/hooks/useMembers';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from '@/hooks/useTemplates';
import { formatEuro, parseItalianAmount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { CATEGORIE, type Categoria, type Member, type RecurringTemplate } from '@/types';

function MemberEditor({ member }: { member: Member }) {
  const aggiorna = useUpdateMember();
  const [nome, setNome] = useState(member.nome);
  const [colore, setColore] = useState(member.colore);

  const modificato = nome.trim() !== member.nome || colore !== member.colore;

  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-border py-4 last:border-0">
      <MemberAvatar nome={member.nome} iniziali={member.iniziali} colore={colore} size="lg" />

      <div className="min-w-[11rem] flex-1">
        <FieldWrapper label="Nome" htmlFor={`nome-${member.id}`}>
          <Input
            id={`nome-${member.id}`}
            value={nome}
            maxLength={120}
            onChange={(e) => setNome(e.target.value)}
          />
        </FieldWrapper>
      </div>

      <FieldWrapper label="Colore" htmlFor={`colore-${member.id}`}>
        <input
          id={`colore-${member.id}`}
          type="color"
          className="h-11 w-16 cursor-pointer rounded-full border-2 border-ink bg-card p-1 shadow-sticker-sm"
          value={colore}
          onChange={(e) => setColore(e.target.value)}
        />
      </FieldWrapper>

      <Button
        variant="outline"
        disabled={!modificato}
        loading={aggiorna.isPending}
        onClick={() => aggiorna.mutate({ id: member.id, nome: nome.trim(), colore })}
      >
        Salva
      </Button>
    </div>
  );
}

interface TemplateFormState {
  descrizione: string;
  categoria: Categoria;
  importo: string;
  paid_by_id: string;
}

const STATO_INIZIALE: TemplateFormState = {
  descrizione: '',
  categoria: 'Casa',
  importo: '',
  paid_by_id: '',
};

export function SettingsPage() {
  const membri = useMembers();
  const modelli = useTemplates();
  const crea = useCreateTemplate();
  const aggiorna = useUpdateTemplate();
  const rimuovi = useDeleteTemplate();
  const toast = useToast();

  const [modaleAperta, setModaleAperta] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(STATO_INIZIALE);
  const [selezionato, setSelezionato] = useState<RecurringTemplate | null>(null);

  const salvaModello = async () => {
    const descrizione = form.descrizione.trim();
    if (descrizione === '') {
      toast.error('Inserisci una descrizione');
      return;
    }
    let importo: number | null = null;
    if (form.importo.trim() !== '') {
      const valore = parseItalianAmount(form.importo);
      if (Number.isNaN(valore) || valore <= 0) {
        toast.error('Importo non valido (es. 180,50)');
        return;
      }
      importo = Number(valore.toFixed(2));
    }

    const esito = await crea
      .mutateAsync({
        descrizione,
        categoria: form.categoria,
        importo,
        paid_by_id: form.paid_by_id === '' ? null : Number(form.paid_by_id),
        ordine: (modelli.data?.length ?? 0) + 1,
      })
      .catch(() => null);

    if (esito) {
      setForm(STATO_INIZIALE);
      setModaleAperta(false);
    }
  };

  const confermaRimozione = async () => {
    if (!selezionato) return;
    await rimuovi.mutateAsync(selezionato.id).catch(() => null);
    setSelezionato(null);
  };

  return (
    <div>
      <PageHeader
        emoji={'\u{2699}\u{FE0F}'}
        eyebrow="Configurazione"
        title="Impostazioni"
        description="Chi abita qui e quali spese tornano ogni mese."
        actions={
          // Il cestino non e' piu' nella barra laterale: si raggiunge da qui.
          <Button variant="outline" asChild>
            <Link to="/cestino">
              <Trash2 />
              Cestino
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card id="membri" className="scroll-mt-24" aria-labelledby="titolo-membri">
          <CardHeader>
            <CardTitle id="titolo-membri">
              <span aria-hidden="true">&#128106;</span> Chi abita qui
            </CardTitle>
            <span className="text-xs font-bold text-muted-foreground">Sempre 50 e 50</span>
          </CardHeader>
          <div className="px-5 py-1">
            {membri.isPending && <LoadingState label="Carico i membri…" />}
            {membri.isError && (
              <div className="py-4">
                <ErrorState
                  message={getErrorMessage(membri.error, 'Impossibile caricare i membri')}
                  onRetry={() => void membri.refetch()}
                />
              </div>
            )}
            {membri.data?.map((m) => (
              <MemberEditor key={m.id} member={m} />
            ))}
          </div>
          <div className="border-t border-border bg-muted/40 px-5 py-3">
            <p className="text-xs font-semibold text-muted-foreground">
              <span aria-hidden="true">&#127912;</span> Nome e colore si vedono ovunque nell&apos;app.
            </p>
          </div>
        </Card>

        <Card id="ricorrenti" className="scroll-mt-24" aria-labelledby="titolo-ricorrenti">
          <CardHeader>
            <CardTitle id="titolo-ricorrenti">
              <span aria-hidden="true">&#128260;</span> Spese fisse
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setModaleAperta(true)}>
              <Plus />
              Aggiungi
            </Button>
          </CardHeader>

          <div>
            {modelli.isPending && <LoadingState label="Carico le spese fisse…" />}
            {modelli.isError && (
              <div className="px-5 py-4">
                <ErrorState
                  message={getErrorMessage(modelli.error, 'Impossibile caricare le spese fisse')}
                  onRetry={() => void modelli.refetch()}
                />
              </div>
            )}

            {modelli.data && modelli.data.length === 0 && (
              <div className="px-5 py-4">
                <EmptyState
                  emoji={'\u{1F4C5}'}
                  title="Nessuna spesa fissa"
                  description="Aggiungi le voci che tornano ogni mese, tipo affitto o condominio."
                  action={
                    <Button variant="outline" size="sm" onClick={() => setModaleAperta(true)}>
                      <Plus />
                      Aggiungi la prima
                    </Button>
                  }
                />
              </div>
            )}

            <ul className="divide-y divide-border">
              {modelli.data?.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'truncate font-display text-sm font-bold',
                        t.attivo ? 'text-foreground' : 'text-muted-foreground line-through',
                      )}
                    >
                      {t.descrizione}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                      <span>{t.categoria}</span>
                      {t.importo !== null && <>&middot; <span className="tabular">{formatEuro(t.importo)}</span></>}
                      {t.paid_by_id !== null && (
                        <>
                          &middot;{' '}
                          {membri.data?.find((m) => m.id === t.paid_by_id)?.nome ?? 'membro'}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={t.attivo ? 'success' : 'neutral'}>
                      {t.attivo ? '\u{2705} Attiva' : '\u{1F4A4} In pausa'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      title={t.attivo ? 'Disattiva' : 'Attiva'}
                      aria-label={t.attivo ? `Disattiva ${t.descrizione}` : `Attiva ${t.descrizione}`}
                      onClick={() => aggiorna.mutate({ id: t.id, payload: { attivo: !t.attivo } })}
                      disabled={aggiorna.isPending}
                    >
                      <Power />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="hover:!bg-destructive"
                      title="Elimina"
                      aria-label={`Elimina ${t.descrizione}`}
                      onClick={() => setSelezionato(t)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-border bg-muted/40 px-5 py-3">
            <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
              Alla creazione di un nuovo mese puoi precompilare queste voci. Se importo o
              &quot;Pagato da&quot; non sono indicati, le righe vengono create come segnaposto da
              completare a mano.
            </p>
          </div>
        </Card>
        <CategoriesCard />

        <AccountCard />
      </div>

      <Dialog open={modaleAperta} onOpenChange={setModaleAperta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>&#128260; Nuova spesa fissa</DialogTitle>
            <DialogDescription>
              Verr&agrave; proposta alla creazione dei prossimi periodi.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <TextField
              label="Descrizione"
              name="descrizione"
              placeholder="Condominio"
              value={form.descrizione}
              onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Categoria"
                name="categoria"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
              >
                {CATEGORIE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
              <AmountField
                label="Importo"
                name="importo"
                placeholder="180,50"
                hint="Facoltativo"
                value={form.importo}
                onChange={(e) => setForm({ ...form, importo: e.target.value })}
              />
            </div>
            <SelectField
              label="Pagato da"
              name="paid_by_id"
              hint="Facoltativo"
              value={form.paid_by_id}
              onChange={(e) => setForm({ ...form, paid_by_id: e.target.value })}
            >
              <option value="">&mdash; da completare &mdash;</option>
              {membri.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </SelectField>
          </DialogBody>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModaleAperta(false)}
              disabled={crea.isPending}
            >
              Annulla
            </Button>
            <Button onClick={salvaModello} loading={crea.isPending}>
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={selezionato !== null}
        title="Eliminare la spesa fissa?"
        message={
          <>
            <strong className="text-foreground">{selezionato?.descrizione}</strong> non verr&agrave;
            pi&ugrave; proposta alla creazione dei nuovi periodi. Le spese gi&agrave; registrate non
            vengono toccate.
          </>
        }
        loading={rimuovi.isPending}
        onConfirm={confermaRimozione}
        onCancel={() => setSelezionato(null)}
      />
    </div>
  );
}
