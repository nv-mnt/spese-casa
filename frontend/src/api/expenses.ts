import { api } from '@/api/client';
import type { Expense, ExpensePayload } from '@/types';

export const expensesApi = {
  async list(periodId: number): Promise<Expense[]> {
    const { data } = await api.get<Expense[]>(`/periods/${periodId}/expenses`);
    return data;
  },
  async create(periodId: number, payload: ExpensePayload): Promise<Expense> {
    const { data } = await api.post<Expense>(`/periods/${periodId}/expenses`, payload);
    return data;
  },
  async update(
    periodId: number,
    expenseId: number,
    payload: Partial<ExpensePayload>,
  ): Promise<Expense> {
    const { data } = await api.patch<Expense>(
      `/periods/${periodId}/expenses/${expenseId}`,
      payload,
    );
    return data;
  },
  async remove(periodId: number, expenseId: number): Promise<void> {
    await api.delete(`/periods/${periodId}/expenses/${expenseId}`);
  },
};
