/** Pezzi condivisi dalle due pagine di andamento. */

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { formatEuro, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MediaCategoria, MeseCaro } from '@/types';

/** Tooltip Recharts nello stesso stile delle altre schede. */
export function TooltipTrend({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[1.25rem] border-2 border-ink bg-popover px-3.5 py-2 shadow-sticker">
      {label && <p className="font-display text-xs font-bold text-popover-foreground">{label}</p>}
      {payload.map((riga) => (
        <p key={riga.name} className="tabular mt-0.5 text-sm font-bold text-popover-foreground">
          <span
            className="mr-1.5 inline-block size-2 rounded-full border border-ink align-middle"
            style={{ backgroundColor: riga.color }}
            aria-hidden="true"
          />
          {riga.name}: {formatEuro(riga.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

/**
 * Variazione rispetto al mese precedente.
 * Il colore segue il **significato**, non il segno: per le uscite salire e'
 * una cattiva notizia, per un saldo e' il contrario.
 */
export function VariazioneBadge({
  attuale,
  precedente,
  salireEBene = false,
}: {
  attuale: number;
  precedente: number | undefined;
  salireEBene?: boolean;
}) {
  if (precedente === undefined) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-muted px-2 py-0.5 text-2xs font-bold text-muted-foreground">
        <Minus className="size-3" strokeWidth={3} />
        primo mese
      </span>
    );
  }

  const delta = attuale - precedente;
  const arrotondato = Math.round(delta * 100) / 100;
  if (arrotondato === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-muted px-2 py-0.5 text-2xs font-bold text-muted-foreground">
        <Minus className="size-3" strokeWidth={3} />
        invariato
      </span>
    );
  }

  const sale = arrotondato > 0;
  const buono = sale === salireEBene;
  // Senza un precedente diverso da zero la percentuale non significa nulla.
  const percentuale = precedente !== 0 ? (delta / Math.abs(precedente)) * 100 : null;

  return (
    <span
      className={cn(
        'tabular inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 text-2xs font-bold',
        buono
          ? 'bg-success text-success-foreground'
          : 'bg-warning text-warning-foreground',
      )}
    >
      {sale ? (
        <TrendingUp className="size-3" strokeWidth={3} />
      ) : (
        <TrendingDown className="size-3" strokeWidth={3} />
      )}
      {sale ? '+' : '−'}
      {formatEuro(Math.abs(arrotondato))}
      {percentuale !== null && <> ({formatPercent(Math.abs(percentuale))})</>}
    </span>
  );
}

/** Riga di filtri: intervallo di mesi e (facoltativa) categoria. */
export function FiltriTrend({
  mesi,
  onMesi,
  categoria,
  onCategoria,
  categorie,
  nota,
}: {
  mesi: number | null;
  onMesi: (valore: number | null) => void;
  categoria: string;
  onCategoria: (valore: string) => void;
  categorie: readonly string[];
  nota?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={mesi === null ? 'tutti' : String(mesi)}
        onChange={(e) => onMesi(e.target.value === 'tutti' ? null : Number(e.target.value))}
        className="w-auto min-w-[10rem]"
        aria-label="Intervallo di mesi"
      >
        <option value="tutti">Tutti i mesi</option>
        <option value="3">Ultimi 3 mesi</option>
        <option value="6">Ultimi 6 mesi</option>
        <option value="12">Ultimi 12 mesi</option>
      </Select>

      <Select
        value={categoria}
        onChange={(e) => onCategoria(e.target.value)}
        className="w-auto min-w-[10rem]"
        aria-label="Filtra per categoria"
      >
        <option value="">Tutte le categorie</option>
        {categorie.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>

      {nota && <span className="ml-auto text-xs font-bold text-muted-foreground">{nota}</span>}
    </div>
  );
}

/** Spesa media per categoria, ordinata dalla piu' pesante. */
export function MedieCategoriaCard({
  categorie,
  nMesi,
  stile,
  filtro,
}: {
  categorie: MediaCategoria[];
  nMesi: number;
  stile: (categoria: string) => { dot: string; emoji: string };
  filtro: string;
}) {
  const visibili = categorie.filter(
    (c) => c.totale > 0 && (filtro === '' || c.categoria === filtro),
  );

  return (
    <Card aria-labelledby="titolo-medie">
      <CardHeader>
        <CardTitle id="titolo-medie">
          <span aria-hidden="true">&#128202;</span> Spesa media per categoria
        </CardTitle>
        <span className="text-xs font-bold text-muted-foreground">
          su {nMesi} {nMesi === 1 ? 'mese' : 'mesi'}
        </span>
      </CardHeader>

      {visibili.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
          <span aria-hidden="true">&#128064;</span> Nessun movimento in questo intervallo.
        </p>
      ) : (
        <div className="space-y-1.5 px-4 py-4">
          {visibili.map((c) => {
            const s = stile(c.categoria);
            return (
              <div
                key={c.categoria}
                className="flex items-center gap-3 rounded-full bg-muted/50 px-3 py-1.5"
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink text-xs',
                    s.dot,
                  )}
                  aria-hidden="true"
                >
                  {s.emoji}
                </span>
                <span className="flex-1 truncate text-sm font-bold text-foreground">
                  {c.categoria}
                </span>
                <span className="tabular w-16 text-right text-2xs text-muted-foreground">
                  {c.mesi_con_movimenti}/{nMesi}
                </span>
                <span className="tabular w-28 text-right text-sm font-extrabold text-foreground">
                  {formatEuro(c.media_mensile)}
                </span>
                <span className="tabular hidden w-28 text-right text-2xs text-muted-foreground sm:block">
                  tot {formatEuro(c.totale)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Classifica dei mesi piu' cari. */
export function MesiPiuCariCard({ mesi }: { mesi: MeseCaro[] }) {
  const podio = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
  return (
    <Card aria-labelledby="titolo-mesi-cari">
      <CardHeader>
        <CardTitle id="titolo-mesi-cari">
          <span aria-hidden="true">&#128176;</span> Mesi pi&ugrave; cari
        </CardTitle>
      </CardHeader>
      {mesi.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
          Ancora niente da classificare.
        </p>
      ) : (
        <ol className="space-y-1.5 px-4 py-4">
          {mesi.map((m, i) => (
            <li
              key={m.etichetta}
              className="flex items-center gap-3 rounded-full bg-muted/50 px-3 py-1.5"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-card text-xs"
                aria-hidden="true"
              >
                {podio[i] ?? i + 1}
              </span>
              <span className="flex-1 truncate text-sm font-bold text-foreground">
                {m.etichetta}
              </span>
              <span className="tabular text-sm font-extrabold text-foreground">
                {formatEuro(m.totale)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
