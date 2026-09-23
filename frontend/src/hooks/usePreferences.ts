import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { authApi } from '@/api/auth';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/context/AuthContext';

/**
 * Preferenze dell'utente: riflesso delle Spese casa e membro corrispondente.
 * Entrambe spostano le voci derivate, quindi si invalida tutto il personale.
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  const toast = useToast();

  return useMutation({
    mutationFn: authApi.updatePreferences,
    onSuccess: async () => {
      await refresh();
      void queryClient.invalidateQueries({ queryKey: ['personal'] });
      void queryClient.invalidateQueries({ queryKey: ['trends'] });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Preferenza aggiornata');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Aggiornamento fallito')),
  });
}
