import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import type { BackupSummary, FullAppBackup, FullBackupImportResponse } from '../../shared/backupTypes';

export function useFullBackupSummary() {
  return useQuery<BackupSummary>({
    queryKey: ['backup', 'summary'],
    queryFn: () => apiClient.getFullBackupSummary(),
    staleTime: 10_000,
  });
}

/**
 * Download the full application backup JSON file directly in the user's browser.
 */
export async function downloadFullAppBackup(): Promise<void> {
  const backup = await apiClient.exportFullBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().split('T')[0];
  const a = document.createElement('a');
  a.href = url;
  a.download = `gooog-full-backup-${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Mutation to restore or merge a full application backup.
 * On success, invalidates all relevant React Query caches across the app.
 */
export function useImportFullBackup() {
  const qc = useQueryClient();

  return useMutation<
    FullBackupImportResponse,
    Error,
    { mode: 'merge' | 'replace'; backup: FullAppBackup }
  >({
    mutationFn: (payload) => apiClient.importFullBackup(payload),
    onSuccess: () => {
      // Invalidate all app state so UI updates immediately
      qc.invalidateQueries({ queryKey: ['characters'] });
      qc.invalidateQueries({ queryKey: ['labels'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['review'] });
      qc.invalidateQueries({ queryKey: ['data18'] });
      qc.invalidateQueries({ queryKey: ['backup'] });
    },
  });
}
