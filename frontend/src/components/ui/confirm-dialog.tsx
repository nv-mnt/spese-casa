import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Elimina',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(aperta) => !aperta && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="bg-destructive-subtle">
          <div className="flex items-start gap-3">
            <span
              className="flex size-11 shrink-0 animate-wiggle items-center justify-center
                         rounded-full border-2 border-ink bg-destructive text-xl shadow-sticker-sm"
              aria-hidden="true"
            >
              &#128551;
            </span>
            <div className="space-y-0.5">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>Poi non si torna indietro!</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="text-sm text-muted-foreground">{message}</DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Lascia stare
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
