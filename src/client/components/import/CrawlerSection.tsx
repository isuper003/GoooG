import { useState } from 'react';
import { apiClient, ApiError } from '../../lib/apiClient';
import { DEFAULT_CATEGORY_SOURCE_URLS } from '../../config/crawlerConfig';
import { useCreateCharacter, useCharacters } from '../../hooks/useCharacters';
import LabelMultiSelect from '../shared/LabelMultiSelect';
import BottomImageTray from './BottomImageTray';

export interface CrawlerQueueItem {
  id: string;
  name: string;
  avatarUrl?: string;
  categoryKey: 'trans' | 'sluts' | 'twinks';
  labelIds: number[];
  availableImages: string[];
  selectedImages: string[];
  status: 'pending' | 'imported' | 'failed';
  error?: string;
  isSelected: boolean;
}

const CATEGORY_OPTIONS: { value: 'trans' | 'sluts' | 'twinks'; label: string }[] = [
  { value: 'trans', label: 'Trans' },
  { value: 'sluts', label: 'Sluts' },
  { value: 'twinks', label: 'Twinks' },
];

export default function CrawlerSection() {
  const [activeCategory, setActiveCategory] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [queue, setQueue] = useState<CrawlerQueueItem[]>([]);

  const { data: allCharacters = [] } = useCharacters({});
  const createCharacter = useCreateCharacter();

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

      // Auto-select the first 6 gallery images; the rest stay browsable in the tray
      const queueItems: CrawlerQueueItem[] = response.items.map((item, idx) => ({
        id: `crawled-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        avatarUrl: item.avatarUrl || '',
        categoryKey: activeCategory,
        labelIds: [],
        availableImages: item.availableImages,
        selectedImages: item.availableImages.slice(0, 6),
        status: 'pending',
        isSelected: true,
      }));

      setQueue(queueItems);
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

  function handleUpdateQueueItem(id: string, updates: Partial<CrawlerQueueItem>) {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }

  function toggleSelectAll(selected: boolean) {
    setQueue((prev) => prev.map((item) => ({ ...item, isSelected: selected })));
  }

  function toggleSelectedImage(item: CrawlerQueueItem, url: string) {
    if (item.selectedImages.includes(url)) {
      handleUpdateQueueItem(item.id, { selectedImages: item.selectedImages.filter((u) => u !== url) });
    } else {
      if (item.selectedImages.length >= 6) return;
      handleUpdateQueueItem(item.id, { selectedImages: [...item.selectedImages, url] });
    }
  }

  function setPrimaryImage(item: CrawlerQueueItem, url: string) {
    const filtered = item.selectedImages.filter((u) => u !== url);
    handleUpdateQueueItem(item.id, { selectedImages: [url, ...filtered] });
  }

  function addAvailableImage(item: CrawlerQueueItem, url: string) {
    if (item.availableImages.includes(url)) return;
    const newAvail = [...item.availableImages, url];
    const newSelected =
      item.selectedImages.length < 6 ? [...item.selectedImages, url] : item.selectedImages;
    handleUpdateQueueItem(item.id, { availableImages: newAvail, selectedImages: newSelected });
  }

  function removeCandidateImage(item: CrawlerQueueItem, url: string) {
    handleUpdateQueueItem(item.id, {
      availableImages: item.availableImages.filter((u) => u !== url),
      selectedImages: item.selectedImages.filter((u) => u !== url),
    });
  }

  const SAVE_CONCURRENCY = 4;

  async function handleSaveQueueItem(item: CrawlerQueueItem): Promise<boolean> {
    const trimmedName = item.name.trim();
    if (!trimmedName) {
      handleUpdateQueueItem(item.id, { error: 'Name is required.', status: 'failed' });
      return false;
    }
    if (item.selectedImages.length === 0) {
      handleUpdateQueueItem(item.id, {
        error: 'No images available to save.',
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
        error: 'Error saving character.',
        status: 'failed',
      });
      return false;
    }
  }

  async function handleSaveSelectedReady() {
    setIsSavingBatch(true);
    const readyItems = queue.filter(
      (item) =>
        item.isSelected &&
        item.status === 'pending' &&
        item.name.trim() &&
        item.selectedImages.length > 0
    );

    for (let i = 0; i < readyItems.length; i += SAVE_CONCURRENCY) {
      const chunk = readyItems.slice(i, i + SAVE_CONCURRENCY);
      await Promise.all(chunk.map((item) => handleSaveQueueItem(item)));
    }
    setIsSavingBatch(false);
  }

  const allSelected = queue.length > 0 && queue.every((i) => i.isSelected);
  const someSelected = queue.some((i) => i.isSelected);
  const selectedCount = queue.filter((i) => i.isSelected).length;

  const selectedReadyCount = queue.filter(
    (i) => i.isSelected && i.status === 'pending' && i.name.trim() && i.selectedImages.length > 0
  ).length;

  const stuckCount = queue.filter(
    (i) => i.status === 'pending' && (!i.name.trim() || i.selectedImages.length === 0)
  ).length;


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
              className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-bold text-fg focus:outline-none focus:border-category-trans"
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

          {/* Master Checkbox & Selection Controls */}
          {queue.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-fg-dim">
                Selection ({selectedCount}/{queue.length})
              </label>
              <div className="flex items-center gap-2.5 bg-bg-muted rounded-button border border-bg-hover px-2.5 py-1.5 h-[38px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-fg select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-bg-hover accent-category-trans cursor-pointer"
                    title="Toggle all"
                  />
                  <span>All</span>
                </label>
                <div className="h-4 w-px bg-bg-hover" />
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className={`text-xs font-semibold transition-colors ${
                    allSelected ? 'text-category-trans' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className={`text-xs font-semibold transition-colors ${
                    !someSelected ? 'text-rose-400' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Start Fetching Button */}
        <button
          type="button"
          onClick={handleCrawl}
          disabled={isLoading || !currentTemplate.trim()}
          className="shrink-0 rounded-button bg-category-trans hover:opacity-90 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
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
            <h3 className="text-lg font-bold text-fg">Fetched Characters ({queue.length})</h3>
            <span className="text-sm text-fg-muted">
              {selectedReadyCount} selected &amp; ready to save
              {stuckCount > 0 ? ` · ${stuckCount} need images added` : ''}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {queue.map((item) => {
              const duplicate = allCharacters.find(
                (c) => c.categoryKey === item.categoryKey && c.name.trim().toLowerCase() === item.name.trim().toLowerCase()
              );
              
              return (
                <div
                  key={item.id}
                  className={`relative flex flex-col gap-3.5 p-4 rounded-card border shadow-sm transition-all ${
                    item.isSelected
                      ? 'border-bg-hover bg-bg-card hover:border-category-trans/50'
                      : 'border-bg-hover/50 bg-bg-card/50 opacity-60 hover:opacity-90'
                  }`}
                >
                  {/* Card Header Row: Checkbox, Profile Avatar, Name, Category Badge, Compact Labels Picker, and Status */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bg-muted/70 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox per character */}
                      <label
                        className="flex items-center cursor-pointer p-1"
                        title={item.isSelected ? 'Deselect character' : 'Select character'}
                      >
                        <input
                          type="checkbox"
                          checked={item.isSelected}
                          onChange={(e) => handleUpdateQueueItem(item.id, { isSelected: e.target.checked })}
                          className="w-5 h-5 rounded border-2 border-bg-hover accent-category-trans cursor-pointer transition-transform hover:scale-110"
                        />
                      </label>

                      {/* Avatar aligned with name */}
                      <div className="aspect-square w-14 h-14 rounded-card overflow-hidden border-2 border-bg-hover bg-bg-muted flex items-center justify-center shrink-0 shadow-sm">
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                        ) : (
                          <span className="text-2xl opacity-50">👤</span>
                        )}
                      </div>

                      {/* Name & Category Badge & Duplicate Warning */}
                      <div className="flex flex-col justify-center gap-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base sm:text-lg font-bold text-fg truncate" title={item.name}>
                            {item.name}
                          </h4>
                          <span
                            className={`rounded-badge px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              item.categoryKey === 'trans'
                                ? 'bg-category-trans/20 text-category-trans border border-category-trans/30'
                                : item.categoryKey === 'sluts'
                                ? 'bg-category-sluts/20 text-category-sluts border border-category-sluts/30'
                                : 'bg-category-twinks/20 text-category-twinks border border-category-twinks/30'
                            }`}
                          >
                            {item.categoryKey}
                          </span>
                        </div>
                        {duplicate ? (
                          <span className="text-[11px] text-amber-400">⚠️ Exists in {duplicate.categoryKey}</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Label Selector (compact tag-picker, no scrollbar) & Status */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-dim hidden sm:inline">
                          Labels:
                        </span>
                        <LabelMultiSelect
                          compact
                          selectedIds={item.labelIds}
                          onChange={(ids) => handleUpdateQueueItem(item.id, { labelIds: ids })}
                        />
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-1.5">
                        {item.status === 'imported' && (
                          <span className="rounded-badge bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                            ✓ Saved
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="rounded-badge bg-rose-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                            ✗ Failed
                          </span>
                        )}
                        {item.status === 'pending' && item.selectedImages.length === 0 && (
                          <span className="rounded-badge bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                            ⚠ No images
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {item.error && <span className="text-xs text-rose-400 px-1">{item.error}</span>}

                  {/* Horizontal album strip — 30% bigger, no scrollbar, no add URL */}
                  <BottomImageTray
                    availableImages={item.availableImages}
                    selectedImages={item.selectedImages}
                    onToggleImage={(url) => toggleSelectedImage(item, url)}
                    onSetPrimary={(url) => setPrimaryImage(item, url)}
                    onAddImage={(url) => addAvailableImage(item, url)}
                    onRemoveCandidate={(url) => removeCandidateImage(item, url)}
                    showAddUrl={false}
                  />
                </div>
              );
            })}
          </div>

          {/* Big Save Selected Button at the bottom */}
          <div className="mt-4 flex justify-center sticky bottom-4 z-20">
            <button
              type="button"
              onClick={handleSaveSelectedReady}
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

