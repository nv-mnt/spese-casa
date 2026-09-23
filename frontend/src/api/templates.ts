import { api } from '@/api/client';
import type { Categoria, RecurringTemplate } from '@/types';

export interface TemplatePayload {
  descrizione: string;
  categoria: Categoria;
  importo?: number | null;
  paid_by_id?: number | null;
  attivo?: boolean;
  ordine?: number;
}

export const templatesApi = {
  async list(): Promise<RecurringTemplate[]> {
    const { data } = await api.get<RecurringTemplate[]>('/recurring-templates');
    return data;
  },
  async create(payload: TemplatePayload): Promise<RecurringTemplate> {
    const { data } = await api.post<RecurringTemplate>('/recurring-templates', payload);
    return data;
  },
  async update(id: number, payload: Partial<TemplatePayload>): Promise<RecurringTemplate> {
    const { data } = await api.patch<RecurringTemplate>(
      `/recurring-templates/${id}`,
      payload,
    );
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/recurring-templates/${id}`);
  },
};
