/** Form di creazione/modifica di una spesa (React Hook Form + Zod). */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { AmountField, SelectField, TextField } from '@/components/ui/field';
import { parseItalianAmount } from '@/lib/format';
import { CATEGORIE, type Expense, type ExpensePayload, type Member } from '@/types';

const schema = z.object({
  // La data e' opzionale, come le celle vuote del foglio.
  data: z.string().optional(),
  descrizione: z
    .string()
    .trim()
    .min(1, 'Inserisci una descrizione')
    .max(255, 'Massimo 255 caratteri'),
  categoria: z.enum(CATEGORIE, { message: 'Scegli una categoria' }),
  paid_by_id: z.coerce.number().int().positive('Scegli chi ha pagato'),
  importo: z
    .string()
    .trim()
    .min(1, "Inserisci l'importo")
    .refine((v) => !Number.isNaN(parseItalianAmount(v)), 'Importo non valido (es. 45,37)')
    .refine((v) => parseItalianAmount(v) > 0, "L'importo deve essere maggiore di zero"),
});

type FormValues = z.infer<typeof schema>;

interface ExpenseFormProps {
  members: Member[];
  expense?: Expense | null;
  submitting: boolean;
  onSubmit: (payload: ExpensePayload) => void;
  onCancel: () => void;
}

function defaultValues(expense: Expense | null | undefined, members: Member[]): FormValues {
  return {
    data: expense?.data ?? '',
    descrizione: expense?.descrizione ?? '',
    categoria: expense?.categoria ?? 'Spesa',
    paid_by_id: expense?.paid_by_id ?? members[0]?.id ?? 0,
    importo: expense ? expense.importo.toFixed(2).replace('.', ',') : '',
  };
}

export function ExpenseForm({
  members,
  expense,
  submitting,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(expense, members),
  });

  useEffect(() => {
    reset(defaultValues(expense, members));
  }, [expense, members, reset]);

  const invia = handleSubmit((values) => {
    onSubmit({
      data: values.data && values.data !== '' ? values.data : null,
      descrizione: values.descrizione.trim(),
      categoria: values.categoria,
      paid_by_id: Number(values.paid_by_id),
      importo: Number(parseItalianAmount(values.importo).toFixed(2)),
    });
  });

  return (
    <form onSubmit={invia} noValidate>
      <div className="space-y-4 px-5 py-4">
        <TextField
          label="Descrizione"
          placeholder="Spesa Esselunga"
          autoComplete="off"
          error={errors.descrizione?.message}
          {...register('descrizione')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <AmountField
            label="Importo"
            placeholder="45,37"
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
            {CATEGORIE.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Pagato da"
            error={errors.paid_by_id?.message}
            {...register('paid_by_id')}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annulla
        </Button>
        <Button type="submit" loading={submitting}>
          {expense ? 'Salva modifiche' : 'Aggiungi spesa'}
        </Button>
      </div>
    </form>
  );
}
