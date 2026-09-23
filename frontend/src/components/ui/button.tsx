/**
 * Bottone "cartoon": contorno spesso, ombra piatta sfalsata che si schiaccia
 * alla pressione e nastro di luce al passaggio del mouse.
 * Meccaniche adattate dai componenti 21st "Cartoon Button" (@oldkong88)
 * e "Brutal Button" (@radiumcoders).
 */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  `relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden
   whitespace-nowrap rounded-full border-2 border-ink font-display font-bold
   transition-all duration-150 ease-boing
   hover:-translate-x-[1px] hover:-translate-y-[2px] hover:shadow-sticker-lg
   active:translate-x-[2px] active:translate-y-[2px] active:shadow-pop
   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40
   disabled:pointer-events-none disabled:translate-x-0 disabled:translate-y-0
   disabled:opacity-60 disabled:shadow-sticker-sm
   [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sticker shine',
        secondary: 'bg-secondary text-secondary-foreground shadow-sticker shine',
        accent: 'bg-accent text-accent-foreground shadow-sticker shine',
        outline: 'bg-card text-foreground shadow-sticker',
        ghost: `border-transparent text-muted-foreground shadow-none
                hover:translate-x-0 hover:translate-y-0 hover:border-ink hover:bg-muted
                hover:text-foreground hover:shadow-sticker-sm
                active:translate-x-[1px] active:translate-y-[1px] active:shadow-pop`,
        destructive: 'bg-destructive text-destructive-foreground shadow-sticker shine',
        link: `border-transparent text-primary-foreground shadow-none underline
               decoration-wavy decoration-2 underline-offset-4
               hover:translate-x-0 hover:translate-y-0 hover:shadow-none`,
      },
      size: {
        sm: 'h-8 px-3.5 text-xs',
        default: 'h-10 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

export { buttonVariants };
