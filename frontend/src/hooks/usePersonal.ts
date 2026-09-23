import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { personalApi } from '@/api/personal';
import { useToast } from '@/components/ui/toast';
import { useMese } from '@/context/MeseContext';
import { queryKeys } from '@/lib/queryKeys';
import type {
  IncomePayload,
  PersonalExpensePayload,
  PersonalPeriodListItem,
} from '@/types';

/* ------------------------------------------------------------------- periodi */

export function usePersonalPeriods() {
  return useQuery({
    queryKey: queryKeys.personalPeriods,
    queryFn: personalApi.listPeriods,
  });
}

export function usePersonalSummary(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.personalSummary(periodId ?? 0),
    queryFn: () => personalApi.summary(periodId as number),
    enabled: periodId !== null,
  });
}

export function useCreatePersonalPeriod() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: personalApi.createPeriod,
    onSuccess: (period) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.personalPeriods });
      toast.success(`Mese "${period.etichetta}" creato`);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Creazione del mese fallita')),
  });
}

export function useRenamePersonalPeriod() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { mese, setMese } = useMese();

  return useMutation({
    mutationFn: ({ id, etichetta }: { id: number; etichetta: string }) =>
      personalApi.renamePeriod(id, etichetta),
    onSuccess: (period) => {
      // Come per le spese di casa: se il mese rinominato e' quello selezionato,
      // la selezione lo segue (e' il nome a fare da identita').
      const precedenti = queryClient.getQueryData<PersonalPeriodListItem[]>(
        queryKeys.personalPeriods,
      );
      const vecchia = precedenti?.find((p) => p.id === period.id)?.etichetta;
      if (vecchia && vecchia === mese) setMese(period.etichetta);

      void queryClient.invalidateQueries({ queryKey: queryKeys.personalPeriods });
      void queryClient.invalidateQueries({ queryKey: queryKeys.personalSummary(period.id) });
      toast.success('Mese rinominato');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Rinomina fallita')),
  });
}

export function useDeletePersonalPeriod() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => personalApi.removePeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.personalPeriods });
      toast.success('Mese eliminato');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Eliminazione fallita')),
  });
}

/**
 * Dopo ogni scrittura invalidiamo righe, riepilogo e lista mesi: e' cosi' che
 * i quattro numeri del riepilogo si aggiornano da soli.
 */
function usePersonalInvalidation(periodId: number) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.personalIncomes(periodId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.personalExpenses(periodId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.personalSummary(periodId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.personalPeriods });
  };
}

/* ------------------------------------------------------------------- entrate */

export function useIncomes(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.personalIncomes(periodId ?? 0),
    queryFn: () => personalApi.listIncomes(periodId as number),
    enabled: periodId !== null,
  });
}

export function useCreateIncome(periodId: number) {
  const invalida = usePersonalInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: IncomePayload) => personalApi.createIncome(periodId, payload),
    onSuccess: () => {
      invalida();
      toast.success('Entrata aggiunta');
    },
    onError: (error) => toast.error(getErrorMessage(error, "Aggiunta dell'entrata fallita")),
  });
}

export function useUpdateIncome(periodId: number) {
  const invalida = usePersonalInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<IncomePayload> }) =>
      personalApi.updateIncome(periodId, id, payload),
    onSuccess: () => {
      invalida();
      toast.success('Entrata modificata');
    },
    onError: (error) => toast.error(getErrorMessage(error, "Modifica dell'entrata fallita")),
  });
}

export function useDeleteIncome(periodId: number) {
  const invalida = usePersonalInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => personalApi.removeIncome(periodId, id),
    onSuccess: () => {
      invalida();
      toast.success('Entrata eliminata');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Eliminazione fallita')),
  });
}

/* -------------------------------------------------------------------- uscite */

export function usePersonalExpenses(periodId: number | null) {
  return useQuery({
    queryKey: queryKeys.personalExpenses(periodId ?? 0),
    queryFn: () => personalApi.listExpenses(periodId as number),
    enabled: periodId !== null,
  });
}

export function useCreatePersonalExpense(periodId: number) {
  const invalida = usePersonalInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: PersonalExpensePayload) =>
      personalApi.createExpense(periodId, payload),
    onSuccess: () => {
      invalida();
      toast.success('Uscita aggiunta');
    },
    onError: (error) => toast.error(getErrorMessage(error, "Aggiunta dell'uscita fallita")),
  });
}

export function useUpdatePersonalExpense(periodId: number) {
  const invalida = usePersonalInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<PersonalExpensePayload>;
      /** Silenzia il toast: il toggle "Pagato" e' troppo frequente. */
      silenzioso?: boolean;
    }) => personalApi.updateExpense(periodId, id, payload),
    onSuccess: (_, variabili) => {
      invalida();
      if (!variabili.silenzioso) toast.success('Uscita modificata');
    },
    onError: (error) => toast.error(getErrorMessage(error, "Modifica dell'uscita fallita")),
  });
}

export function useDeletePersonalExpense(periodId: number) {
  const invalida = usePersonalInvalidation(periodId);
  const toast = useToast();

  return useMutation({
    mutationFn: (id: number) => personalApi.removeExpense(periodId, id),
    onSuccess: () => {
      invalida();
      toast.success('Uscita eliminata');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Eliminazione fallita')),
  });
}
