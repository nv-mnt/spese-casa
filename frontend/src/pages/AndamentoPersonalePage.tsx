/** Andamento multi-mese del budget personale (solo i propri dati). */

import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getErrorMessage } from '@/api/client';
import {
  FiltriTrend,
  MedieCategoriaCard,
  MesiPiuCariCard,
  TooltipTrend,
  VariazioneBadge,
} from '@/components/trends/TrendParts';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DashboardSkeleton, EmptyState, ErrorState } from '@/components/ui/states';
import { useTrendPersonale } from '@/hooks/useTrends';
import { formatEuro } from '@/lib/format';
import { stileUscita } from '@/lib/personalCategories';
import { CATEGORIE_USCITA } from '@/types';

export function AndamentoPersonalePage() {
  const [mesi, setMesi] = useState<number | null>(null);
  const [categoria, setCategoria] = useState('');
  const { data, isPending, isError, error, refetch } = useTrendPersonale(mesi);

  if (isPending) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <ErrorState
        message={getErrorMessage(error, "Impossibile caricare l'andamento")}
        onRetry={() => void refetch()}
      />
    );
  }

  const ultimo = data.punti.at(-1);
  const precedente = data.punti.at(-2);
  const totaleUscite = data.punti.reduce((acc, p) => acc + p.uscite_totali, 0);
  const mediaUscite = data.n_mesi ? totaleUscite / data.n_mesi : 0;

  return (
    <div>
      <PageHeader
        emoji={'\u{1F4C8}'}
        eyebrow="Spese personali"
        title="Andamento"
        description="Entrate, uscite e saldi del tuo budget, mese dopo mese."
      />

      <div className="mb-5">
        <FiltriTrend
          mesi={mesi}
          onMesi={setMesi}
          categoria={categoria}
          onCategoria={setCategoria}
          categorie={CATEGORIE_USCITA}
          nota={`${data.n_mesi} ${data.n_mesi === 1 ? 'mese' : 'mesi'}`}
        />
      </div>

      {data.punti.length === 0 ? (
        <EmptyState
          emoji={'\u{1F4B3}'}
          title="Ancora niente da confrontare"
          description="Serve almeno un mese con entrate o uscite per vedere un andamento."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={`Entrate ${ultimo?.etichetta ?? ''}`}
              value={formatEuro(ultimo?.entrate_totali ?? 0)}
              hint={
                <VariazioneBadge
                  attuale={ultimo?.entrate_totali ?? 0}
                  precedente={precedente?.entrate_totali}
                  salireEBene
                />
              }
              emoji={'\u{1F4B5}'}
              tone="success"
            />
            <StatCard
              label="Uscite"
              value={formatEuro(ultimo?.uscite_totali ?? 0)}
              hint={
                <VariazioneBadge
                  attuale={ultimo?.uscite_totali ?? 0}
                  precedente={precedente?.uscite_totali}
                />
              }
              emoji={'\u{1F4B8}'}
              tone="destructive"
            />
            <StatCard
              label="Uscite medie"
              value={formatEuro(mediaUscite)}
              hint={`su ${data.n_mesi} ${data.n_mesi === 1 ? 'mese' : 'mesi'}`}
              emoji={'\u{2696}\u{FE0F}'}
            />
            <StatCard
              label="Dopo le sospese"
              value={formatEuro(ultimo?.saldo_dopo_sospese ?? 0)}
              hint={
                <VariazioneBadge
                  attuale={ultimo?.saldo_dopo_sospese ?? 0}
                  precedente={precedente?.saldo_dopo_sospese}
                  salireEBene
                />
              }
              emoji={(ultimo?.saldo_dopo_sospese ?? 0) >= 0 ? '\u{1F642}' : '\u{1F630}'}
              tone={(ultimo?.saldo_dopo_sospese ?? 0) >= 0 ? 'warning' : 'destructive'}
            />
          </div>

          <Card className="mt-5" aria-labelledby="titolo-andamento-personale">
            <CardHeader>
              <CardTitle id="titolo-andamento-personale">
                <span aria-hidden="true">&#128200;</span> Entrate vs uscite
              </CardTitle>
              <span className="text-xs font-bold text-muted-foreground">
                con il saldo previsto
              </span>
            </CardHeader>
            <div className="h-80 px-2 py-5 text-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.punti} margin={{ left: 8, right: 16, top: 8 }}>
                  <defs>
                    <linearGradient id="gradEntrate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradUscite" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-7))" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="hsl(var(--chart-7))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--ink))" strokeOpacity={0.12} />
                  <XAxis
                    dataKey="etichetta"
                    tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip content={<TooltipTrend />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Area
                    type="monotone"
                    dataKey="entrate_totali"
                    name="Entrate"
                    stroke="hsl(var(--ink))"
                    strokeWidth={2.5}
                    fill="url(#gradEntrate)"
                  />
                  <Area
                    type="monotone"
                    dataKey="uscite_totali"
                    name="Uscite"
                    stroke="hsl(var(--ink))"
                    strokeWidth={2.5}
                    fill="url(#gradUscite)"
                  />
                  <Line
                    type="monotone"
                    dataKey="saldo_dopo_sospese"
                    name="Dopo le sospese"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={3.5}
                    dot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--ink))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <MedieCategoriaCard
              categorie={data.per_categoria}
              nMesi={data.n_mesi}
              stile={stileUscita}
              filtro={categoria}
            />
            <MesiPiuCariCard mesi={data.mesi_piu_cari} />
          </div>

          {/* Confronto mese su mese, dal piu' recente */}
          <Card className="mt-4 overflow-hidden" aria-labelledby="titolo-confronto-personale">
            <CardHeader>
              <CardTitle id="titolo-confronto-personale">
                <span aria-hidden="true">&#128257;</span> Mese su mese
              </CardTitle>
            </CardHeader>
            <ul className="space-y-1.5 p-3">
              {[...data.punti].reverse().map((punto, i, elenco) => {
                const prima = elenco[i + 1];
                return (
                  <li
                    key={punto.personal_period_id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[1.25rem] border-2 border-ink bg-muted/50 px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-foreground">
                      {punto.etichetta}
                    </span>
                    <span className="tabular text-sm font-extrabold text-foreground">
                      {formatEuro(punto.uscite_totali)}
                    </span>
                    <VariazioneBadge
                      attuale={punto.uscite_totali}
                      precedente={prima?.uscite_totali}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
