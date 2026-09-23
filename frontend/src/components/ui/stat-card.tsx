/**
 * Scheda-numerone in stile adesivo: fondo pastello, contorno a pennarello,
 * faccino tondo e rimbalzo al passaggio del mouse.
 */

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Tono = 'default' | 'primary' | 'success' | 'warning' | 'destructive';

const TONI: Record<Tono, { sfondo: string; pastiglia: string }> = {
  default: { sfondo: 'bg-card', pastiglia: 'bg-muted' },
  primary: { sfondo: 'bg-primary-subtle', pastiglia: 'bg-primary' },
  success: { sfondo: 'bg-success-subtle', pastiglia: 'bg-success' },
  warning: { sfondo: 'bg-warning-subtle', pastiglia: 'bg-warning' },
  destructive: { sfondo: 'bg-destructive-subtle', pastiglia: 'bg-destructive' },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  emoji,
  tone = 'default',
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  /** Se presente prende il posto dell'icona: piu' fumettoso. */
  emoji?: string;
  tone?: Tono;
  footer?: ReactNode;
  className?: string;
}) {
  const stile = TONI[tone];
  return (
    <div
      className={cn(
        `group rounded-blob border-3 border-ink text-card-foreground shadow-sticker-lg
         transition-transform duration-200 ease-boing hover:-translate-y-1 hover:rotate-[-0.6deg]`,
        stile.sfondo,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-2xs font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="tabular mt-1.5 text-2xl font-extrabold leading-none text-foreground">
            {value}
          </p>
          {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span
          className={cn(
            `flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink
             text-lg shadow-sticker-sm transition-transform duration-200 ease-boing
             group-hover:rotate-12`,
            stile.pastiglia,
          )}
          aria-hidden="true"
        >
          {emoji ?? (Icon && <Icon className="size-5 text-foreground" strokeWidth={2.5} />)}
        </span>
      </div>
      {footer && (
        <div className="border-t-2 border-dashed border-ink/25 px-5 py-2.5 text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
