import { forwardRef, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          `flex h-11 w-full rounded-full border-2 border-ink bg-card px-4 py-1 text-sm
           font-semibold text-foreground shadow-sticker-sm transition-all duration-150 ease-boing
           file:border-0 file:bg-transparent file:text-sm file:font-bold
           placeholder:font-normal placeholder:text-muted-foreground/70
           focus-visible:-translate-y-[2px] focus-visible:shadow-sticker
           focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/35
           disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70
           aria-[invalid=true]:bg-destructive-subtle
           aria-[invalid=true]:focus-visible:ring-destructive/40`,
          className,
        )}
        {...props}
      />
    );
  },
);
