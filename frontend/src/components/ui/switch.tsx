import * as SwitchPrimitive from '@radix-ui/react-switch';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

import { cn } from '@/lib/utils';

export const Switch = forwardRef<
  ElementRef<typeof SwitchPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        `peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2
         border-ink px-0.5 shadow-sticker-sm transition-colors duration-200
         focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40
         disabled:cursor-not-allowed disabled:opacity-60
         data-[state=checked]:bg-success data-[state=unchecked]:bg-muted`,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className="pointer-events-none block size-5 rounded-full border-2 border-ink bg-card
                   transition-transform duration-200 ease-boing
                   data-[state=checked]:translate-x-[1.1rem]
                   data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
});
