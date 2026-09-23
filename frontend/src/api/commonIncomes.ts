import { api } from '@/api/client';
import type { CommonIncome, CommonIncomePayload } from '@/types';

export const commonIncomesApi = {
  async list(periodId: number): Promise<CommonIncome[]> {
    const { data } = await api.get<CommonIncome[]>(`/periods/${periodId}/common-incomes`);
    return data;
  },
  async create(periodId: number, payload: CommonIncomePayload): Promise<CommonIncome> {
    const { data } = await api.post<CommonIncome>(
      `/periods/${periodId}/common-incomes`,
      payload,
    );
    return data;
  },
  async update(
    periodId: number,
    incomeId: number,
    payload: Partial<CommonIncomePayload>,
  ): Promise<CommonIncome> {
    const { data } = await api.patch<CommonIncome>(
      `/periods/${periodId}/common-incomes/${incomeId}`,
      payload,
    );
    return data;
  },
  async remove(periodId: number, incomeId: number): Promise<void> {
    await api.delete(`/periods/${periodId}/common-incomes/${incomeId}`);
  },
};
