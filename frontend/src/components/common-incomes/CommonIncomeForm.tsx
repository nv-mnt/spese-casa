/** Form di creazione/modifica di un'entrata comune. */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { AmountField, SelectField, TextField } from '@/components/ui/field';
import { parseItalianAmount } from '@/lib/format';
import {
  CATEGORIE_ENTRATA_COMUNE,
  type CommonIncome,
  type CommonIncomePayload,
  type Member,
} from '@/types';

const schema = z.object({
  data: z.string().optional(),
  descrizione: z
    .string()
    .trim()
    .min(1, 'Inserisci una descrizione')
    .max(255, 'Massimo 255 caratteri'),
  categoria: z.enum(CATEGORIE_ENTRATA_COMUNE, { message: 'Scegli una categoria' }),
  ricevuto_da_id: z.coerce.number().int().positive('Scegli chi ha incassato'),
  importo: z
    .string()
    .trim()
    .min(1, "Inserisci l'importo")
    .refine((v) => !Number.isNaN(parseItalianAmount(v)), 'Importo non valido (es. 40,00)')
    .refine((v) => parseItalianAmount(v) > 0, "L'importo deve essere maggiore di zero"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  members: Member[];
  income?: CommonIncome | null;
  submitting: boolean;
  onSubmit: (payload: CommonIncomePayload) => void;
  onCancel: () => void;
}

function defaultValues(income: CommonIncome | null | undefined, members: Member[]): FormValues {
  return {
    data: income?.data ?? '',
    descrizione: income?.descrizione ?? '',
    categoria: income?.categoria ?? 'Reso',
    ricevuto_da_id: income?.ricevuto_da_id ?? members[0]?.id ?? 0,
    importo: income ? income.importo.toFixed(2).replace('.', ',') : '',
  };
}

export function CommonIncomeForm({ members, income, submitting, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(income, members),
  });

  useEffect(() => {
    reset(defaultValues(income, members));
  }, [income, members, reset]);

  const invia = handleSubmit((values) => {
    onSubmit({
      data: values.data && values.data !== '' ? values.data : null,
      descrizione: values.descrizione.trim(),
      categoria: values.categoria,
      ricevuto_da_id: Number(values.ricevuto_da_id),
      importo: Number(parseItalianAmount(values.importo).toFixed(2)),
    });
  });

  return (
    <form onSubmit={invia} noValidate>
      <div className="space-y-4 px-5 py-4">
        <TextField
          label="Descrizione"
          placeholder="Reso Amazon"
          autoComplete="off"
          error={errors.descrizione?.message}
          {...register('descrizione')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField
            label="Importo"
            placeholder="40,00"
            error={errors.importo?.message}
            {...register('importo')}
          />
          <TextField
            label="Data"
            type="date"
            hint="Facoltativa"
            error={errors.data?.message}
            {...register('data')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Categoria"
            error={errors.categoria?.message}
            {...register('categoria')}
          >
            {CATEGORIE_ENTRATA_COMUNE.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Ricevuto da"
            hint="Chi ha incassato"
            error={errors.ricevuto_da_id?.message}
            {...register('ricevuto_da_id')}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </SelectField>
        </div>
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
