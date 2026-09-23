import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { periodsApi } from '@/api/periods';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';

export function useSummary(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.summary(periodId ?? 0),
    queryFn: () => periodsApi.summary(periodId as number),
    enabled: periodId !== null,
  });
}

export function useUpdateSettlement(periodId: number) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: { rimborso_versato?: number; ricevuto?: boolean }) =>
      periodsApi.updateSettlement(periodId, payload),
    onSuccess: () => {
      // Il riepilogo e la lista periodi dipendono dal settlement.
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary(periodId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
      toast.success('Rimborso aggiornato');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Aggiornamento del rimborso fallito')),
  });
}
