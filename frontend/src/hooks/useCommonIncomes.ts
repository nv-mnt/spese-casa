import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { commonIncomesApi } from '@/api/commonIncomes';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';
import type { CommonIncomePayload } from '@/types';

export function useCommonIncomes(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.commonIncomes(periodId ?? 0),
    queryFn: () => commonIncomesApi.list(periodId as number),
    enabled: periodId !== null,
  });
}

/** Un'entrata comune cambia il netto: va invalidato anche il riepilogo. */
function useInvalidation(periodId: number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.commonIncomes(periodId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.summary(periodId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
  };
}

export function useCreateCommonIncome(periodId: number) {
  const invalida = useInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: CommonIncomePayload) => commonIncomesApi.create(periodId, payload),
    onSuccess: () => {
      invalida();
      toast.success('Entrata comune aggiunta');
    },
    onError: (error) => toast.error(getErrorMessage(error, "Aggiunta dell'entrata fallita")),
  });
}

export function useUpdateCommonIncome(periodId: number) {
  const invalida = useInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CommonIncomePayload> }) =>
      commonIncomesApi.update(periodId, id, payload),
    onSuccess: () => {
      invalida();
      toast.success('Entrata comune modificata');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Modifica fallita')),
  });
}

export function useDeleteCommonIncome(periodId: number) {
  const invalida = useInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => commonIncomesApi.remove(periodId, id),
    onSuccess: () => {
      invalida();
      toast.success('Entrata comune eliminata');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Eliminazione fallita')),
  });
}
