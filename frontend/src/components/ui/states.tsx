/** Stati trasversali: caricamento, errore, vuoto — con faccine e rimbalzi. */

import { Loader2, RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn('size-5 animate-spin text-primary', className)} aria-hidden="true" />
  );
}

export function LoadingState({ label = 'Un attimo…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <span className="flex gap-1.5" aria-hidden="true">
        {['bg-primary', 'bg-accent', 'bg-secondary'].map((colore, i) => (
          <span
            key={colore}
            className={cn(
              'size-3.5 animate-bounce-soft rounded-full border-2 border-ink',
              colore,
            )}
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="font-display text-sm font-bold text-muted-foreground">{label}</span>
    </div>
  );
}

/** Scheletro che ricalca la griglia di numeroni + schede della dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-32" />
            <Skeleton className="mt-3 h-3 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-72 lg:col-span-2" />
        <Card className="h-72" />
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="bg-destructive-subtle">
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span
          className="flex size-14 animate-wiggle items-center justify-center rounded-full
                     border-2 border-ink bg-destructive text-2xl shadow-sticker"
          aria-hidden="true"
        >
          &#128533;
        </span>
        <p className="font-display text-base font-bold text-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw />
            Riprova
          </Button>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  emoji = '\u{1F43E}',
  action,
}: {
  title: string;
  description?: string;
  /** Faccino grande al centro del riquadro. */
  emoji?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed bg-card/70 shadow-sticker">
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span
          className="flex size-16 animate-float items-center justify-center rounded-full
                     border-2 border-ink bg-secondary text-3xl shadow-sticker"
          aria-hidden="true"
        >
          {emoji}
        </span>
        <div>
          <p className="font-display text-lg font-extrabold text-foreground">{title}</p>
          {description && (
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </Card>
  );
}
