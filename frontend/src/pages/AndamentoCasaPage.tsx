/** Andamento multi-mese delle Spese casa. */

import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
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
import { useTrendCasa } from '@/hooks/useTrends';
import { stileCategoria } from '@/lib/categories';
import { formatEuro } from '@/lib/format';
import { CATEGORIE } from '@/types';

export function AndamentoCasaPage() {
  const [mesi, setMesi] = useState<number | null>(null);
  const [categoria, setCategoria] = useState('');
  const { data, isPending, isError, error, refetch } = useTrendCasa(mesi);

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
  const totaleSpese = data.punti.reduce((acc, p) => acc + p.spese_totali, 0);
  const mediaMensile = data.n_mesi ? totaleSpese / data.n_mesi : 0;

  return (
    <div>
      <PageHeader
        emoji={'\u{1F4C8}'}
        eyebrow="Spese casa"
        title="Andamento"
        description="Come si muovono le spese di casa mese dopo mese."
      />

      <div className="mb-5">
        <FiltriTrend
          mesi={mesi}
          onMesi={setMesi}
          categoria={categoria}
          onCategoria={setCategoria}
          categorie={CATEGORIE}
          nota={`${data.n_mesi} ${data.n_mesi === 1 ? 'mese' : 'mesi'}`}
        />
      </div>

      {data.punti.length === 0 ? (
        <EmptyState
          emoji={'\u{1F423}'}
          title="Ancora niente da confrontare"
          description="Serve almeno un mese con qualche spesa per vedere un andamento."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={`Spese ${ultimo?.etichetta ?? ''}`}
              value={formatEuro(ultimo?.spese_totali ?? 0)}
              hint={
                <VariazioneBadge
                  attuale={ultimo?.spese_totali ?? 0}
                  precedente={precedente?.spese_totali}
                />
              }
              emoji={'\u{1F4B8}'}
              tone="primary"
            />
            <StatCard
              label="Media mensile"
              value={formatEuro(mediaMensile)}
              hint={`su ${data.n_mesi} ${data.n_mesi === 1 ? 'mese' : 'mesi'}`}
              emoji={'\u{2696}\u{FE0F}'}
            />
            <StatCard
              label="Netto da dividere"
              value={formatEuro(ultimo?.netto_da_dividere ?? 0)}
              hint={
                <VariazioneBadge
                  attuale={ultimo?.netto_da_dividere ?? 0}
                  precedente={precedente?.netto_da_dividere}
                />
              }
              emoji={'\u{1F91D}'}
            />
            <StatCard
              label="Saldo ultimo mese"
              value={formatEuro(ultimo?.saldo ?? 0)}
              hint={
                <VariazioneBadge attuale={ultimo?.saldo ?? 0} precedente={precedente?.saldo} />
              }
              emoji={(ultimo?.saldo ?? 0) === 0 ? '\u{1F389}' : '\u{23F3}'}
              tone={(ultimo?.saldo ?? 0) === 0 ? 'success' : 'warning'}
            />
          </div>

          <Card className="mt-5" aria-labelledby="titolo-andamento-casa">
            <CardHeader>
              <CardTitle id="titolo-andamento-casa">
                <span aria-hidden="true">&#128200;</span> Spese e netto da dividere
              </CardTitle>
            </CardHeader>
            <div className="h-80 px-2 py-5 text-foreground">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.punti} margin={{ left: 8, right: 16, top: 8 }}>
                  <defs>
                    <linearGradient id="gradSpese" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradNetto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.05} />
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
                    dataKey="spese_totali"
                    name="Spese totali"
                    stroke="hsl(var(--ink))"
                    strokeWidth={2.5}
                    fill="url(#gradSpese)"
                  />
                  <Area
                    type="monotone"
                    dataKey="netto_da_dividere"
                    name="Netto da dividere"
                    stroke="hsl(var(--ink))"
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                    fill="url(#gradNetto)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <MedieCategoriaCard
              categorie={data.per_categoria}
              nMesi={data.n_mesi}
              stile={stileCategoria}
              filtro={categoria}
            />
            <MesiPiuCariCard mesi={data.mesi_piu_cari} />
          </div>

          {/* Confronto mese su mese, dal piu' recente */}
          <Card className="mt-4 overflow-hidden" aria-labelledby="titolo-confronto-casa">
            <CardHeader>
              <CardTitle id="titolo-confronto-casa">
                <span aria-hidden="true">&#128257;</span> Mese su mese
              </CardTitle>
            </CardHeader>
            <ul className="space-y-1.5 p-3">
              {[...data.punti].reverse().map((punto, i, elenco) => {
                const prima = elenco[i + 1];
                return (
                  <li
                    key={punto.period_id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[1.25rem] border-2 border-ink bg-muted/50 px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate font-display text-sm font-bold text-foreground">
                      {punto.etichetta}
                    </span>
                    <span className="tabular text-sm font-extrabold text-foreground">
                      {formatEuro(punto.spese_totali)}
                    </span>
                    <VariazioneBadge
                      attuale={punto.spese_totali}
                      precedente={prima?.spese_totali}
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
