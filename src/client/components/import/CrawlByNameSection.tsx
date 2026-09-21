import { useState } from 'react';
import { apiClient, ApiError } from '../../lib/apiClient';
import { useCharacters } from '../../hooks/useCharacters';
import { useCrawlerQueue } from '../../hooks/useCrawlerQueue';
import type { CrawlerQueueItem } from './CrawledCharacterCard';
import CrawledCharacterCard from './CrawledCharacterCard';
import QueueSelectionBar from './QueueSelectionBar';

const CATEGORY_OPTIONS: { value: 'trans' | 'sluts' | 'twinks'; label: string }[] = [
  { value: 'trans', label: 'Trans' },
  { value: 'sluts', label: 'Sluts' },
  { value: 'twinks', label: 'Twinks' },
];

export default function CrawlByNameSection() {
  const [namesText, setNamesText] = useState('');
  const [category, setCategory] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: allCharacters = [] } = useCharacters({});
  const {
    queue,
    isSavingBatch,
    loadQueue,
    updateItem,
    toggleSelectAll,
    saveSelectedReady,
    allSelected,
    someSelected,
    selectedCount,
    selectedReadyCount,
    stuckCount,
  } = useCrawlerQueue();

  async function handleCrawl() {
    setErrorMessage(null);
    const names = namesText
      .split(/\r?\n/)
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) {
      setErrorMessage('Enter at least one character name, one per line.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.crawlByNames(names, category);

      if (!response.items || response.items.length === 0) {
        setErrorMessage('No characters found.');
        setIsLoading(false);
        return;
      }

      const queueItems: CrawlerQueueItem[] = response.items.map((item, idx) => {
        const duplicate = allCharacters.find(
          (c) =>
            c.categoryKey === category &&
            c.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );

        const isDuplicate = !!duplicate;
        const availableImages = duplicate
          ? duplicate.images.map((img) => img.url)
          : item.availableImages;

        return {
          id: `byname-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.name,
          avatarUrl: duplicate?.images[0]?.url || item.avatarUrl || '',
          categoryKey: category,
          labelIds: duplicate ? duplicate.labels.map((l) => l.id) : [],
          availableImages,
          galleries: duplicate ? undefined : item.galleries,
          selectedImages: availableImages.slice(0, 6),
          status: 'pending',
          isSelected: !isDuplicate,
        };
      });

      loadQueue(queueItems, true);
      setNamesText('');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(`Crawl error (${err.status}): ${err.message}`);
      } else {
        setErrorMessage(err instanceof Error ? err.message : 'Unknown crawl error.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar */}
      <div className="rounded-card border border-bg-hover bg-bg-card p-4 flex flex-col gap-4 shadow-sm">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
            Targeted Investigation
          </span>
          <h2 className="font-display text-xl font-semibold text-fg mt-0.5">🔎 Lookup by Character Name</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Paste one character name per line &mdash; each one is looked up directly on their own profile
            page for the real avatar and photo album.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex flex-col gap-1.5 flex-1 w-full">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              Names (one per line)
            </label>
            <textarea
              rows={4}
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              placeholder={'Angela White\nAbella Danger\nRiley Reid'}
              className="w-full rounded-button border border-bg-hover bg-bg-muted p-3 font-mono text-xs text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as 'trans' | 'sluts' | 'twinks')}
              className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-bold text-fg focus:outline-none focus:border-accent"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCrawl}
            disabled={isLoading || !namesText.trim()}
            className="shrink-0 rounded-button bg-accent hover:opacity-90 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="inline-block animate-spin">⟳</span>
                <span>Fetching...</span>
              </>
            ) : (
              <>
                <span>🔎 Crawl Names</span>
              </>
            )}
          </button>
        </div>

        <QueueSelectionBar
          total={queue.length}
          selectedCount={selectedCount}
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleAll={toggleSelectAll}
        />
      </div>

      {errorMessage && (
        <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Results List */}
      {queue.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display text-xl font-semibold text-fg">Looked Up Characters ({queue.length})</h3>
            <span className="font-mono text-xs text-fg-dim">
              {selectedReadyCount} selected &amp; ready to save
              {stuckCount > 0 ? ` · ${stuckCount} not found or need images added` : ''}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {queue.map((item) => {
              const duplicate = allCharacters.find(
                (c) =>
                  c.categoryKey === item.categoryKey &&
                  c.name.trim().toLowerCase() === item.name.trim().toLowerCase()
              );

              return (
                <CrawledCharacterCard
                  key={item.id}
                  item={item}
                  duplicate={duplicate}
                  onUpdate={(updates) => updateItem(item.id, updates)}
                />
              );
            })}
          </div>

          {/* Big Save Selected Button at the bottom */}
          <div className="mt-4 flex justify-center sticky bottom-4 z-20">
            <button
              type="button"
              onClick={saveSelectedReady}
              disabled={isSavingBatch || selectedReadyCount === 0}
              className="rounded-full bg-emerald-600 hover:bg-emerald-500 px-10 py-4 text-base font-bold text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
            >
              {isSavingBatch ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>💾 Save Selected Characters ({selectedReadyCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
