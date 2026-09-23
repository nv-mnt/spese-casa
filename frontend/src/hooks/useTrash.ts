import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { trashApi } from '@/api/trash';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';
import type { TipoCestinato } from '@/types';

export function useTrash() {
  return useQuery({
    queryKey: queryKeys.trash,
    queryFn: () => trashApi.list(),
  });
}

/** Ripristinare o eliminare tocca i conti: si invalida tutto il resto. */
function useInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.trash });
    void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
    void queryClient.invalidateQueries({ queryKey: queryKeys.personalPeriods });
    void queryClient.invalidateQueries({ queryKey: ['periods'] });
    void queryClient.invalidateQueries({ queryKey: ['personal'] });
    void queryClient.invalidateQueries({ queryKey: ['trends'] });
  };
}

export function useRestore() {
  const invalida = useInvalidation();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ tipo, id }: { tipo: TipoCestinato; id: number }) =>
      trashApi.restore(tipo, id),
    onSuccess: () => {
      invalida();
      toast.success('Ripristinato');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Ripristino fallito')),
  });
}

export function useHardDelete() {
  const invalida = useInvalidation();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ tipo, id }: { tipo: TipoCestinato; id: number }) =>
      trashApi.hardDelete(tipo, id),
    onSuccess: () => {
      invalida();
      toast.success('Eliminato definitivamente');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Eliminazione fallita')),
  });
}
