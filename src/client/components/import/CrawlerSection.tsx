import { useState } from 'react';
import { apiClient, ApiError } from '../../lib/apiClient';
import { DEFAULT_CATEGORY_SOURCE_URLS } from '../../config/crawlerConfig';
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

export default function CrawlerSection() {
  const [activeCategory, setActiveCategory] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [page, setPage] = useState<number>(1);
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

  const currentTemplate = DEFAULT_CATEGORY_SOURCE_URLS[activeCategory] || '';

  async function handleCrawl() {
    setErrorMessage(null);
    if (!currentTemplate.trim()) {
      setErrorMessage(`No source URL is configured for ${activeCategory} in crawlerConfig.ts.`);
      return;
    }

    const urlToFetch = currentTemplate.includes('{page}')
      ? currentTemplate.replace(/\{page\}/g, String(page))
      : page > 1
      ? `${currentTemplate}${currentTemplate.includes('?') ? '&' : '?'}page=${page}`
      : currentTemplate;

    setIsLoading(true);

    try {
      const response = await apiClient.crawlUrl(urlToFetch, activeCategory);

      if (!response.items || response.items.length === 0) {
        setErrorMessage(`No characters found at ${urlToFetch}.`);
        setIsLoading(false);
        return;
      }

      // Auto-select the first 6 gallery images; for duplicates: deselect and display program images
      const queueItems: CrawlerQueueItem[] = response.items.map((item, idx) => {
        const duplicate = allCharacters.find(
          (c) =>
            c.categoryKey === activeCategory &&
            c.name.trim().toLowerCase() === item.name.trim().toLowerCase()
        );

        const isDuplicate = !!duplicate;
        const availableImages = duplicate
          ? duplicate.images.map((img) => img.url)
          : item.availableImages;

        return {
          id: `crawled-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.name,
          avatarUrl: duplicate?.images[0]?.url || item.avatarUrl || '',
          categoryKey: activeCategory,
          labelIds: duplicate ? duplicate.labels.map((l) => l.id) : [],
          availableImages,
          selectedImages: availableImages.slice(0, 6),
          status: 'pending',
          isSelected: !isDuplicate,
        };
      });

      loadQueue(queueItems);
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
      <div className="rounded-card border border-bg-hover bg-bg-card p-4 flex flex-wrap items-end justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Category Select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              Category
            </label>
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value as 'trans' | 'sluts' | 'twinks')}
              className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-bold text-fg focus:outline-none focus:border-accent"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Page Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
              Page
            </label>
            <div className="flex items-center gap-1 bg-bg-muted rounded-button border border-bg-hover px-1 py-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="rounded-button hover:bg-bg-hover px-2 py-1 text-xs font-bold text-fg disabled:opacity-40"
              >
                &minus;
              </button>
              <input
                type="number"
                min={1}
                value={page}
                onChange={(e) => setPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-12 bg-transparent text-center text-sm font-bold text-fg focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoading}
                className="rounded-button hover:bg-bg-hover px-2 py-1 text-xs font-bold text-fg disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          <QueueSelectionBar
            total={queue.length}
            selectedCount={selectedCount}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={toggleSelectAll}
          />
        </div>

        {/* Start Fetching Button */}
        <button
          type="button"
          onClick={handleCrawl}
          disabled={isLoading || !currentTemplate.trim()}
          className="shrink-0 rounded-button bg-accent hover:opacity-90 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="inline-block animate-spin">⟳</span>
              <span>Fetching...</span>
            </>
          ) : (
            <>
              <span>🚀 Start Fetching</span>
            </>
          )}
        </button>
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
            <h3 className="font-display text-xl font-semibold text-fg">Fetched Characters ({queue.length})</h3>
            <span className="font-mono text-xs text-fg-dim">
              {selectedReadyCount} selected &amp; ready to save
              {stuckCount > 0 ? ` · ${stuckCount} need images added` : ''}
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
