import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { periodsApi } from '@/api/periods';
import { useToast } from '@/components/ui/toast';
import { useMese } from '@/context/MeseContext';
import { queryKeys } from '@/lib/queryKeys';
import type { PeriodListItem } from '@/types';

export function usePeriods() {
  return useQuery({
    queryKey: queryKeys.periods,
    queryFn: periodsApi.list,
  });
}

export function usePeriod(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.period(periodId ?? 0),
    queryFn: () => periodsApi.get(periodId as number),
    enabled: periodId !== null,
  });
}

export function useCreatePeriod() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: periodsApi.create,
    onSuccess: (period) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
      toast.success(`Mese "${period.nome}" creato`);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Creazione del mese fallita')),
  });
}

export function useRenamePeriod() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { mese, setMese } = useMese();

  return useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) => periodsApi.rename(id, nome),
    onSuccess: (period) => {
      // Il mese selezionato e' identificato dal nome: se abbiamo rinominato
      // proprio quello, la selezione deve seguirlo, altrimenti punterebbe a un
      // nome che non esiste piu' e la vista cadrebbe nello stato vuoto.
      const precedenti = queryClient.getQueryData<PeriodListItem[]>(queryKeys.periods);
      const vecchioNome = precedenti?.find((p) => p.id === period.id)?.nome;
      if (vecchioNome && vecchioNome === mese) setMese(period.nome);

      void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
      void queryClient.invalidateQueries({ queryKey: queryKeys.period(period.id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary(period.id) });
      toast.success('Mese rinominato');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Rinomina fallita')),
  });
}

export function useDeletePeriod() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => periodsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
      toast.success('Mese eliminato');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Eliminazione fallita')),
  });
}
