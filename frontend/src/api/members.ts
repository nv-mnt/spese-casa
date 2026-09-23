import { api } from '@/api/client';
import type { Member } from '@/types';

export const membersApi = {
  async list(): Promise<Member[]> {
    const { data } = await api.get<Member[]>('/members');
    return data;
  },
  async update(id: number, payload: { nome?: string; colore?: string }): Promise<Member> {
    const { data } = await api.patch<Member>(`/members/${id}`, payload);
    return data;
  },
};
