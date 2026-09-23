/** Uscite per categoria: stesse barre della sezione condivisa. */

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatEuro, formatPercent } from '@/lib/format';
import { stileUscita } from '@/lib/personalCategories';
import type { CategoriaUscitaTotale } from '@/types';

function TooltipCategoria({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoriaUscitaTotale }[];
}) {
  if (!active || !payload?.length) return null;
  const riga = payload[0].payload;
  return (
    <div className="rounded-[1.25rem] border-2 border-ink bg-popover px-3.5 py-2 shadow-sticker">
      <p className="font-display text-xs font-bold text-popover-foreground">
        <span aria-hidden="true">{stileUscita(riga.categoria).emoji}</span> {riga.categoria}
      </p>
      <p className="tabular mt-0.5 text-base font-extrabold text-popover-foreground">
        {formatEuro(riga.totale)}
      </p>
      <p className="tabular text-2xs text-muted-foreground">{formatPercent(riga.percentuale)}</p>
    </div>
  );
}

function TickCategoria({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const valore = payload?.value ?? '';
  return (
    <g transform={`translate(${x ?? 0},${y ?? 0})`}>
      <text x={-8} y={0} dy={4} textAnchor="end" className="fill-current text-xs font-bold">
        {stileUscita(valore).emoji} {valore}
      </text>
    </g>
  );
}

export function PersonalCategoryCard({ categorie }: { categorie: CategoriaUscitaTotale[] }) {
  const conValore = categorie.filter((c) => c.totale > 0);

  return (
    <Card aria-labelledby="titolo-uscite-categoria">
      <CardHeader>
        <CardTitle id="titolo-uscite-categoria">
          <span aria-hidden="true">&#128202;</span> Uscite per categoria
        </CardTitle>
        <span className="tabular text-xs font-bold text-muted-foreground">
          {conValore.length}/{categorie.length} categorie
        </span>
      </CardHeader>

      {conValore.length > 0 ? (
        <div className="h-72 px-2 py-5 text-foreground">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={conValore} layout="vertical" margin={{ left: 24, right: 24 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="categoria"
                width={140}
                tick={<TickCategoria />}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<TooltipCategoria />}
                cursor={{ fill: 'hsl(var(--primary))', opacity: 0.15 }}
              />
              <Bar dataKey="totale" radius={10} barSize={16}>
                {conValore.map((c) => (
                  <Cell
                    key={c.categoria}
                    className={stileUscita(c.categoria).fill}
                    stroke="hsl(var(--ink))"
                    strokeWidth={2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="px-5 py-12 text-center text-sm font-semibold text-muted-foreground">
          <span aria-hidden="true">&#128064;</span> Nessuna uscita con un importo: aggiungine una!
        </p>
      )}
    </Card>
  );
}
