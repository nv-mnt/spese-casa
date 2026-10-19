/**
 * Saldo carta dichiarato a mano.
 *
 * Pensato per chi non segna le spese piccole: ogni tanto si scrive quanto c'e'
 * davvero sulla carta e l'app smette di fidarsi del solo tracciato. La
 * differenza fra il saldo dichiarato e quello che risultava registrato e' lo
 * **scostamento**: in pratica le spese mai annotate.
 */

import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  useCardReadings,
  useCreateCardReading,
  useDeleteCardReading,
} from '@/hooks/usePersonal';
import { formatAmount, formatEuro, parseItalianAmount } from '@/lib/format';
import type { CardBalanceReading, PersonalSummary } from '@/types';

function dataBreve(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** Lo scostamento ha un segno: va letto subito, senza fare i conti. */
function Scostamento({ valore }: { valore: number }) {
  if (valore === 0) {
    return <span className="text-muted-foreground">in linea col tracciato</span>;
  }
  const mancano = valore < 0;
  return (
    <span className={mancano ? 'text-destructive' : 'text-success'}>
      {mancano ? '−' : '+'}
      {formatEuro(Math.abs(valore))}{' '}
      {mancano ? 'non registrati' : 'in piu del previsto'}
    </span>
  );
}

export function CardBalanceCard({ summary }: { summary: PersonalSummary }) {
  const periodId = summary.personal_period_id;
  const { carta } = summary;

  const storico = useCardReadings(periodId);
  const registra = useCreateCardReading(periodId);
  const elimina = useDeleteCardReading(periodId);
  const toast = useToast();

  // Il campo parte dal saldo attuale (di solito si corregge di poco) ed e'
  // non controllato: la `key` lo rigenera quando il saldo cambia davvero,
  // senza bisogno di sincronizzarlo a mano in un effetto.
  const campoSaldo = useRef<HTMLInputElement>(null);
  const [nota, setNota] = useState('');
  const [apertoStorico, setApertoStorico] = useState(false);
  const [daEliminare, setDaEliminare] = useState<CardBalanceReading | null>(null);

  const salva = async () => {
    const saldo = parseItalianAmount(campoSaldo.current?.value ?? '');
    if (Number.isNaN(saldo)) {
      toast.error('Importo non valido: usa il formato 1.234,56');
      return;
    }
    const esito = await registra
      .mutateAsync({
        saldo: Number(saldo.toFixed(2)),
        nota: nota.trim() === '' ? null : nota.trim(),
      })
      .catch(() => null);
    if (esito) setNota('');
  };

  const confermaEliminazione = async () => {
    if (!daEliminare) return;
    await elimina.mutateAsync(daEliminare.id).catch(() => null);
    setDaEliminare(null);
  };

  return (
    <Card aria-labelledby="titolo-saldo-carta">
      <CardHeader>
        <CardTitle id="titolo-saldo-carta">
          <span aria-hidden="true">&#128179;</span> Saldo carta
        </CardTitle>
        <span className="text-xs font-bold text-muted-foreground">
          {carta.rilevato ? `${carta.n_rilevazioni} rilevazioni` : 'mai rilevato'}
        </span>
      </CardHeader>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">Sulla carta adesso</span>
          <span className="tabular text-2xl font-extrabold text-foreground">
            {formatEuro(carta.saldo_carta)}
          </span>
        </div>

        {carta.rilevato && carta.scostamento_cumulato !== 0 && (
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs">
            Dal registro risulterebbero{' '}
            <strong className="tabular">{formatEuro(carta.saldo_tracciato)}</strong>:{' '}
            <Scostamento valore={carta.scostamento_cumulato} />.
          </p>
        )}

        <div>
          <label className="label" htmlFor="saldo-carta">
            Aggiorna il saldo
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <div className="relative min-w-[8rem] flex-1">
              <input
                key={carta.saldo_carta}
                ref={campoSaldo}
                id="saldo-carta"
                inputMode="decimal"
                className="input tabular pr-8 text-right"
                defaultValue={formatAmount(carta.saldo_carta)}
                placeholder="0,00"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void salva();
                }}
                disabled={registra.isPending}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-sm text-muted-foreground">
                &euro;
              </span>
            </div>
            <Button type="button" onClick={() => void salva()} loading={registra.isPending}>
              Registra
            </Button>
          </div>
          <input
            className="input mt-2 text-sm"
            placeholder="Nota (facoltativa)"
            maxLength={255}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            disabled={registra.isPending}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Scrivi quanto c&apos;&egrave; davvero: le uscite gi&agrave; segnate come pagate
            sono gi&agrave; comprese, non vengono tolte due volte.
          </p>
        </div>

        <div className="flex items-baseline justify-between gap-3 border-t-2 border-dashed border-ink/25 pt-3">
          <span className="text-sm text-muted-foreground">Dopo le spese in sospeso</span>
          <span className="tabular text-sm font-bold text-foreground">
            {formatEuro(summary.saldo_dopo_sospese)}
          </span>
        </div>

        {carta.n_rilevazioni > 0 && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-0"
              onClick={() => setApertoStorico((v) => !v)}
            >
              {apertoStorico ? 'Nascondi' : 'Mostra'} lo storico
            </Button>

            {apertoStorico && (
              <ul className="mt-2 space-y-1.5">
                {[...(storico.data ?? [])].reverse().map((r) => (
                  <li
                    key={r.id}
                    className="flex items-start justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs"
                  >
                    <span className="min-w-0">
                      <span className="block font-bold text-foreground">
                        {dataBreve(r.rilevato_il)} &middot;{' '}
                        <span className="tabular">{formatEuro(r.saldo)}</span>
                      </span>
                      <span className="block">
                        <Scostamento valore={r.scostamento} />
                      </span>
                      {r.nota && (
                        <span className="block truncate text-muted-foreground">{r.nota}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 rounded-md px-2 py-1 font-bold text-destructive hover:bg-destructive/10"
                      onClick={() => setDaEliminare(r)}
                    >
                      Elimina
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={daEliminare !== null}
        title="Eliminare la rilevazione?"
        message={
          <>
            La rilevazione da{' '}
            <strong>{daEliminare ? formatEuro(daEliminare.saldo) : ''}</strong> verr&agrave;
            eliminata e il saldo torner&agrave; a basarsi sulla precedente.
          </>
        }
        loading={elimina.isPending}
        onConfirm={confermaEliminazione}
        onCancel={() => setDaEliminare(null)}
      />
    </Card>
  );
}
