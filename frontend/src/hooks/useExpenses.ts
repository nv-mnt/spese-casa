import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { expensesApi } from '@/api/expenses';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';
import type { ExpensePayload } from '@/types';

export function useExpenses(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.expenses(periodId ?? 0),
    queryFn: () => expensesApi.list(periodId as number),
    enabled: periodId !== null,
  });
}

/**
 * Dopo ogni scrittura invalidiamo registro, riepilogo e lista periodi:
 * e' cosi' che il riepilogo si aggiorna da solo, come nel foglio.
 */
function useExpenseInvalidation(periodId: number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(periodId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.summary(periodId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
  };
}

export function useCreateExpense(periodId: number) {
  const invalida = useExpenseInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: ExpensePayload) => expensesApi.create(periodId, payload),
    onSuccess: () => {
      invalida();
      toast.success('Spesa aggiunta');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Aggiunta della spesa fallita')),
  });
}

export function useUpdateExpense(periodId: number) {
  const invalida = useExpenseInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ExpensePayload> }) =>
      expensesApi.update(periodId, id, payload),
    onSuccess: () => {
      invalida();
      toast.success('Spesa modificata');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Modifica della spesa fallita')),
  });
}

export function useDeleteExpense(periodId: number) {
  const invalida = useExpenseInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => expensesApi.remove(periodId, id),
    onSuccess: () => {
      invalida();
      toast.success('Spesa eliminata');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Eliminazione della spesa fallita')),
  });
}
