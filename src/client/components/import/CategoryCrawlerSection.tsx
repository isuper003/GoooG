import { useState, useEffect } from 'react';
import { apiClient, ApiError } from '../../lib/apiClient';
import { DEFAULT_CATEGORY_SOURCE_URLS } from '../../config/crawlerConfig';
import type { QueueItem } from './RowByRowReviewer';

interface CategoryCrawlerSectionProps {
  onLoadQueue: (items: QueueItem[], append?: boolean) => void;
}

const CATEGORY_TABS: {
  key: 'trans' | 'sluts' | 'twinks';
  label: string;
  activeClass: string;
  idleClass: string;
  badgeClass: string;
}[] = [
  {
    key: 'trans',
    label: 'Trans Category',
    activeClass: 'bg-category-trans text-white ring-2 ring-category-trans/50 shadow-md',
    idleClass: 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg',
    badgeClass: 'bg-category-trans/20 text-category-trans',
  },
  {
    key: 'sluts',
    label: 'Sluts Category',
    activeClass: 'bg-category-sluts text-white ring-2 ring-category-sluts/50 shadow-md',
    idleClass: 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg',
    badgeClass: 'bg-category-sluts/20 text-category-sluts',
  },
  {
    key: 'twinks',
    label: 'Twinks Category',
    activeClass: 'bg-category-twinks text-white ring-2 ring-category-twinks/50 shadow-md',
    idleClass: 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg',
    badgeClass: 'bg-category-twinks/20 text-category-twinks',
  },
];

export default function CategoryCrawlerSection({ onLoadQueue }: CategoryCrawlerSectionProps) {
  const [activeCategory, setActiveCategory] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [urls, setUrls] = useState<Record<'trans' | 'sluts' | 'twinks', string>>(() => {
    const saved = localStorage.getItem('crawler_category_urls');
    if (saved) {
      try {
        return { ...DEFAULT_CATEGORY_SOURCE_URLS, ...JSON.parse(saved) };
      } catch {
        // use defaults
      }
    }
    return DEFAULT_CATEGORY_SOURCE_URLS;
  });

  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save URLs to localStorage whenever modified
  useEffect(() => {
    localStorage.setItem('crawler_category_urls', JSON.stringify(urls));
  }, [urls]);

  const currentTemplate = urls[activeCategory] || '';
  const computedUrl = currentTemplate.includes('{page}')
    ? currentTemplate.replace(/\{page\}/g, String(page))
    : page > 1
    ? `${currentTemplate}${currentTemplate.includes('?') ? '&' : '?'}page=${page}`
    : currentTemplate;

  function updateActiveUrl(newUrl: string) {
    setUrls((prev) => ({
      ...prev,
      [activeCategory]: newUrl,
    }));
  }

  async function handleCrawl(targetPage = page, append = false) {
    setErrorMessage(null);
    setStatusMessage(null);

    const templateToUse = urls[activeCategory];
    if (!templateToUse || !templateToUse.trim()) {
      setErrorMessage(`Please configure the URL variable for ${activeCategory}.`);
      return;
    }

    const urlToFetch = templateToUse.includes('{page}')
      ? templateToUse.replace(/\{page\}/g, String(targetPage))
      : targetPage > 1
      ? `${templateToUse}${templateToUse.includes('?') ? '&' : '?'}page=${targetPage}`
      : templateToUse;

    setIsLoading(true);

    try {
      const response = await apiClient.crawlUrl(urlToFetch, activeCategory);

      if (!response.items || response.items.length === 0) {
        setErrorMessage(
          `No characters found at ${urlToFetch}. Ensure the page is accessible and contains character cards/galleries.`
        );
        setIsLoading(false);
        return;
      }

      // The profile avatar is shown next to the character's name only — it is
      // never selectable, never shown in the bottom candidate tray, and never
      // saved as one of the character's images.
      const queueItems: QueueItem[] = response.items.map((item, idx) => ({
        id: `crawled-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        avatarUrl: item.avatarUrl || '',
        categoryKey: activeCategory,
        labelIds: [],
        availableImages: item.availableImages,
        selectedImages: item.availableImages.slice(0, 6),
        status: 'pending',
      }));

      setStatusMessage(
        `✓ Extracted ${queueItems.length} characters from Page ${targetPage} for [${activeCategory.toUpperCase()}]!`
      );

      onLoadQueue(queueItems, append);
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
    <div className="rounded-card border border-bg-hover bg-bg-card p-6 flex flex-col gap-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-fg flex items-center gap-2">
          <span>🌐 Category Web Crawler</span>
          <span className="text-xs font-normal px-2 py-0.5 rounded-badge bg-bg-muted text-fg-muted">
            Auto-Scraper & Reviewer
          </span>
        </h2>
        <p className="text-xs text-fg-muted mt-0.5">
          Select a category button, configure the target URL template, and crawl pages directly into the review queue.
        </p>
      </div>

      {/* 3 Main Category Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {CATEGORY_TABS.map((tab) => {
          const isSelected = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveCategory(tab.key);
                setErrorMessage(null);
                setStatusMessage(null);
              }}
              className={`rounded-button py-3 px-3 text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                isSelected ? tab.activeClass : tab.idleClass
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-normal px-2 py-0.2 rounded-badge ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-bg-card text-fg-dim'
                }`}
              >
                Key: {tab.key}
              </span>
            </button>
          );
        })}
      </div>

      {/* URL Variable and Page Controls */}
      <div className="flex flex-col gap-3 rounded-button bg-bg-muted/50 border border-bg-hover p-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              URL Variable for [{activeCategory.toUpperCase()}]
            </label>
            <span className="text-[11px] text-fg-dim">
              Tip: Use <code className="text-category-trans">{"{page}"}</code> for page number
            </span>
          </div>

          <input
            value={currentTemplate}
            onChange={(e) => updateActiveUrl(e.target.value)}
            placeholder={`https://example.com/${activeCategory}/?page={page}`}
            className="rounded-button border border-bg-hover bg-bg-card px-3 py-2 text-xs font-mono text-fg focus:border-category-trans focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-bg-hover">
          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-fg-dim">Page Number:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="rounded-button bg-bg-card hover:bg-bg-hover px-2.5 py-1 text-xs font-bold text-fg disabled:opacity-40"
              >
                &minus;
              </button>
              <input
                type="number"
                min={1}
                value={page}
                onChange={(e) => setPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 rounded-button border border-bg-hover bg-bg-card px-2 py-1 text-center text-xs font-bold text-fg focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={isLoading}
                className="rounded-button bg-bg-card hover:bg-bg-hover px-2.5 py-1 text-xs font-bold text-fg disabled:opacity-40"
              >
                +
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-fg-dim ml-2 truncate max-w-xs">
              <span>Target:</span>
              <span className="font-mono truncate text-fg-muted">{computedUrl}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCrawl(page, false)}
              disabled={isLoading || !currentTemplate.trim()}
              className="rounded-button bg-category-trans hover:opacity-90 px-4 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin">⟳</span>
                  <span>Crawling Page {page}...</span>
                </>
              ) : (
                <>
                  <span>🚀 Crawl Page {page}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                handleCrawl(nextPage, true);
              }}
              disabled={isLoading || !currentTemplate.trim()}
              className="rounded-button bg-bg-card hover:bg-bg-hover px-3 py-2 text-xs font-semibold text-fg transition-all disabled:opacity-50"
              title="Crawl next page and append to current queue"
            >
              + Next Page &amp; Append
            </button>
          </div>
        </div>
      </div>

      {statusMessage ? (
        <div className="rounded-button bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 flex items-center justify-between">
          <span>{statusMessage}</span>
          <span className="text-[11px] text-emerald-400 font-semibold">Review below ↓</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
