/** Form di creazione/modifica di un'uscita personale. */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AmountField, SelectField, TextField } from '@/components/ui/field';
import { formatAmount, parseItalianAmount } from '@/lib/format';
import {
  CATEGORIE_USCITA,
  type CategoriaUscita,
  type PersonalExpense,
  type PersonalExpensePayload,
} from '@/types';

interface Props {
  expense?: PersonalExpense | null;
  submitting: boolean;
  onSubmit: (payload: PersonalExpensePayload) => void;
  onCancel: () => void;
}

export function PersonalExpenseForm({ expense, submitting, onSubmit, onCancel }: Props) {
  const [categoria, setCategoria] = useState<CategoriaUscita>(expense?.categoria ?? 'Altro');
  const [dettaglio, setDettaglio] = useState(expense?.negozio_dettaglio ?? '');
  const [importo, setImporto] = useState(formatAmount(expense?.importo));
  const [pagato, setPagato] = useState(expense?.pagato ?? false);
  const [errore, setErrore] = useState<string | null>(null);

  // Cambiando la voce in modifica il form riparte da capo. Si aggiusta
  // durante il render, non in un effetto: niente frame con i dati vecchi.
  const [vocePrecedente, setVocePrecedente] = useState(expense);
  if (vocePrecedente !== expense) {
    setVocePrecedente(expense);
    setCategoria(expense?.categoria ?? 'Altro');
    setDettaglio(expense?.negozio_dettaglio ?? '');
    setImporto(formatAmount(expense?.importo));
    setPagato(expense?.pagato ?? false);
    setErrore(null);
  }

  const invia = (e: React.FormEvent) => {
    e.preventDefault();
    if (dettaglio.trim() === '') {
      setErrore('Inserisci negozio o dettaglio');
      return;
    }
    let valore: number | null = null;
    if (importo.trim() !== '') {
      const parsato = parseItalianAmount(importo);
      if (Number.isNaN(parsato) || parsato < 0) {
        setErrore('Importo non valido (es. 8,99)');
        return;
      }
      valore = Number(parsato.toFixed(2));
    }
    onSubmit({
      categoria,
      negozio_dettaglio: dettaglio.trim(),
      importo: valore,
      pagato,
    });
  };

  return (
    <form onSubmit={invia} noValidate>
      <div className="space-y-4 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaUscita)}
          >
            {CATEGORIE_USCITA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>

          <AmountField
            label="Importo"
            placeholder="8,99"
            hint="Facoltativo"
            value={importo}
            onChange={(e) => setImporto(e.target.value)}
            error={errore && dettaglio.trim() !== '' ? errore : undefined}
          />
        </div>

        <TextField
          label="Negozio / Dettaglio"
          placeholder="UnoMobile"
          autoComplete="off"
          value={dettaglio}
          onChange={(e) => setDettaglio(e.target.value)}
          error={errore && dettaglio.trim() === '' ? errore : undefined}
        />

        <label
          htmlFor="uscita-pagato"
          className="flex cursor-pointer items-start gap-3 rounded-[1.25rem] border-2 border-ink bg-secondary/40 p-3.5"
        >
          <Checkbox
            id="uscita-pagato"
            className="mt-0.5"
            checked={pagato}
            onCheckedChange={(valore) => setPagato(valore === true)}
          />
          <span className="text-sm">
            <span className="font-display font-bold text-foreground">Gi&agrave; pagata</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Se la spunti, l&apos;importo viene gi&agrave; tolto dal saldo carta. Altrimenti
              resta in sospeso e pesa solo sul saldo previsto.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t-2 border-dashed border-ink/25 bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button type="submit" loading={submitting}>
          {expense ? 'Salva modifiche' : 'Aggiungi uscita'}
        </Button>
      </div>
    </form>
  );
}
