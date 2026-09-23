import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getErrorMessage } from '@/api/client';
import { templatesApi, type TemplatePayload } from '@/api/templates';
import { useToast } from '@/components/ui/toast';
import { queryKeys } from '@/lib/queryKeys';

export function useTemplates() {
  return useQuery({
    queryKey: queryKeys.templates,
    queryFn: templatesApi.list,
  });
}

function useTemplateMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  messaggio: string,
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.templates });
      toast.success(messaggio);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Operazione fallita')),
  });
}

export function useCreateTemplate() {
  return useTemplateMutation(
    (payload: TemplatePayload) => templatesApi.create(payload),
    'Spesa fissa aggiunta',
  );
}

export function useUpdateTemplate() {
  return useTemplateMutation(
    ({ id, payload }: { id: number; payload: Partial<TemplatePayload> }) =>
      templatesApi.update(id, payload),
    'Spesa fissa aggiornata',
  );
}

export function useDeleteTemplate() {
  return useTemplateMutation(
    (id: number) => templatesApi.remove(id),
    'Spesa fissa eliminata',
  );
}
