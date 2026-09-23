/** Notifiche a fumetto: adesivo colorato che rimbalza dall'angolo. */

import { X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATA_MS = 4500;

const STILI: Record<ToastKind, { sfondo: string; testo: string; emoji: string }> = {
  success: { sfondo: 'bg-success', testo: 'text-success-foreground', emoji: '\u{1F389}' },
  error: { sfondo: 'bg-destructive', testo: 'text-destructive-foreground', emoji: '\u{1F648}' },
  info: { sfondo: 'bg-accent', testo: 'text-accent-foreground', emoji: '\u{1F4A1}' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setToasts((precedenti) => [...precedenti, { id, kind, message }]);
    const timer = window.setTimeout(() => {
      setToasts((precedenti) => precedenti.filter((t) => t.id !== id));
    }, DURATA_MS);
    timers.current.push(timer);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
    }),
    [push],
  );

  const dismiss = (id: number) => setToasts((precedenti) => precedenti.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center
                   gap-2.5 p-4 sm:inset-x-auto sm:bottom-auto sm:right-2 sm:top-2 sm:items-end"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const { sfondo, testo, emoji } = STILI[toast.kind];
          return (
            <div
              key={toast.id}
              className={cn(
                `pointer-events-auto flex w-full max-w-sm animate-pop-in items-center gap-3
                 rounded-full border-2 border-ink px-4 py-2.5 font-display text-sm font-bold
                 shadow-sticker-lg`,
                sfondo,
                testo,
              )}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {emoji}
              </span>
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="flex size-6 shrink-0 items-center justify-center rounded-full border-2
                           border-ink bg-card/70 transition-transform duration-150 ease-boing
                           hover:rotate-90"
                aria-label="Chiudi notifica"
              >
                <X className="size-3" strokeWidth={3.5} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve essere usato dentro <ToastProvider>');
  return ctx;
}
