import { api } from '@/api/client';
import type { ElementoCestinato, SezioneCestino, TipoCestinato } from '@/types';

export const trashApi = {
  async list(sezione?: SezioneCestino): Promise<ElementoCestinato[]> {
    const { data } = await api.get<ElementoCestinato[]>('/trash', {
      params: sezione ? { sezione } : undefined,
    });
    return data;
  },
  async restore(tipo: TipoCestinato, id: number): Promise<void> {
    await api.post(`/trash/${tipo}/${id}/restore`);
  },
  /** Cancellazione definitiva: non recuperabile. */
  async hardDelete(tipo: TipoCestinato, id: number): Promise<void> {
    await api.delete(`/trash/${tipo}/${id}`);
  },
};
