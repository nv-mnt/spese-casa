import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  function Table({ className, ...props }, ref) {
    return (
      <div className="w-full overflow-x-auto px-2 pb-2">
        <table
          ref={ref}
          className={cn('w-full caption-bottom border-separate border-spacing-y-1 text-sm', className)}
          {...props}
        />
      </div>
    );
  },
);

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableHeader({ className, ...props }, ref) {
  return <thead ref={ref} className={cn('', className)} {...props} />;
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableBody({ className, ...props }, ref) {
  return <tbody ref={ref} className={cn('', className)} {...props} />;
});

export const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(function TableFooter({ className, ...props }, ref) {
  return <tfoot ref={ref} className={cn('font-bold', className)} {...props} />;
});

export const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  function TableRow({ className, ...props }, ref) {
    return (
      <tr
        ref={ref}
        className={cn(
          /* Ogni riga e' una "pastiglia": angoli tondi sulle celle di testa e coda. */
          `transition-colors duration-150
           [&>td]:bg-muted/45 [&>td:first-child]:rounded-l-full [&>td:last-child]:rounded-r-full
           hover:[&>td]:bg-primary-subtle`,
          className,
        )}
        {...props}
      />
    );
  },
);

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(function TableHead({ className, ...props }, ref) {
  return (
    <th
      ref={ref}
      className={cn(
        'h-8 whitespace-nowrap px-4 text-left align-middle font-display text-2xs font-bold uppercase tracking-wider text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
});

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(function TableCell({ className, ...props }, ref) {
  return <td ref={ref} className={cn('px-4 py-3 align-middle', className)} {...props} />;
});
