/** Chiavi di cache centralizzate: rendono le invalidazioni esplicite. */

export const queryKeys = {
  me: ['me'] as const,
  members: ['members'] as const,
  templates: ['recurring-templates'] as const,
  periods: ['periods'] as const,
  period: (id: number) => ['periods', id] as const,
  expenses: (periodId: number) => ['periods', periodId, 'expenses'] as const,
  summary: (periodId: number) => ['periods', periodId, 'summary'] as const,
  commonIncomes: (periodId: number) => ['periods', periodId, 'common-incomes'] as const,
  trendCasa: (mesi: number | null) => ['trends', 'casa', mesi] as const,

  /* Budget personale: chiavi separate, cosi' l'invalidazione della sezione
     condivisa non tocca quella privata e viceversa. */
  personalPeriods: ['personal', 'periods'] as const,
  personalPeriod: (id: number) => ['personal', 'periods', id] as const,
  personalIncomes: (id: number) => ['personal', 'periods', id, 'incomes'] as const,
  personalExpenses: (id: number) => ['personal', 'periods', id, 'expenses'] as const,
  personalSummary: (id: number) => ['personal', 'periods', id, 'summary'] as const,
  trendPersonale: (mesi: number | null) => ['trends', 'personale', mesi] as const,

  /* Cestino: una chiave sola, filtrata lato client per sezione. */
  trash: ['trash'] as const,
};
