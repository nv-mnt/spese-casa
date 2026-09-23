import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-full bg-muted', className)}
      aria-hidden="true"
      {...props}
    >
      <span
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent
                   via-primary/40 to-transparent"
        style={{ animation: 'shimmer 1.4s infinite' }}
      />
    </div>
  );
}
