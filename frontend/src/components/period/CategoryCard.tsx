/** Ripartizione per categoria: barre cicciotte + elenco con faccine. */

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { stileCategoria } from '@/lib/categories';
import { formatEuro, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CategoryTotal } from '@/types';

function TooltipCategoria({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoryTotal }[];
}) {
  if (!active || !payload?.length) return null;
  const riga = payload[0].payload;
  return (
    <div className="rounded-[1.25rem] border-2 border-ink bg-popover px-3.5 py-2 shadow-sticker">
      <p className="font-display text-xs font-bold text-popover-foreground">
        <span aria-hidden="true">{stileCategoria(riga.categoria).emoji}</span> {riga.categoria}
      </p>
      <p className="tabular mt-0.5 text-base font-extrabold text-popover-foreground">
        {formatEuro(riga.totale)}
      </p>
      <p className="tabular text-2xs text-muted-foreground">{formatPercent(riga.percentuale)}</p>
    </div>
  );
}

/** Etichetta dell'asse Y: la faccina al posto del pallino. */
function TickCategoria({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value: string };
}) {
  const valore = payload?.value ?? '';
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text x={-8} y={0} dy={4} textAnchor="end" className="fill-current text-xs font-bold">
        {stileCategoria(valore).emoji} {valore}
      </text>
    </g>
  );
}

export function CategoryCard({ categorie }: { categorie: CategoryTotal[] }) {
  const conValore = categorie.filter((c) => c.totale > 0);
  const totale = categorie.reduce((acc, c) => acc + c.totale, 0);

  return (
    <Card className="flex flex-col" aria-labelledby="titolo-categorie">
      <CardHeader>
        <CardTitle id="titolo-categorie">
          <span aria-hidden="true">&#127874;</span> Dove sono finiti i soldi
        </CardTitle>
        <span className="tabular text-xs font-bold text-muted-foreground">
          {conValore.length}/{categorie.length} categorie
        </span>
      </CardHeader>

      {conValore.length > 0 ? (
        <div className="h-64 px-2 pt-5 text-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conValore} layout="vertical" margin={{ left: 16, right: 24 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="categoria"
                width={110}
                tick={<TickCategoria />}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<TooltipCategoria />}
                cursor={{ fill: 'hsl(var(--primary))', opacity: 0.15 }}
              />
              <Bar dataKey="totale" radius={10} barSize={18}>
                {conValore.map((c) => (
                  <Cell
                    key={c.categoria}
                    className={stileCategoria(c.categoria).fill}
                    stroke="hsl(var(--ink))"
                    strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
          <span aria-hidden="true">&#128064;</span> Ancora niente da mostrare: aggiungi una spesa!
        </p>
      )}

      {/* L'elenco mostra sempre tutte le categorie, anche quelle a zero. */}
      <div className="mt-auto space-y-1.5 px-4 pb-4 pt-2">
        {categorie.map((c) => {
          const vuota = c.totale === 0;
          const stile = stileCategoria(c.categoria);
          return (
            <div
              key={c.categoria}
              className={cn(
                'flex items-center gap-3 rounded-full px-3 py-1.5 transition-colors',
                vuota ? 'opacity-45' : 'bg-muted/50',
              )}
            >
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink text-xs',
                  stile.dot,
                )}
                aria-hidden="true"
              >
                {stile.emoji}
              </span>
              <span className="flex-1 truncate text-sm font-bold text-foreground">
                {c.categoria}
              </span>
              <span className="tabular w-14 text-right text-2xs text-muted-foreground">
                {vuota ? '—' : formatPercent(c.percentuale)}
              </span>
              <span className="tabular w-24 text-right text-sm font-extrabold text-foreground">
                {formatEuro(c.totale)}
              </span>
            </div>
          );
        })}

        <div className="mt-2 flex items-center gap-3 rounded-full border-2 border-ink bg-primary px-3 py-2 shadow-sticker-sm">
          <span className="flex-1 pl-1 font-display text-sm font-extrabold text-primary-foreground">
            Totale
          </span>
          <span className="tabular text-base font-extrabold text-primary-foreground">
            {formatEuro(totale)}
          </span>
        </div>
      </div>
    </Card>
  );
}
