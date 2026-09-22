import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../lib/apiClient';
import type {
  Data18WatchLaterItem,
  Data18WatchLaterResponse,
  Data18WatchLaterBackupItem,
} from '../../shared/data18Types';

export interface WatchLaterFilterParams {
  filter?: 'all' | 'unwatched' | 'watched';
  type?: 'all' | 'scene' | 'movie';
  search?: string;
}

export function useData18WatchLater(params?: WatchLaterFilterParams) {
  return useQuery<Data18WatchLaterResponse>({
    queryKey: ['data18', 'watch-later', params?.filter ?? 'all', params?.type ?? 'all', params?.search ?? ''],
    queryFn: () => apiClient.getData18WatchLater(params),
    staleTime: 30_000,
  });
}

/**
 * Fast O(1) map of saved items keyed by `${itemType}:${itemId}`.
 * Useful for any card or detail view to instantly know if an item is saved and watched.
 */
export function useData18WatchLaterMap() {
  const { data } = useData18WatchLater({ filter: 'all', type: 'all' });

  return useMemo(() => {
    const map = new Map<string, Data18WatchLaterItem>();
    if (data?.items) {
      for (const item of data.items) {
        map.set(`${item.itemType}:${item.itemId}`, item);
      }
    }
    return map;
  }, [data?.items]);
}

/**
 * Hook to toggle (add/remove) an item in Watch Later.
 */
export function useToggleWatchLater() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      savedItem,
      itemToSave,
    }: {
      savedItem?: Data18WatchLaterItem;
      itemToSave?: Partial<Data18WatchLaterItem> & {
        itemType: 'scene' | 'movie';
        itemId: string;
        title: string;
        url: string;
      };
    }) => {
      if (savedItem) {
        await apiClient.removeData18WatchLater({ id: savedItem.id });
        return { action: 'removed' as const, id: savedItem.id };
      } else if (itemToSave) {
        const created = await apiClient.addData18WatchLater(itemToSave);
        return { action: 'added' as const, item: created };
      }
      throw new Error('Either savedItem or itemToSave must be provided');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data18', 'watch-later'] });
    },
  });
}

/**
 * Hook to update watched status or personal notes.
 */
export function useUpdateWatchLaterItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: number;
      patch: { isWatched?: boolean; notes?: string | null };
    }) => {
      return apiClient.updateData18WatchLater(id, patch);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data18', 'watch-later'] });
    },
  });
}

/**
 * Trigger download of the JSON backup file in browser.
 */
export async function downloadWatchLaterBackup(): Promise<void> {
  const backup = await apiClient.exportData18WatchLater();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `data18-watch-later-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Hook to import backup data.
 */
export function useImportWatchLater() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { mode: 'merge' | 'replace'; items: Data18WatchLaterBackupItem[] }) => {
      return apiClient.importData18WatchLater(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data18', 'watch-later'] });
    },
  });
}
