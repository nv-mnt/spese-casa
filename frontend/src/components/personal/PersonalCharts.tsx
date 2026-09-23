/** Grafici della dashboard personale: entrate vs uscite e andamento mensile. */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEuro } from '@/lib/format';
import type { PersonalPeriodListItem, PersonalSummary } from '@/types';

function TooltipSemplice({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; payload?: Record<string, unknown> }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[1.25rem] border-2 border-ink bg-popover px-3.5 py-2 shadow-sticker">
      {label && (
        <p className="font-display text-xs font-bold text-popover-foreground">{label}</p>
      )}
      {payload.map((riga) => (
        <p
          key={riga.name}
          className="tabular mt-0.5 text-sm font-extrabold text-popover-foreground"
        >
          {riga.name}: {formatEuro(riga.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

/** Confronto immediato fra quanto entra e quanto esce nel mese. */
export function EntrateUsciteCard({ summary }: { summary: PersonalSummary }) {
  const dati = [
    { voce: 'Entrate', importo: summary.entrate_totali, fill: 'fill-chart-4' },
    { voce: 'Uscite pagate', importo: summary.uscite_pagate, fill: 'fill-chart-7' },
    { voce: 'In sospeso', importo: summary.uscite_in_sospeso, fill: 'fill-chart-8' },
  ];

  return (
    <Card aria-labelledby="titolo-entrate-uscite">
      <CardHeader>
        <CardTitle id="titolo-entrate-uscite">
          <span aria-hidden="true">&#9878;&#65039;</span> Entrate vs uscite
        </CardTitle>
      </CardHeader>
      <div className="h-64 px-2 py-5 text-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dati} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--ink))" strokeOpacity={0.12} />
            <XAxis
              dataKey="voce"
              tick={{ fontSize: 12, fill: 'currentColor', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              content={<TooltipSemplice />}
              cursor={{ fill: 'hsl(var(--primary))', opacity: 0.12 }}
            />
            <Bar dataKey="importo" name="Importo" radius={10} barSize={54}>
              {dati.map((d) => (
                <Cell
                  key={d.voce}
                  className={d.fill}
                  stroke="hsl(var(--ink))"
                  strokeWidth={2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Andamento del saldo previsto mese per mese: la visione d'insieme. */
export function AndamentoMesiCard({ periods }: { periods: PersonalPeriodListItem[] }) {
  // La lista arriva dal piu' recente: per un andamento serve l'ordine opposto.
  const dati = [...periods].reverse().map((p) => ({
    mese: p.etichetta,
    saldo: p.saldo_dopo_sospese,
    carta: p.saldo_reale,
  }));

  if (dati.length < 2) return null;

  return (
    <Card aria-labelledby="titolo-andamento">
      <CardHeader>
        <CardTitle id="titolo-andamento">
          <span aria-hidden="true">&#128200;</span> Andamento fra i mesi
        </CardTitle>
        <span className="text-xs font-bold text-muted-foreground">
          saldo dopo le spese in sospeso
        </span>
      </CardHeader>
      <div className="h-64 px-2 py-5 text-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dati} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--ink))" strokeOpacity={0.12} />
            <XAxis
              dataKey="mese"
              tick={{ fontSize: 11, fill: 'currentColor', fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<TooltipSemplice />} />
            <Line
              type="monotone"
              dataKey="carta"
              name="Saldo carta"
              stroke="hsl(var(--chart-3))"
              strokeWidth={3}
              strokeDasharray="6 4"
              dot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--ink))' }}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              name="Dopo le sospese"
              stroke="hsl(var(--chart-1))"
              strokeWidth={4}
              dot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--ink))' }}
              activeDot={{ r: 7, strokeWidth: 2, stroke: 'hsl(var(--ink))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
