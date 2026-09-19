import { useState } from 'react';
import { ApiError } from '../lib/apiClient';
import { useCreateCharacter } from './useCharacters';
import type { CrawlerQueueItem } from '../components/import/CrawledCharacterCard';

const SAVE_CONCURRENCY = 4;

// Shared save/selection logic for any crawler-style review queue (browsing
// category pages, looking characters up by name, ...). Keeping this in one
// place avoids the two flows silently drifting apart, the way the bottom
// image tray's "add URL" option once did between the crawler and paste modes.
export function useCrawlerQueue() {
  const [queue, setQueue] = useState<CrawlerQueueItem[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const createCharacter = useCreateCharacter();

  function loadQueue(items: CrawlerQueueItem[], append = false) {
    setQueue((prev) => (append ? [...prev, ...items] : items));
  }

  function updateItem(id: string, updates: Partial<CrawlerQueueItem>) {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }

  function toggleSelectAll(selected: boolean) {
    setQueue((prev) => prev.map((item) => ({ ...item, isSelected: selected })));
  }

  function clearQueue() {
    setQueue([]);
  }

  async function saveItem(item: CrawlerQueueItem): Promise<boolean> {
    const trimmedName = item.name.trim();
    if (!trimmedName) {
      updateItem(item.id, { error: 'Name is required.', status: 'failed' });
      return false;
    }
    if (item.selectedImages.length === 0) {
      updateItem(item.id, { error: 'No images available to save.', status: 'failed' });
      return false;
    }

    try {
      updateItem(item.id, { error: undefined });
      await createCharacter.mutateAsync({
        name: trimmedName,
        categoryKey: item.categoryKey,
        labelIds: item.labelIds,
        images: item.selectedImages.map((url) => ({ url })),
      });
      updateItem(item.id, { status: 'imported', error: undefined });
      return true;
    } catch (err: unknown) {
      let message = 'Error saving character.';
      if (err instanceof ApiError) {
        message = err.message || `Server error (${err.status})`;
      } else if (err instanceof Error) {
        message = err.message;
      }
      updateItem(item.id, { error: message, status: 'failed' });
      return false;
    }
  }

  async function saveSelectedReady() {
    setIsSavingBatch(true);
    const readyItems = queue.filter(
      (item) =>
        item.isSelected && item.status === 'pending' && item.name.trim() && item.selectedImages.length > 0
    );

    for (let i = 0; i < readyItems.length; i += SAVE_CONCURRENCY) {
      const chunk = readyItems.slice(i, i + SAVE_CONCURRENCY);
      await Promise.all(chunk.map((item) => saveItem(item)));
    }
    setIsSavingBatch(false);
  }

  const allSelected = queue.length > 0 && queue.every((i) => i.isSelected);
  const someSelected = queue.some((i) => i.isSelected);
  const selectedCount = queue.filter((i) => i.isSelected).length;

  // Matches the readyItems filter in saveSelectedReady — a pending item with
  // no name or no images never actually gets attempted, so it must not be
  // counted as "ready" or the counter will never reach 0.
  const selectedReadyCount = queue.filter(
    (i) => i.isSelected && i.status === 'pending' && i.name.trim() && i.selectedImages.length > 0
  ).length;
  const stuckCount = queue.filter(
    (i) => i.status === 'pending' && (!i.name.trim() || i.selectedImages.length === 0)
  ).length;

  return {
    queue,
    isSavingBatch,
    loadQueue,
    updateItem,
    toggleSelectAll,
    clearQueue,
    saveSelectedReady,
    allSelected,
    someSelected,
    selectedCount,
    selectedReadyCount,
    stuckCount,
  };
}
