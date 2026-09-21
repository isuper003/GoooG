import { useState, useEffect, useRef } from 'react';
import type { Data18SearchResult } from '../../../shared/data18Types';
import { apiClient } from '../../lib/apiClient';
import { toProxiedImageUrl } from '../../lib/imageUrl';

interface EntitySearchBarProps {
  onSelectResult: (result: Data18SearchResult) => void;
  placeholder?: string;
  defaultType?: 'all' | 'performer' | 'studio' | 'series';
}

const TYPE_OPTIONS: { value: 'all' | 'performer' | 'studio' | 'series'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '🔍' },
  { value: 'performer', label: 'Performers', icon: '⭐' },
  { value: 'studio', label: 'Studios & Sites', icon: '🏢' },
  { value: 'series', label: 'Series', icon: '🎬' },
];

export default function EntitySearchBar({
  onSelectResult,
  placeholder = 'Search by performer, studio, site, or series...',
  defaultType = 'all',
}: EntitySearchBarProps) {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'performer' | 'studio' | 'series'>(defaultType);
  const [results, setResults] = useState<Data18SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.searchData18(trimmed, searchType);
        setResults(res.results || []);
        setIsOpen(true);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchType]);

  function handleSelect(item: Data18SearchResult) {
    setIsOpen(false);
    onSelectResult(item);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto flex flex-col gap-2.5">
      {/* Type Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSearchType(opt.value)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              searchType === opt.value
                ? 'bg-cyan-400 text-black shadow-md shadow-cyan-400/20'
                : 'bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <span>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 text-white/40 text-sm">
          🔍
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/15 bg-[#090d14]/90 backdrop-blur-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all shadow-inner"
        />

        {isLoading ? (
          <div className="absolute right-3.5 h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-3.5 text-white/40 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Dropdown Results */}
      {isOpen && (results.length > 0 || error || (query.trim().length >= 2 && !isLoading)) ? (
        <div className="absolute top-full z-50 mt-1.5 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#090d14]/95 backdrop-blur-2xl shadow-2xl">
          {error ? (
            <div className="p-4 text-center text-xs font-mono text-rose-400">
              {error}
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-white/50">
              No matches found for &quot;{query}&quot;.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06]">
              {results.map((item, idx) => (
                <button
                  key={`${item.url}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-white/[0.06] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail */}
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/50 flex items-center justify-center">
                      {item.avatarUrl ? (
                        <img
                          src={toProxiedImageUrl(item.avatarUrl)}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-sm">
                          {item.type === 'performer'
                            ? '⭐'
                            : item.type === 'studio'
                            ? '🏢'
                            : '🎬'}
                        </span>
                      )}
                    </div>

                    {/* Title & Type */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors truncate">
                          {item.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.2 text-[10px] font-mono font-semibold uppercase ${
                            item.type === 'performer'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : item.type === 'studio'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
                        {item.scenesCount ? (
                          <span>🎬 {item.scenesCount} Scenes</span>
                        ) : null}
                        {item.moviesCount ? (
                          <span>📼 {item.moviesCount} Movies</span>
                        ) : null}
                        {item.lastUpdate ? (
                          <span className="text-white/30 hidden sm:inline">
                            • {item.lastUpdate}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <span className="text-white/30 group-hover:text-cyan-400 transition-colors text-xs font-mono">
                    View →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
