/** Chi ha messo cosa: contributi netti, netto da dividere, fumetto del conguaglio. */

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { MemberAvatar } from '@/components/ui/member-avatar';
import { formatEuro } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PeriodSummary } from '@/types';

export function SummaryCard({ summary }: { summary: PeriodSummary }) {
  const conEntrate = summary.entrate_comuni_totali > 0;
  // La barra confronta i contributi netti, che possono essere negativi.
  const massimo = Math.max(...summary.per_membro.map((r) => Math.abs(r.contributo_netto)), 1);

  return (
    <Card aria-labelledby="titolo-riepilogo">
      <CardHeader>
        <CardTitle id="titolo-riepilogo">
          <span aria-hidden="true">&#128184;</span> Chi ha messo cosa
        </CardTitle>
        <span className="tabular text-xs font-bold text-muted-foreground">
          {formatEuro(summary.quota_a_testa)} a testa
        </span>
      </CardHeader>

      {/* Il conto che porta alla quota: visibile solo se c'e' qualcosa da sottrarre. */}
      {conEntrate && (
        <dl className="space-y-1.5 border-b-2 border-dashed border-ink/25 px-5 py-3.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Spese totali</dt>
            <dd className="tabular font-bold text-foreground">
              {formatEuro(summary.totale_speso)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">Entrate comuni</dt>
            <dd className="tabular font-bold text-success-foreground">
              &minus;{formatEuro(summary.entrate_comuni_totali)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-t-2 border-dashed border-ink/20 pt-1.5">
            <dt className="font-display font-bold text-foreground">Netto da dividere</dt>
            <dd className="tabular text-base font-extrabold text-foreground">
              {formatEuro(summary.netto_da_dividere)}
            </dd>
          </div>
        </dl>
      )}

      <div className="space-y-5 px-5 py-4">
        {summary.per_membro.map((riga) => {
          const percentuale = Math.round((Math.abs(riga.contributo_netto) / massimo) * 100);
          const inCredito = riga.differenza > 0;
          return (
            <div key={riga.member.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <MemberAvatar {...riga.member} size="sm" />
                  <span className="truncate font-display text-sm font-bold text-foreground">
                    {riga.member.nome}
                  </span>
                </span>
                <span className="tabular shrink-0 text-base font-extrabold text-foreground">
                  {formatEuro(riga.contributo_netto)}
                </span>
              </div>

              {/* Il dettaglio serve solo quando c'e' qualcosa da sottrarre. */}
              {conEntrate && (
                <p className="tabular mt-0.5 text-right text-2xs text-muted-foreground">
                  {formatEuro(riga.ha_pagato)} spesi &minus; {formatEuro(riga.ha_ricevuto)}{' '}
                  incassati
                </p>
              )}

              {/* Barra "tubetto": contorno spesso e riempimento tondo. */}
              <div className="mt-2 h-4 overflow-hidden rounded-full border-2 border-ink bg-muted">
                <div
                  className="h-full rounded-full border-r-2 border-ink transition-[width] duration-700 ease-boing"
                  style={{ width: `${percentuale}%`, backgroundColor: riga.member.colore }}
                  aria-hidden="true"
                />
              </div>

              <p className="mt-2">
                <span
                  className={cn(
                    'tabular inline-block rounded-full border-2 border-ink px-2.5 py-0.5 text-2xs font-bold',
                    riga.differenza === 0
                      ? 'bg-muted text-muted-foreground'
                      : inCredito
                        ? 'bg-success text-success-foreground'
                        : 'bg-warning text-warning-foreground',
                  )}
                >
                  {riga.differenza === 0
                    ? 'In pari \u{1F44C}'
                    : inCredito
                      ? `+${formatEuro(riga.differenza)} in credito`
                      : `-${formatEuro(Math.abs(riga.differenza))} in debito`}
                </span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Conguaglio, in un fumetto */}
      <div className="border-t-2 border-dashed border-ink/25 px-5 py-4">
        <div className="relative rounded-[1.25rem] border-2 border-ink bg-primary-subtle px-4 py-3 shadow-sticker-sm">
          {/* Codina del fumetto */}
          <span
            className="absolute -top-[9px] left-7 size-4 rotate-45 border-l-2 border-t-2
                       border-ink bg-primary-subtle"
            aria-hidden="true"
          />
          <p className="font-display text-sm font-bold text-foreground">
            {summary.chi_deve_a_chi}
          </p>
          {!summary.in_pari && summary.debitore && summary.creditore && (
            <div className="mt-2.5 flex items-center gap-2">
              <MemberAvatar {...summary.debitore} size="sm" />
              <span className="text-base leading-none" aria-hidden="true">
                &#128073;
              </span>
              <MemberAvatar {...summary.creditore} size="sm" />
              <span className="tabular ml-1 text-base font-extrabold text-foreground">
                {formatEuro(summary.saldo)}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
