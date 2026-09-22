import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { WATCH_SITES, cleanSearchTitle } from '../../config/watchSites';
import { apiClient, type ScrapedWatchVideo, type SiteScrapeStatus } from '../../lib/apiClient';
import { toProxiedImageUrl } from '../../lib/imageUrl';

interface WatchSearchMenuProps {
  title: string;
  movieTitle?: string;
  castNames?: string[];
  studioName?: string;
  variant?: 'card' | 'detail';
}

export interface SearchToken {
  id: string;
  type: 'scene_title' | 'movie_title' | 'studio' | 'cast';
  label: string;
  value: string;
  icon: string;
  badgeColor: string;
}

function WatchVideoCard({ video }: { video: ScrapedWatchVideo }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-400/40 transition-all duration-200">
      {/* Thumbnail Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/60">
        {!imgError && video.thumbUrl ? (
          <img
            src={toProxiedImageUrl(video.thumbUrl)}
            alt={video.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-white/5 to-white/[0.02] text-white/30">
            <span className="text-2xl">🎬</span>
            <span className="text-[10px] font-mono text-white/40">{video.siteName}</span>
          </div>
        )}

        {/* Duration Badge */}
        {video.duration ? (
          <span className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white/90 shadow">
            {video.duration}
          </span>
        ) : null}

        {/* Site Badge */}
        <span
          className={`absolute top-2 left-2 rounded-md border px-1.5 py-0.5 text-[10px] font-mono font-semibold backdrop-blur-md shadow ${video.badgeColor}`}
        >
          {video.siteName}
        </span>
      </div>

      {/* Info Container */}
      <div className="flex flex-1 flex-col justify-between p-3 gap-2.5">
        <div>
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            title={video.title}
            className="line-clamp-2 text-xs font-semibold text-white/90 hover:text-cyan-300 transition-colors"
          >
            {video.title}
          </a>
          <span className="mt-1 block text-[10px] font-mono text-white/40">{video.siteDomain}</span>
        </div>

        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/30 px-3 py-1.5 text-xs font-bold transition-all active:scale-95"
        >
          <span>▶</span>
          <span>Watch Now</span>
          <span className="text-[10px] opacity-70">↗</span>
        </a>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] animate-pulse">
      <div className="aspect-video w-full bg-white/5" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3.5 w-3/4 rounded bg-white/10" />
        <div className="h-2.5 w-1/3 rounded bg-white/5" />
        <div className="mt-2 h-7 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

function DraggableTokenChip({
  token,
  index,
  total,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveLeft,
  onMoveRight,
  onRemove,
}: {
  token: SearchToken;
  index: number;
  total: number;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group/chip relative flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold shadow-sm transition-all duration-150 select-none ${
        token.badgeColor
      } ${
        isDragging
          ? 'opacity-40 scale-95 ring-2 ring-cyan-400'
          : isDragOver
          ? 'ring-2 ring-cyan-300 border-cyan-400 scale-105'
          : 'hover:brightness-110'
      }`}
    >
      {/* Drag handle */}
      <span
        title="Drag to reorder"
        className="cursor-grab active:cursor-grabbing text-white/50 hover:text-white transition-colors"
      >
        ⠿
      </span>

      {/* Type Icon */}
      <span className="text-xs">{token.icon}</span>

      {/* Label */}
      <span className="max-w-[180px] sm:max-w-[240px] truncate" title={token.value}>
        {token.label}
      </span>

      {/* Nudge Buttons (for mobile or click-based reorder) */}
      <div className="flex items-center gap-0.5 ml-1 border-l border-white/15 pl-1">
        {index > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveLeft();
            }}
            title="Move left"
            className="rounded px-0.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            ‹
          </button>
        )}
        {index < total - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight();
            }}
            title="Move right"
            className="rounded px-0.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            ›
          </button>
        )}
      </div>

      {/* Remove Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove from search"
        className="ml-0.5 rounded-full p-0.5 text-white/50 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

export default function WatchSearchMenu({
  title,
  movieTitle,
  castNames,
  studioName,
  variant = 'detail',
}: WatchSearchMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scraped' | 'direct'>('scraped');
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  // Clean titles
  const cleanedSceneTitle = cleanSearchTitle(title);
  const cleanedMovieTitle = movieTitle ? cleanSearchTitle(movieTitle) : '';

  // 1. Build all available tokens from scene data
  const availableTokens: SearchToken[] = useMemo(() => {
    const list: SearchToken[] = [];

    if (cleanedSceneTitle) {
      list.push({
        id: 'scene_title',
        type: 'scene_title',
        label: cleanedSceneTitle,
        value: cleanedSceneTitle,
        icon: '🎞️',
        badgeColor: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300',
      });
    }

    if (cleanedMovieTitle && cleanedMovieTitle.toLowerCase() !== cleanedSceneTitle.toLowerCase()) {
      list.push({
        id: 'movie_title',
        type: 'movie_title',
        label: cleanedMovieTitle,
        value: cleanedMovieTitle,
        icon: '📼',
        badgeColor: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300',
      });
    }

    if (studioName && studioName.trim()) {
      list.push({
        id: 'studio',
        type: 'studio',
        label: studioName.trim(),
        value: studioName.trim(),
        icon: '🏢',
        badgeColor: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      });
    }

    if (castNames && castNames.length > 0) {
      castNames.forEach((name, idx) => {
        if (name && name.trim()) {
          list.push({
            id: `cast_${idx}`,
            type: 'cast',
            label: name.trim(),
            value: name.trim(),
            icon: '👤',
            badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
          });
        }
      });
    }

    return list;
  }, [cleanedSceneTitle, cleanedMovieTitle, studioName, castNames]);

  // 2. State for active ordered tokens
  const [activeTokens, setActiveTokens] = useState<SearchToken[]>(() => {
    return availableTokens.length > 0 ? [availableTokens[0]] : [];
  });

  // Extra user-typed keywords
  const [extraKeywords, setExtraKeywords] = useState('');

  // Drag & Drop tracking state
  const [draggedTokenIndex, setDraggedTokenIndex] = useState<number | null>(null);
  const [dragOverTokenIndex, setDragOverTokenIndex] = useState<number | null>(null);

  // Compute effective search query string from ordered tokens + extra keywords
  const effectiveQuery = useMemo(() => {
    const tokenParts = activeTokens.map((t) => t.value.trim()).filter(Boolean);
    if (extraKeywords.trim()) {
      tokenParts.push(extraKeywords.trim());
    }
    return tokenParts.join(' ').trim();
  }, [activeTokens, extraKeywords]);

  // Scraper state
  const [isLoadingScrape, setIsLoadingScrape] = useState(false);
  const [videos, setVideos] = useState<ScrapedWatchVideo[]>([]);
  const [siteStatuses, setSiteStatuses] = useState<SiteScrapeStatus[]>([]);
  const [hasScraped, setHasScraped] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const searchReqIdRef = useRef(0);

  // Execute scrape
  const fetchScrapeResults = useCallback(async (queryToSearch: string) => {
    const q = queryToSearch.trim();
    if (!q) return;

    const reqId = ++searchReqIdRef.current;
    setIsLoadingScrape(true);
    setScrapeError(null);

    try {
      const res = await apiClient.scrapeWatchVideos(q);
      if (reqId === searchReqIdRef.current) {
        setVideos(res.videos);
        setSiteStatuses(res.siteStatuses);
        setHasScraped(true);
      }
    } catch (err: unknown) {
      if (reqId === searchReqIdRef.current) {
        setScrapeError(err instanceof Error ? err.message : 'Failed to scrape watch results');
        setHasScraped(true);
      }
    } finally {
      if (reqId === searchReqIdRef.current) {
        setIsLoadingScrape(false);
      }
    }
  }, []);

  // When modal opens, auto-scrape if not done yet
  useEffect(() => {
    if (isOpen && !hasScraped) {
      const queryToRun = effectiveQuery || cleanedSceneTitle || title.trim();
      fetchScrapeResults(queryToRun);
    }
  }, [isOpen, hasScraped, effectiveQuery, cleanedSceneTitle, title, fetchScrapeResults]);

  // Lock body scroll and handle Escape key when modal is open
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Toggle token: add if absent, remove if present
  function toggleToken(token: SearchToken) {
    setActiveTokens((prev) => {
      const exists = prev.some((t) => t.id === token.id);
      if (exists) {
        return prev.filter((t) => t.id !== token.id);
      } else {
        return [...prev, token];
      }
    });
  }

  // Move token to new position
  function moveToken(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setActiveTokens((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev;
      }
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }

  function handleCopy() {
    const q = effectiveQuery || title.trim();
    if (!q) return;
    navigator.clipboard.writeText(q);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleManualSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = effectiveQuery || title.trim();
    fetchScrapeResults(q);
  }

  function handleOpenSite(buildUrl: (q: string) => string) {
    const queryToSearch = effectiveQuery || title.trim();
    const targetUrl = buildUrl(queryToSearch);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  }

  // Filtered videos based on selected site pill
  const filteredVideos =
    selectedSiteFilter === 'all'
      ? videos
      : videos.filter((v) => v.siteId === selectedSiteFilter);

  // Sites that yielded results
  const sitesWithResults = siteStatuses.filter((s) => s.count > 0);

  return (
    <>
      {/* Trigger Button */}
      {variant === 'card' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Search this scene on streaming sites"
          className="flex items-center gap-1.5 rounded-lg bg-black/75 hover:bg-cyan-500 hover:text-black border border-white/10 hover:border-cyan-400 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all shadow-md active:scale-95"
        >
          <span className="text-xs">🎬</span>
          <span>Watch</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Search this title on streaming sites"
          className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-3.5 py-1.5 text-xs font-bold text-cyan-300 transition-all shadow-sm active:scale-95"
        >
          <span className="text-sm">🎬</span>
          <span>Watch on Streaming Sites</span>
        </button>
      )}

      {/* Centered Modal rendered via Portal to escape any overflow:hidden clipping */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div
              className="relative w-full max-w-3xl max-h-[90vh] rounded-3xl border border-white/15 bg-[#0c121d] p-4 sm:p-6 shadow-2xl flex flex-col gap-3.5 text-white animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎬</span>
                    <h3 className="font-display text-lg font-bold text-white tracking-tight">
                      Watch on Streaming Sites
                    </h3>
                  </div>
                  <p className="text-xs text-white/50">
                    Live video results & direct search across 7 external streaming platforms
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                  title="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Token-Based Search Query Builder */}
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-3">
                {/* Section 1: Active Reorderable Chips in Search Bar */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white/50">
                    <span>Active Search Query (Drag ⠿ to Reorder):</span>
                    {activeTokens.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTokens([])}
                        className="hover:text-rose-300 transition-colors"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="min-h-[42px] flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 p-2">
                    {activeTokens.length === 0 ? (
                      <span className="text-xs text-white/30 italic">
                        No labels active. Click any label below to add it to your search query.
                      </span>
                    ) : (
                      activeTokens.map((token, index) => (
                        <DraggableTokenChip
                          key={token.id}
                          token={token}
                          index={index}
                          total={activeTokens.length}
                          isDragging={draggedTokenIndex === index}
                          isDragOver={dragOverTokenIndex === index}
                          onDragStart={(e) => {
                            setDraggedTokenIndex(index);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', String(index));
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverTokenIndex !== index) {
                              setDragOverTokenIndex(index);
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedTokenIndex !== null && draggedTokenIndex !== index) {
                              moveToken(draggedTokenIndex, index);
                            }
                            setDraggedTokenIndex(null);
                            setDragOverTokenIndex(null);
                          }}
                          onDragEnd={() => {
                            setDraggedTokenIndex(null);
                            setDragOverTokenIndex(null);
                          }}
                          onMoveLeft={() => moveToken(index, index - 1)}
                          onMoveRight={() => moveToken(index, index + 1)}
                          onRemove={() => toggleToken(token)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Section 2: Extra Keywords Input + Action Buttons */}
                <form onSubmit={handleManualSearchSubmit} className="flex items-center gap-2 pt-0.5">
                  <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-3 py-1.5 focus-within:border-cyan-400/50">
                    <span className="text-white/40 text-xs">🔍</span>
                    <input
                      type="text"
                      value={extraKeywords}
                      onChange={(e) => setExtraKeywords(e.target.value)}
                      placeholder="Type extra keywords (e.g. 1080p, uncut)..."
                      className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none font-medium"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy full search query"
                    className="shrink-0 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-mono font-semibold text-white/80 transition-all"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>

                  <button
                    type="submit"
                    disabled={isLoadingScrape || (!effectiveQuery && !title.trim())}
                    className="shrink-0 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black px-4 py-2 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                  >
                    {isLoadingScrape ? (
                      <>
                        <span className="inline-block animate-spin text-xs">⏳</span>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <span>Search</span>
                        <span className="text-[10px]">↗</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Section 3: Available Labels (Click to Add / Remove) */}
                <div className="flex flex-col gap-1 pt-1 border-t border-white/5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">
                    Available Labels (Click to Toggle On / Off):
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {availableTokens.map((token) => {
                      const isSelected = activeTokens.some((t) => t.id === token.id);
                      return (
                        <button
                          key={token.id}
                          type="button"
                          onClick={() => toggleToken(token)}
                          className={`group flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all active:scale-95 ${
                            isSelected
                              ? `${token.badgeColor} shadow-sm ring-1 ring-white/20`
                              : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.07] hover:border-white/20'
                          }`}
                        >
                          <span className="text-xs">{token.icon}</span>
                          <span className="max-w-[160px] truncate" title={token.value}>
                            {token.label}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              isSelected ? 'text-cyan-300' : 'text-white/30 group-hover:text-white/70'
                            }`}
                          >
                            {isSelected ? '✓' : '+'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 4: Resulting Search String Preview */}
                {effectiveQuery ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/40 pt-0.5 truncate">
                    <span className="shrink-0 text-white/30">Query Preview:</span>
                    <span className="text-cyan-300/80 truncate font-semibold">
                      &quot;{effectiveQuery}&quot;
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('scraped')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'scraped'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  <span>🎯 Top 3 Results</span>
                  {videos.length > 0 && (
                    <span className="rounded-full bg-cyan-500/30 px-1.5 py-0.2 text-[10px] font-mono text-cyan-200">
                      {videos.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('direct')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    activeTab === 'direct'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  <span>🌐 Direct Site Links</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] font-mono text-white/60">
                    {WATCH_SITES.length}
                  </span>
                </button>
              </div>

              {/* Tab Content 1: Scraped Video Cards */}
              {activeTab === 'scraped' && (
                <div className="flex flex-1 flex-col overflow-hidden min-h-[260px]">
                  {/* Site Filter Pills */}
                  {!isLoadingScrape && sitesWithResults.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px] font-mono scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedSiteFilter('all')}
                        className={`rounded-lg px-2 py-0.5 transition-colors shrink-0 ${
                          selectedSiteFilter === 'all'
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : 'bg-white/5 text-white/60 hover:text-white'
                        }`}
                      >
                        All ({videos.length})
                      </button>
                      {sitesWithResults.map((s) => (
                        <button
                          key={s.siteId}
                          type="button"
                          onClick={() => setSelectedSiteFilter(s.siteId)}
                          className={`rounded-lg px-2 py-0.5 transition-colors shrink-0 ${
                            selectedSiteFilter === s.siteId
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-white/5 text-white/60 hover:text-white'
                          }`}
                        >
                          {s.siteName} ({s.count})
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto pr-1">
                    {isLoadingScrape ? (
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-center gap-2 py-3 text-xs text-cyan-300/80 font-mono">
                          <span className="inline-block animate-spin text-sm">⏳</span>
                          <span>Searching 7 streaming sites for top 3 matches...</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <SkeletonCard />
                          <SkeletonCard />
                          <SkeletonCard />
                          <SkeletonCard />
                          <SkeletonCard />
                          <SkeletonCard />
                        </div>
                      </div>
                    ) : scrapeError ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                        <span className="text-2xl">⚠️</span>
                        <p className="text-sm font-semibold text-rose-300">{scrapeError}</p>
                        <button
                          type="button"
                          onClick={() => fetchScrapeResults(effectiveQuery || title.trim())}
                          className="mt-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                        >
                          Retry Search
                        </button>
                      </div>
                    ) : filteredVideos.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pb-2">
                        {filteredVideos.map((video) => (
                          <WatchVideoCard key={video.id} video={video} />
                        ))}
                      </div>
                    ) : hasScraped ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <span className="text-3xl">🔍</span>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <p className="text-sm font-bold text-white">No direct video results found</p>
                          <p className="text-xs text-white/50">
                            Try rearranging the labels, toggling off specific words, or click &quot;Direct Site Links&quot; to search on the sites directly.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('direct')}
                          className="rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 px-3.5 py-1.5 text-xs font-semibold transition-all"
                        >
                          Switch to Direct Site Links ↗
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Status Bar / Sites Summary */}
                  {!isLoadingScrape && siteStatuses.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-white/40">
                      <span>Found {videos.length} videos across {sitesWithResults.length} sites</span>
                      <button
                        type="button"
                        onClick={() => fetchScrapeResults(effectiveQuery || title.trim())}
                        className="hover:text-cyan-300 transition-colors"
                      >
                        ↻ Refresh results
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 2: Direct Site Links (7 Sites) */}
              {activeTab === 'direct' && (
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto max-h-[50vh] pr-1">
                  <p className="text-xs text-white/60 mb-1">
                    Click any site to execute an external search in a new tab using the query:{' '}
                    <span className="font-mono text-cyan-300">&quot;{effectiveQuery || title.trim()}&quot;</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {WATCH_SITES.map((site) => {
                      const siteStatus = siteStatuses.find((s) => s.siteId === site.id);
                      return (
                        <button
                          key={site.id}
                          type="button"
                          onClick={() => handleOpenSite(site.buildSearchUrl)}
                          className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-cyan-400/40 p-3 text-left transition-all active:scale-[0.99]"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {site.name}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-semibold border ${site.badgeColor}`}
                              >
                                {site.domain}
                              </span>
                            </div>
                            {siteStatus && (
                              <span className="text-[10px] font-mono text-white/40">
                                {siteStatus.count > 0
                                  ? `${siteStatus.count} results scraped`
                                  : siteStatus.status === 'timeout'
                                  ? 'Timed out'
                                  : siteStatus.status === 'error'
                                  ? 'Error connecting'
                                  : '0 direct results'}
                              </span>
                            )}
                          </div>

                          <span className="text-white/40 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all text-xs font-mono font-semibold">
                            Open ↗
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Note */}
              <div className="border-t border-white/10 pt-2.5 flex items-center justify-between text-xs text-white/40 font-mono">
                <span>External links open in a new tab</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1 text-white font-sans text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
