/**
 * Titolo rinominabile sul posto.
 *
 * Due modi per entrare in modifica, perche' nessuno dei due e' scopribile da
 * solo: il doppio click sul titolo (chi ci prova lo fa d'istinto) e la matita
 * accanto (chi non ci prova la vede). Esce con Invio o uscendo dal campo,
 * annulla con Esc.
 */

import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function InlineRename({
  valore,
  onSalva,
  salvataggioInCorso = false,
  etichettaAccessibile = 'Rinomina',
  className,
}: {
  valore: string;
  /** Riceve il nuovo nome gia' ripulito; non viene chiamata se non cambia. */
  onSalva: (nuovo: string) => void;
  salvataggioInCorso?: boolean;
  etichettaAccessibile?: string;
  className?: string;
}) {
  const [inModifica, setInModifica] = useState(false);
  const [bozza, setBozza] = useState(valore);
  const [errore, setErrore] = useState(false);
  const campo = useRef<HTMLInputElement>(null);

  // Se il nome cambia da fuori (cambio mese, refetch) la bozza lo segue.
  // Si aggiusta durante il render, non in un effetto, per non mostrare per un
  // frame il nome del mese precedente.
  const [valorePrecedente, setValorePrecedente] = useState(valore);
  if (valorePrecedente !== valore) {
    setValorePrecedente(valore);
    if (!inModifica) setBozza(valore);
  }

  useEffect(() => {
    if (inModifica) campo.current?.select();
  }, [inModifica]);

  const apri = () => {
    setBozza(valore);
    setErrore(false);
    setInModifica(true);
  };

  const annulla = () => {
    setBozza(valore);
    setErrore(false);
    setInModifica(false);
  };

  const conferma = () => {
    const pulito = bozza.trim();
    if (pulito === '') {
      setErrore(true);
      campo.current?.focus();
      return;
    }
    setInModifica(false);
    setErrore(false);
    // Nessuna chiamata se il nome non e' cambiato davvero.
    if (pulito !== valore) onSalva(pulito);
  };

  if (inModifica) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <Input
          ref={campo}
          value={bozza}
          onChange={(e) => {
            setBozza(e.target.value);
            if (errore) setErrore(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              conferma();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              annulla();
            }
          }}
          onBlur={conferma}
          disabled={salvataggioInCorso}
          aria-label={etichettaAccessibile}
          aria-invalid={errore}
          maxLength={120}
          className="h-11 max-w-xs font-display text-lg font-extrabold"
        />
        {/* `onMouseDown` invece di `onClick`: il blur del campo arriverebbe prima. */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            conferma();
          }}
          className="flex size-11 items-center justify-center rounded-full border-2 border-ink
                     bg-success text-success-foreground shadow-sticker-sm transition-transform
                     duration-150 ease-boing hover:-translate-y-[2px]
                     focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          aria-label="Salva il nuovo nome"
        >
          <Check className="size-4" strokeWidth={3} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            annulla();
          }}
          className="flex size-11 items-center justify-center rounded-full border-2 border-ink
                     bg-card shadow-sticker-sm transition-transform duration-150 ease-boing
                     hover:-translate-y-[2px]
                     focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
          aria-label="Annulla la rinomina"
        >
          <X className="size-4" strokeWidth={3} />
        </button>
        {errore && (
          <span className="text-2xs font-bold text-destructive" role="alert">
            Il nome non pu&ograve; essere vuoto
          </span>
        )}
      </div>
    );
  }

  return (
    <span className={cn('group/rename flex min-w-0 items-center gap-2', className)}>
      <h1
        className="truncate font-display text-2xl font-extrabold text-foreground sm:text-3xl"
        onDoubleClick={apri}
        title="Doppio click per rinominare"
      >
        {valore}
      </h1>
      <button
        type="button"
        onClick={apri}
        disabled={salvataggioInCorso}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border-2
                   border-ink bg-card text-muted-foreground shadow-sticker-sm
                   transition-all duration-150 ease-boing
                   hover:-translate-y-[2px] hover:text-foreground
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40
                   sm:size-8 sm:opacity-0 sm:group-hover/rename:opacity-100
                   sm:focus-visible:opacity-100"
        aria-label={etichettaAccessibile}
      >
        <Pencil className="size-3.5" strokeWidth={2.5} />
      </button>
    </span>
  );
}
