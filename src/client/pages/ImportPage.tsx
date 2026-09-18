import { useMemo, useState } from 'react';
import { useCharacters, useCreateCharacter } from '../hooks/useCharacters';
import LabelMultiSelect from '../components/shared/LabelMultiSelect';
import ImageUrlListEditor from '../components/shared/ImageUrlListEditor';
import CrawlerSection from '../components/import/CrawlerSection';
import BatchInputSection from '../components/import/BatchInputSection';
import RowByRowReviewer, { type QueueItem } from '../components/import/RowByRowReviewer';

const CATEGORY_OPTIONS: { value: 'trans' | 'sluts' | 'twinks'; label: string }[] = [
  { value: 'trans', label: 'Trans' },
  { value: 'sluts', label: 'Sluts' },
  { value: 'twinks', label: 'Twinks' },
];

export default function ImportPage() {
  const [importMode, setImportMode] = useState<'crawler' | 'batch' | 'manual'>('crawler');

  // Single manual form state
  const [name, setName] = useState('');
  const [categoryKey, setCategoryKey] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  // Reviewer Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);

  const createCharacter = useCreateCharacter();
  const { data: allCharacters = [] } = useCharacters({});

  const duplicateWarning = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    const duplicate = allCharacters.find(
      (c) => c.categoryKey === categoryKey && c.name.trim().toLowerCase() === trimmed
    );
    return duplicate ? `A character named "${duplicate.name}" already exists in this category.` : null;
  }, [allCharacters, name, categoryKey]);

  function resetManualForm() {
    setName('');
    setLabelIds([]);
    setImages([]);
  }

  async function handleManualSubmit() {
    const trimmedName = name.trim();
    setManualSuccess(null);
    if (!trimmedName) {
      setManualError('Name is required.');
      return;
    }
    if (images.length === 0) {
      setManualError('At least 1 image URL is required.');
      return;
    }
    try {
      setManualError(null);
      const created = await createCharacter.mutateAsync({
        name: trimmedName,
        categoryKey,
        labelIds,
        images: images.map((url) => ({ url })),
      });
      setManualSuccess(`"${created.name}" was added successfully.`);
      resetManualForm();
    } catch {
      setManualError('Could not create this character. Please try again.');
    }
  }

  // Queue actions
  function handleLoadQueue(newItems: QueueItem[], append = false) {
    if (append) {
      setQueue((prev) => [...prev, ...newItems]);
    } else {
      setQueue(newItems);
    }
  }

  function handleUpdateQueueItem(id: string, updates: Partial<QueueItem>) {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  async function handleSaveQueueItem(item: QueueItem): Promise<boolean> {
    const trimmedName = item.name.trim();
    if (!trimmedName) {
      handleUpdateQueueItem(item.id, { error: 'Name is required.', status: 'failed' });
      return false;
    }
    if (item.selectedImages.length === 0) {
      handleUpdateQueueItem(item.id, {
        error: 'Select at least 1 image for this character in the bottom tray.',
        status: 'failed',
      });
      return false;
    }

    try {
      handleUpdateQueueItem(item.id, { error: undefined });
      await createCharacter.mutateAsync({
        name: trimmedName,
        categoryKey: item.categoryKey,
        labelIds: item.labelIds,
        images: item.selectedImages.map((url) => ({ url })),
      });
      handleUpdateQueueItem(item.id, { status: 'imported', error: undefined });
      return true;
    } catch {
      handleUpdateQueueItem(item.id, {
        error: 'Server error saving character. Please retry.',
        status: 'failed',
      });
      return false;
    }
  }

  const SAVE_CONCURRENCY = 4;

  async function handleSaveAllReady() {
    setIsSavingBatch(true);
    const readyItems = queue.filter(
      (item) => item.status === 'pending' && item.name.trim() && item.selectedImages.length > 0
    );

    // Save in small concurrent batches instead of one request at a time,
    // so a large batch doesn't wait on N sequential network round-trips.
    for (let i = 0; i < readyItems.length; i += SAVE_CONCURRENCY) {
      const chunk = readyItems.slice(i, i + SAVE_CONCURRENCY);
      await Promise.all(chunk.map((item) => handleSaveQueueItem(item)));
    }
    setIsSavingBatch(false);
  }

  function handleClearQueue() {
    setQueue([]);
  }

  return (
    <div className="space-y-6">
      {/* Header & Modes */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-fg">Character Importer &amp; Crawler</h1>
          <p className="text-fg-muted mt-1">
            Crawl target category URLs and bulk-save the results, paste text/JSON for a row-by-row review with a
            candidate image tray, or add a single character manually.
          </p>
        </div>

        {/* Mode Buttons */}
        <div className="flex items-center rounded-button bg-bg-card border border-bg-hover p-1">
          <button
            type="button"
            onClick={() => setImportMode('crawler')}
            className={`rounded-button px-3.5 py-1.5 text-xs font-semibold transition-all ${
              importMode === 'crawler'
                ? 'bg-category-trans text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            🌐 Web Crawler
          </button>
          <button
            type="button"
            onClick={() => setImportMode('batch')}
            className={`rounded-button px-3.5 py-1.5 text-xs font-semibold transition-all ${
              importMode === 'batch'
                ? 'bg-category-trans text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            📋 Paste Text/JSON
          </button>
          <button
            type="button"
            onClick={() => setImportMode('manual')}
            className={`rounded-button px-3.5 py-1.5 text-xs font-semibold transition-all ${
              importMode === 'manual'
                ? 'bg-category-trans text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            ✍ Single Manual Add
          </button>
        </div>
      </div>

      {/* MODE 1: Web Crawler */}
      {importMode === 'crawler' ? (
        <CrawlerSection />
      ) : null}

      {/* MODE 2: Batch Text / JSON Input */}
      {importMode === 'batch' ? (
        <div className="flex flex-col gap-6">
          <BatchInputSection onLoadQueue={handleLoadQueue} />

          {queue.length > 0 ? (
            <RowByRowReviewer
              queue={queue}
              allCharacters={allCharacters}
              onUpdateItem={handleUpdateQueueItem}
              onSaveItem={handleSaveQueueItem}
              onSaveAllReady={handleSaveAllReady}
              onClearQueue={handleClearQueue}
              isSavingBatch={isSavingBatch}
            />
          ) : null}
        </div>
      ) : null}

      {/* MODE 3: Single Manual Form */}
      {importMode === 'manual' ? (
        <div className="max-w-xl rounded-card border border-bg-hover bg-bg-card p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Character Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Character Name"
              className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg"
            />
            {duplicateWarning ? (
              <span className="text-xs text-amber-400">{duplicateWarning}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Category
            </label>
            <select
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value as 'trans' | 'sluts' | 'twinks')}
              className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Labels
            </label>
            <LabelMultiSelect selectedIds={labelIds} onChange={setLabelIds} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Images (1&ndash;6 URLs)
            </label>
            <ImageUrlListEditor value={images} onChange={setImages} />
          </div>

          {manualError ? (
            <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
              {manualError}
            </div>
          ) : null}
          {manualSuccess ? (
            <div className="rounded-button bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">
              {manualSuccess}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={createCharacter.isPending}
            className="rounded-button bg-category-trans px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createCharacter.isPending ? 'Adding...' : 'Add character'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
