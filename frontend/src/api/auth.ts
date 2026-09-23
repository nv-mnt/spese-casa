import { api } from '@/api/client';
import type { TokenPair, User } from '@/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  nome: string;
  household_nome?: string;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<TokenPair> {
    const { data } = await api.post<TokenPair>('/auth/login', payload);
    return data;
  },
  async register(payload: RegisterPayload): Promise<TokenPair> {
    const { data } = await api.post<TokenPair>('/auth/register', payload);
    return data;
  },
  async me(): Promise<User> {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
  async updatePreferences(payload: {
    rifletti_spese_casa?: boolean;
    member_id?: number | null;
  }): Promise<User> {
    const { data } = await api.patch<User>('/auth/me', payload);
    return data;
  },
};
