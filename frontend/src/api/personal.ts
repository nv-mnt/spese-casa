import { api } from '@/api/client';
import type {
  Income,
  IncomePayload,
  PersonalExpense,
  PersonalExpensePayload,
  PersonalPeriod,
  PersonalPeriodListItem,
  PersonalSummary,
} from '@/types';

const base = '/personal/periods';

export const personalApi = {
  async listPeriods(): Promise<PersonalPeriodListItem[]> {
    const { data } = await api.get<PersonalPeriodListItem[]>(base);
    return data;
  },
  async createPeriod(payload: {
    etichetta: string;
    precompila_da_precedente: boolean;
  }): Promise<PersonalPeriod> {
    const { data } = await api.post<PersonalPeriod>(base, payload);
    return data;
  },
  async renamePeriod(id: number, etichetta: string): Promise<PersonalPeriod> {
    const { data } = await api.patch<PersonalPeriod>(`${base}/${id}`, { etichetta });
    return data;
  },
  async removePeriod(id: number): Promise<void> {
    await api.delete(`${base}/${id}`);
  },

  async summary(id: number): Promise<PersonalSummary> {
    const { data } = await api.get<PersonalSummary>(`${base}/${id}/summary`);
    return data;
  },

  async listIncomes(periodId: number): Promise<Income[]> {
    const { data } = await api.get<Income[]>(`${base}/${periodId}/incomes`);
    return data;
  },
  async createIncome(periodId: number, payload: IncomePayload): Promise<Income> {
    const { data } = await api.post<Income>(`${base}/${periodId}/incomes`, payload);
    return data;
  },
  async updateIncome(
    periodId: number,
    incomeId: number,
    payload: Partial<IncomePayload>,
  ): Promise<Income> {
    const { data } = await api.patch<Income>(
      `${base}/${periodId}/incomes/${incomeId}`,
      payload,
    );
    return data;
  },
  async removeIncome(periodId: number, incomeId: number): Promise<void> {
    await api.delete(`${base}/${periodId}/incomes/${incomeId}`);
  },

  async listExpenses(periodId: number): Promise<PersonalExpense[]> {
    const { data } = await api.get<PersonalExpense[]>(`${base}/${periodId}/expenses`);
    return data;
  },
  async createExpense(
    periodId: number,
    payload: PersonalExpensePayload,
  ): Promise<PersonalExpense> {
    const { data } = await api.post<PersonalExpense>(
      `${base}/${periodId}/expenses`,
      payload,
    );
    return data;
  },
  async updateExpense(
    periodId: number,
    expenseId: number,
    payload: Partial<PersonalExpensePayload>,
  ): Promise<PersonalExpense> {
    const { data } = await api.patch<PersonalExpense>(
      `${base}/${periodId}/expenses/${expenseId}`,
      payload,
    );
    return data;
  },
  async removeExpense(periodId: number, expenseId: number): Promise<void> {
    await api.delete(`${base}/${periodId}/expenses/${expenseId}`);
  },

  /** Scarica il CSV come Blob, cosi' da poterlo salvare lato browser. */
  async exportCsv(periodId: number): Promise<Blob> {
    const { data } = await api.get<Blob>(`${base}/${periodId}/export.csv`, {
      responseType: 'blob',
    });
    return data;
  },
};
