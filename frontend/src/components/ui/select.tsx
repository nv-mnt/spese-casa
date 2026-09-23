import { ChevronDown } from 'lucide-react';
import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

/** Select nativa vestita da caramella: resta accessibile su mobile. */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            `flex h-11 w-full appearance-none rounded-full border-2 border-ink bg-card pl-4 pr-10
             text-sm font-semibold text-foreground shadow-sticker-sm
             transition-all duration-150 ease-boing
             focus-visible:-translate-y-[2px] focus-visible:shadow-sticker
             focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/35
             disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70`,
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <span
          className="pointer-events-none absolute right-1.5 top-1/2 flex size-7 -translate-y-1/2
                     items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <ChevronDown className="size-3.5" strokeWidth={3} />
        </span>
      </div>
    );
  },
);
