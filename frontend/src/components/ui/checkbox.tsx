import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

import { cn } from '@/lib/utils';

export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        `peer size-6 shrink-0 rounded-lg border-2 border-ink bg-card shadow-sticker-sm
         transition-all duration-150 ease-boing
         hover:-translate-y-[1px]
         focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40
         disabled:cursor-not-allowed disabled:opacity-60
         data-[state=checked]:bg-success data-[state=checked]:text-success-foreground`,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex animate-pop-in items-center justify-center text-current">
        <Check className="size-4" strokeWidth={4} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
