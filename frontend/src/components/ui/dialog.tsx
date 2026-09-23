import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type HTMLAttributes,
} from 'react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        `fixed inset-0 z-50 bg-ink/40 backdrop-blur-[3px]
         data-[state=open]:animate-in data-[state=closed]:animate-out
         data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`,
        className,
      )}
      {...props}
    />
  );
});

export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(function DialogContent({ className, children, hideClose = false, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          `fixed left-1/2 top-1/2 z-50 grid max-h-[92vh] w-[calc(100%-2rem)] max-w-lg
           -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_1fr_auto] overflow-hidden
           rounded-blob border-3 border-ink bg-card shadow-sticker-xl
           data-[state=open]:animate-in data-[state=closed]:animate-out
           data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
           data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90
           data-[state=open]:duration-300`,
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full
                       border-2 border-ink bg-destructive text-destructive-foreground
                       shadow-sticker-sm transition-transform duration-150 ease-boing
                       hover:-translate-y-[2px] hover:rotate-90 active:translate-y-0
                       focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          >
            <X className="size-4" strokeWidth={3} />
            <span className="sr-only">Chiudi</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});

export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b-2 border-dashed border-ink/25 bg-primary-subtle px-5 py-4 pr-14',
        className,
      )}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('overflow-y-auto px-5 py-4', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        `flex flex-col-reverse gap-2 border-t-2 border-dashed border-ink/25 bg-muted/60 px-5 py-3
         sm:flex-row sm:justify-end`,
        className,
      )}
      {...props}
    />
  );
}

export const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('font-display text-lg font-extrabold text-foreground', className)}
      {...props}
    />
  );
});

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
