import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { membersApi } from '@/api/members';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: membersApi.list,
    // I due membri cambiano molto raramente.
    staleTime: 5 * 60_000,
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number; nome?: string; colore?: string }) =>
      membersApi.update(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members });
      // Nomi e colori compaiono anche nel riepilogo e nel registro.
      void queryClient.invalidateQueries({ queryKey: queryKeys.periods });
      toast.success('Membro aggiornato');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Aggiornamento del membro fallito')),
  });
}
