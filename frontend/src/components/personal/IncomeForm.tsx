/** Form di creazione/modifica di un'entrata. */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { AmountField, SelectField, TextField } from '@/components/ui/field';
import { formatAmount, parseItalianAmount } from '@/lib/format';
import { CATEGORIE_ENTRATA, type CategoriaEntrata, type Income, type IncomePayload } from '@/types';

interface Props {
  income?: Income | null;
  submitting: boolean;
  onSubmit: (payload: IncomePayload) => void;
  onCancel: () => void;
}

export function IncomeForm({ income, submitting, onSubmit, onCancel }: Props) {
  const [categoria, setCategoria] = useState<CategoriaEntrata>(income?.categoria ?? 'Stipendio');
  const [dettaglio, setDettaglio] = useState(income?.dettaglio ?? '');
  const [importo, setImporto] = useState(formatAmount(income?.importo));
  const [errore, setErrore] = useState<string | null>(null);

  // Cambiando la voce in modifica il form riparte da capo. Si aggiusta
  // durante il render, non in un effetto: niente frame con i dati vecchi.
  const [vocePrecedente, setVocePrecedente] = useState(income);
  if (vocePrecedente !== income) {
    setVocePrecedente(income);
    setCategoria(income?.categoria ?? 'Stipendio');
    setDettaglio(income?.dettaglio ?? '');
    setImporto(formatAmount(income?.importo));
    setErrore(null);
  }

  const invia = (e: React.FormEvent) => {
    e.preventDefault();
    if (dettaglio.trim() === '') {
      setErrore('Inserisci un dettaglio');
      return;
    }
    // Importo facoltativo: la cella vuota del foglio resta vuota.
    let valore: number | null = null;
    if (importo.trim() !== '') {
      const parsato = parseItalianAmount(importo);
      if (Number.isNaN(parsato) || parsato < 0) {
        setErrore('Importo non valido (es. 1.684,00)');
        return;
      }
      valore = Number(parsato.toFixed(2));
    }
    onSubmit({ categoria, dettaglio: dettaglio.trim(), importo: valore });
  };

  return (
    <form onSubmit={invia} noValidate>
      <div className="space-y-4 px-5 py-4">
        <SelectField
          label="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaEntrata)}
        >
          {CATEGORIE_ENTRATA.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Dettaglio"
          placeholder="G-NOUS S.R.L."
          autoComplete="off"
          value={dettaglio}
          onChange={(e) => setDettaglio(e.target.value)}
          error={errore && dettaglio.trim() === '' ? errore : undefined}
        />

        <AmountField
          label="Importo"
          placeholder="1.684,00"
          hint="Facoltativo"
          value={importo}
          onChange={(e) => setImporto(e.target.value)}
          error={errore && dettaglio.trim() !== '' ? errore : undefined}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t-2 border-dashed border-ink/25 bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button type="submit" loading={submitting}>
          {income ? 'Salva modifiche' : 'Aggiungi entrata'}
        </Button>
      </div>
    </form>
  );
}
