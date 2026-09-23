import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(function TooltipContent({ className, sideOffset = 8, ...props }, ref) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          `z-50 overflow-hidden rounded-full border-2 border-ink bg-accent px-3 py-1
           font-display text-xs font-bold text-accent-foreground shadow-sticker-sm
           data-[state=delayed-open]:animate-in data-[state=closed]:animate-out
           data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0
           data-[state=delayed-open]:zoom-in-90`,
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
});
