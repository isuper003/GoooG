import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export function useStatsOverview() {
  return useQuery({ queryKey: ['stats', 'overview'], queryFn: () => apiClient.getStatsOverview() });
}
