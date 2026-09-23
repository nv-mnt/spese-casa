import { api } from '@/api/client';
import type { Period, PeriodListItem, PeriodSummary, Settlement } from '@/types';

export const periodsApi = {
  async list(): Promise<PeriodListItem[]> {
    const { data } = await api.get<PeriodListItem[]>('/periods');
    return data;
  },
  async get(id: number): Promise<Period> {
    const { data } = await api.get<Period>(`/periods/${id}`);
    return data;
  },
  async create(payload: { nome: string; precompila_ricorrenti: boolean }): Promise<Period> {
    const { data } = await api.post<Period>('/periods', payload);
    return data;
  },
  async rename(id: number, nome: string): Promise<Period> {
    const { data } = await api.patch<Period>(`/periods/${id}`, { nome });
    return data;
  },
  async remove(id: number): Promise<void> {
    await api.delete(`/periods/${id}`);
  },
  async summary(id: number): Promise<PeriodSummary> {
    const { data } = await api.get<PeriodSummary>(`/periods/${id}/summary`);
    return data;
  },
  async updateSettlement(
    id: number,
    payload: { rimborso_versato?: number; ricevuto?: boolean },
  ): Promise<Settlement> {
    const { data } = await api.put<Settlement>(`/periods/${id}/settlement`, payload);
    return data;
  },
  /** Scarica il CSV come Blob, cosi' da poterlo salvare lato browser. */
  async exportCsv(id: number): Promise<Blob> {
    const { data } = await api.get<Blob>(`/periods/${id}/export.csv`, {
      responseType: 'blob',
    });
    return data;
  },
};
