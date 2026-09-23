import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  `inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5
   font-display text-xs font-bold shadow-sticker-sm [&_svg]:size-3 [&_svg]:stroke-[2.5]`,
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        neutral: 'bg-muted text-muted-foreground',
        outline: 'bg-card text-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
