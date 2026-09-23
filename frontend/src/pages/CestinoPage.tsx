/**
 * Cestino unico, con filtro per sezione.
 *
 * Una pagina sola invece di due: gli elementi portano gia' la loro sezione, e
 * chi cerca qualcosa che ha cancellato di solito non ricorda in quale delle
 * due lo aveva fatto.
 */

import { RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { getErrorMessage } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useHardDelete, useRestore, useTrash } from '@/hooks/useTrash';
import { formatEuro, formatLongDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ElementoCestinato, SezioneCestino, TipoCestinato } from '@/types';

/** Come si chiama, per un essere umano, ciascun tipo di elemento. */
const ETICHETTE_TIPO: Record<TipoCestinato, { nome: string; emoji: string }> = {
  period: { nome: 'Mese', emoji: '\u{1F5C2}\u{FE0F}' },
  expense: { nome: 'Spesa', emoji: '\u{1F9FE}' },
  common_income: { nome: 'Entrata comune', emoji: '\u{21A9}\u{FE0F}' },
  personal_period: { nome: 'Mese personale', emoji: '\u{1F45B}' },
  income: { nome: 'Entrata personale', emoji: '\u{1F4B5}' },
  personal_expense: { nome: 'Uscita personale', emoji: '\u{1F4B8}' },
};

function RigaCestino({
  elemento,
  onRipristina,
  onElimina,
  inCorso,
}: {
  elemento: ElementoCestinato;
  onRipristina: (e: ElementoCestinato) => void;
  onElimina: (e: ElementoCestinato) => void;
  inCorso: boolean;
}) {
  const tipo = ETICHETTE_TIPO[elemento.tipo];
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[1.25rem] border-2 border-ink bg-muted/50 px-3.5 py-3">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-base',
          elemento.sezione === 'casa' ? 'bg-accent' : 'bg-secondary',
        )}
        aria-hidden="true"
      >
        {tipo.emoji}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-bold text-foreground">
          {elemento.etichetta}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span>{tipo.nome}</span>
          {elemento.contesto && <>&middot; {elemento.contesto}</>}
          <>&middot; cestinato il {formatLongDate(elemento.deleted_at)}</>
          {elemento.deleted_by && <>&middot; da {elemento.deleted_by}</>}
        </p>
      </div>

      <Badge variant={elemento.sezione === 'casa' ? 'default' : 'neutral'}>
        {elemento.sezione === 'casa' ? 'Spese casa' : 'Personale'}
      </Badge>

      {elemento.importo !== null && (
        <span className="tabular text-sm font-extrabold text-foreground">
          {formatEuro(elemento.importo)}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={inCorso}
          onClick={() => onRipristina(elemento)}
        >
          <RotateCcw />
          Ripristina
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="hover:!bg-destructive"
          aria-label={`Elimina definitivamente ${elemento.etichetta}`}
          disabled={inCorso}
          onClick={() => onElimina(elemento)}
        >
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

export function CestinoPage() {
  const { data, isPending, isError, error, refetch } = useTrash();
  const ripristina = useRestore();
  const elimina = useHardDelete();

  const [sezione, setSezione] = useState<SezioneCestino | ''>('');
  const [daEliminare, setDaEliminare] = useState<ElementoCestinato | null>(null);

  const visibili = (data ?? []).filter((e) => sezione === '' || e.sezione === sezione);
  const inCorso = ripristina.isPending || elimina.isPending;

  return (
    <div>
      <PageHeader
        emoji={'\u{1F5D1}\u{FE0F}'}
        eyebrow="Impostazioni"
        title="Cestino"
        description="Quel che elimini finisce qui: puoi riportarlo indietro finch&eacute; non lo butti per sempre."
        actions={
          <Select
            value={sezione}
            onChange={(e) => setSezione(e.target.value as SezioneCestino | '')}
            className="w-auto min-w-[11rem]"
            aria-label="Filtra per sezione"
          >
            <option value="">Tutte le sezioni</option>
            <option value="casa">Spese casa</option>
            <option value="personale">Spese personali</option>
          </Select>
        }
      />

      {isPending && <LoadingState label="Guardo nel cestino…" />}

      {isError && (
        <ErrorState
          message={getErrorMessage(error, 'Impossibile aprire il cestino')}
          onRetry={() => void refetch()}
        />
      )}

      {data && visibili.length === 0 && (
        <EmptyState
          emoji={'\u{2728}'}
          title="Cestino vuoto"
          description={
            sezione === ''
              ? "Non hai eliminato niente, o hai gia' fatto pulizia."
              : 'Niente da recuperare in questa sezione.'
          }
        />
      )}

      {data && visibili.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>
              <span aria-hidden="true">&#128465;&#65039;</span> Elementi cestinati
            </CardTitle>
            <span className="text-xs font-bold text-muted-foreground">
              {visibili.length} {visibili.length === 1 ? 'elemento' : 'elementi'}
            </span>
          </CardHeader>
          <ul className="space-y-2 p-3">
            {visibili.map((elemento) => (
              <RigaCestino
                key={`${elemento.tipo}-${elemento.id}`}
                elemento={elemento}
                onRipristina={(e) => ripristina.mutate({ tipo: e.tipo, id: e.id })}
                onElimina={setDaEliminare}
                inCorso={inCorso}
              />
            ))}
          </ul>
          <div className="border-t-2 border-dashed border-ink/25 bg-muted/40 px-5 py-3">
            <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
              <span aria-hidden="true">&#128161;</span> Ripristinando un mese tornano anche le
              sue righe. Le voci che arrivano dalle Spese casa non compaiono qui: seguono da sole
              il movimento condiviso che le ha generate.
            </p>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={daEliminare !== null}
        title="Eliminare per sempre?"
        message={
          <>
            <strong className="text-foreground">{daEliminare?.etichetta}</strong> verr&agrave;
            cancellato definitivamente dal database. Da qui in poi non c&apos;&egrave; pi&ugrave;
            modo di recuperarlo.
          </>
        }
        confirmLabel="S&igrave;, per sempre"
        loading={elimina.isPending}
        onConfirm={async () => {
          if (!daEliminare) return;
          await elimina
            .mutateAsync({ tipo: daEliminare.tipo, id: daEliminare.id })
            .catch(() => null);
          setDaEliminare(null);
        }}
        onCancel={() => setDaEliminare(null)}
      />
    </div>
  );
}
