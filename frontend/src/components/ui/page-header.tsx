import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  titleSlot,
  description,
  eyebrow,
  emoji,
  actions,
  className,
}: {
  title: string;
  /** Se presente sostituisce il titolo: serve al rename inline. */
  titleSlot?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  /** Faccino/oggetto decorativo accanto al titolo. */
  emoji?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 pb-5 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {emoji && (
          <span
            className="flex size-12 shrink-0 animate-float items-center justify-center rounded-full
                       border-2 border-ink bg-accent text-2xl shadow-sticker"
            aria-hidden="true"
          >
            {emoji}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-0.5 font-display text-2xs font-bold uppercase tracking-widest text-muted-foreground">
              {eyebrow}
            </p>
          )}
          {titleSlot ?? (
            <h1 className="truncate font-display text-2xl font-extrabold text-foreground sm:text-3xl">
              {title}
            </h1>
          )}
          {description && <div className="mt-1 text-sm text-muted-foreground">{description}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
