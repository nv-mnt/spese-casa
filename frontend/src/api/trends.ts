import { api } from '@/api/client';
import type { TrendCasa, TrendPersonale } from '@/types';

/** `mesi` limita agli ultimi N periodi; `null` = tutti. */
export const trendsApi = {
  async casa(mesi: number | null): Promise<TrendCasa> {
    const { data } = await api.get<TrendCasa>('/periods/trends', {
      params: mesi ? { mesi } : undefined,
    });
    return data;
  },
  async personale(mesi: number | null): Promise<TrendPersonale> {
    const { data } = await api.get<TrendPersonale>('/personal/trends', {
      params: mesi ? { mesi } : undefined,
    });
    return data;
  },
};
