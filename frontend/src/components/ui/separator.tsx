import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';

import { cn } from '@/lib/utils';

export const Separator = forwardRef<
  ElementRef<typeof SeparatorPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(function Separator({ className, orientation = 'horizontal', decorative = true, ...props }, ref) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 border-dashed border-ink/30',
        orientation === 'horizontal' ? 'w-full border-t-2' : 'h-full border-l-2',
        className,
      )}
      {...props}
    />
  );
});
