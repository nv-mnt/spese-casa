/** Rimborso e saldo: quanto è dovuto, quanto è stato versato, cosa resta. */

import { useState } from 'react';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { AmountField } from '@/components/ui/field';
import { Spinner } from '@/components/ui/states';
import { StatusBadge } from '@/components/ui/status-badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast';
import { useUpdateSettlement } from '@/hooks/useSummary';
import { formatAmount, formatEuro, parseItalianAmount } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PeriodSummary } from '@/types';

export function SettlementCard({ summary }: { summary: PeriodSummary }) {
  const { rimborso } = summary;
  const aggiorna = useUpdateSettlement(summary.period_id);
  const toast = useToast();

  // Campo controllato in locale: si risincronizza quando arriva il server.
  // L'allineamento avviene durante il render (non in un effetto): cosi' il
  // campo non passa mai per un frame con il valore vecchio.
  const [versato, setVersato] = useState(() => formatAmount(rimborso.rimborso_versato));
  const [ultimoDalServer, setUltimoDalServer] = useState(rimborso.rimborso_versato);

  if (ultimoDalServer !== rimborso.rimborso_versato) {
    setUltimoDalServer(rimborso.rimborso_versato);
    setVersato(formatAmount(rimborso.rimborso_versato));
  }

  const salvaVersato = () => {
    const valore = versato.trim() === '' ? 0 : parseItalianAmount(versato);
    if (Number.isNaN(valore) || valore < 0) {
      toast.error('Ops, importo strano: scrivilo come 45,37');
      setVersato(formatAmount(rimborso.rimborso_versato));
      return;
    }
    if (valore === rimborso.rimborso_versato) return;
    aggiorna.mutate({ rimborso_versato: Number(valore.toFixed(2)) });
  };

  const residuoNegativo = rimborso.residuo < 0;

  return (
    <Card id="rimborso" className="scroll-mt-24" aria-labelledby="titolo-rimborso">
      <CardHeader>
        <CardTitle id="titolo-rimborso">
          <span aria-hidden="true">&#129297;</span> Rimborso
        </CardTitle>
        <StatusBadge stato={rimborso.stato} label={rimborso.stato_label} />
      </CardHeader>

      <div className="space-y-4 px-5 py-4">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.25rem] border-2 border-ink bg-accent px-3 py-2.5 shadow-sticker-sm">
            <dt className="font-display text-2xs font-bold uppercase tracking-wider text-accent-foreground/70">
              Dovuto
            </dt>
            <dd className="tabular mt-1 text-xl font-extrabold text-accent-foreground">
              {formatEuro(rimborso.importo_dovuto)}
            </dd>
          </div>
          <div
            className={cn(
              'rounded-[1.25rem] border-2 border-ink px-3 py-2.5 shadow-sticker-sm',
              rimborso.residuo > 0
                ? 'bg-warning'
                : residuoNegativo
                  ? 'bg-muted'
                  : 'bg-success',
            )}
          >
            <dt className="font-display text-2xs font-bold uppercase tracking-wider opacity-70">
              Resta
            </dt>
            <dd className="tabular mt-1 text-xl font-extrabold">
              {formatEuro(rimborso.residuo)}
            </dd>
          </div>
        </dl>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <AmountField
              label="Gi&agrave; versato"
              id="rimborso-versato"
              hint="Invio per salvare"
              value={versato}
              placeholder="0,00"
              onChange={(e) => setVersato(e.target.value)}
              onBlur={salvaVersato}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              disabled={aggiorna.isPending}
            />
          </div>
          {aggiorna.isPending && <Spinner className="mb-3" />}
        </div>

        {residuoNegativo && (
          <p className="rounded-[1.25rem] border-2 border-ink bg-warning-subtle px-3 py-2 text-xs font-semibold">
            <span aria-hidden="true">&#129300;</span> Hai segnato piu&apos; di quanto dovuto.
          </p>
        )}

        <div className="flex items-center justify-between gap-3 rounded-[1.25rem] border-2 border-ink bg-muted px-3.5 py-3">
          <label htmlFor="ricevuto" className="cursor-pointer text-sm">
            <span className="font-display font-bold text-foreground">Soldi ricevuti?</span>
            <span className="mt-0.5 block text-2xs text-muted-foreground">
              Chiude il mese con i coriandoli
            </span>
          </label>
          <Switch
            id="ricevuto"
            checked={rimborso.ricevuto}
            onCheckedChange={(valore) => aggiorna.mutate({ ricevuto: valore })}
            disabled={aggiorna.isPending}
          />
        </div>
      </div>
    </Card>
  );
}
