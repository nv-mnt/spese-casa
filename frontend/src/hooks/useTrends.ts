import { useQuery } from '@tanstack/react-query';

import { trendsApi } from '@/api/trends';
import { queryKeys } from '@/lib/queryKeys';

export function useTrendCasa(mesi: number | null) {
  return useQuery({
    queryKey: queryKeys.trendCasa(mesi),
    queryFn: () => trendsApi.casa(mesi),
  });
}

export function useTrendPersonale(mesi: number | null) {
  return useQuery({
    queryKey: queryKeys.trendPersonale(mesi),
    queryFn: () => trendsApi.personale(mesi),
  });
}
