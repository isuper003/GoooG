import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { ReviewQueuesDTO } from '../../shared/types';

export function useReviewQueues() {
  return useQuery<ReviewQueuesDTO>({
    queryKey: ['review', 'queues'],
    queryFn: () => apiClient.getReviewQueues(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
