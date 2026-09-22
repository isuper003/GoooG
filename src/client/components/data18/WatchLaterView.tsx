import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useData18WatchLater,
  useUpdateWatchLaterItem,
  useToggleWatchLater,
  downloadWatchLaterBackup,
} from '../../hooks/useData18WatchLater';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import { movieHref, sceneHref, studioHref, performerHref } from '../../lib/data18Nav';
import WatchLaterImportModal from './WatchLaterImportModal';
import WatchSearchMenu from './WatchSearchMenu';
import type { Data18WatchLaterItem } from '../../../shared/data18Types';

interface WatchLaterViewProps {
  onZoomImage?: (url: string) => void;
}

export default function WatchLaterView({ onZoomImage }: WatchLaterViewProps) {
  const [filter, setFilter] = useState<'all' | 'unwatched' | 'watched'>('all');
  const [type, setType] = useState<'all' | 'scene' | 'movie'>('all');
  const [search, setSearch] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isPending, isError, error, refetch } = useData18WatchLater({
    filter,
    type,
    search: search.trim() || undefined,
  });

  const updateMutation = useUpdateWatchLaterItem();
  const toggleMutation = useToggleWatchLater();

  const handleToggleWatched = (item: Data18WatchLaterItem) => {
    updateMutation.mutate({
      id: item.id,
      patch: { isWatched: !item.isWatched },
    });
  };

  const handleRemove = (item: Data18WatchLaterItem) => {
    toggleMutation.mutate({ savedItem: item });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await downloadWatchLaterBackup();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  const stats = data?.stats ?? {
    total: 0,
    unwatched: 0,
    watched: 0,
    scenes: 0,
    movies: 0,
  };

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Header Statistics Card */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c121d] via-[#080d14] to-[#0b111e] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-2xl border border-cyan-400/30 text-cyan-300">
              🕒
            </span>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Watch Later Library</span>
                <span className="rounded-full bg-cyan-400/20 border border-cyan-400/30 px-2.5 py-0.5 text-xs font-mono text-cyan-300 font-bold">
                  {stats.total}
                </span>
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                Saved scenes and movies to watch, organize, or search on streaming video providers.
              </p>
            </div>
          </div>

          {/* Backup Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || stats.total === 0}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white/90 transition-all cursor-pointer disabled:opacity-40 active:scale-95 shadow-sm"
              title="Download full JSON backup of your saved list"
            >
              <span>{isExporting ? '⏳' : '📤'}</span>
              <span>{isExporting ? 'Exporting...' : 'Export Backup'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 hover:bg-cyan-500/25 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition-all cursor-pointer active:scale-95 shadow-sm"
              title="Restore or merge saved items from a backup JSON file"
            >
              <span>📥</span>
              <span>Import Backup</span>
            </button>
          </div>
        </div>

        {/* Quick Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-5 text-center">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-white/40 uppercase">Total Saved</div>
            <div className="mt-1 font-mono text-xl font-bold text-white">{stats.total}</div>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="text-[11px] font-mono text-cyan-300/60 uppercase">Unwatched</div>
            <div className="mt-1 font-mono text-xl font-bold text-cyan-300">{stats.unwatched}</div>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="text-[11px] font-mono text-emerald-300/60 uppercase">Watched</div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-400">{stats.watched}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-[11px] font-mono text-white/40 uppercase">Scenes 🎬</div>
            <div className="mt-1 font-mono text-xl font-bold text-white/80">{stats.scenes}</div>
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 col-span-2 sm:col-span-1">
            <div className="text-[11px] font-mono text-white/40 uppercase">Movies 📼</div>
            <div className="mt-1 font-mono text-xl font-bold text-white/80">{stats.movies}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0c121d]/80 p-3 backdrop-blur-md">
        {/* Type pills */}
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/5">
          {(
            [
              ['all', 'All Items'],
              ['scene', 'Scenes 🎬'],
              ['movie', 'Movies 📼'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setType(key)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                type === key ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/5">
          {(
            [
              ['all', 'All Status'],
              ['unwatched', 'Unwatched 🕒'],
              ['watched', 'Watched ✓'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                filter === key
                  ? key === 'watched'
                    ? 'bg-emerald-400 text-black shadow-sm'
                    : 'bg-cyan-400 text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px] flex-1 max-w-xs">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved titles or cast..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 pl-8 text-xs text-white placeholder:text-white/30 focus:border-cyan-400/60 focus:outline-none"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">🔍</span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main List Display */}
      {isPending ? (
        <div className="flex flex-col items-center justify-center p-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-cyan-400 border-t-transparent" />
          <p className="text-xs font-mono text-cyan-300 uppercase tracking-widest">Loading Watch Later...</p>
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-sm text-rose-300">
          <p className="font-bold">Failed to load saved items</p>
          <p className="text-xs mt-1 opacity-80">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-white/10 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] p-16 text-center">
          <span className="text-4xl mb-2">🕒</span>
          <h3 className="font-display text-lg font-bold text-white">No items found in Watch Later</h3>
          <p className="text-xs text-white/50 max-w-sm mt-1 mb-5">
            {search || filter !== 'all' || type !== 'all'
              ? 'No items match your active filters. Try changing or clearing filters.'
              : 'Browse scenes and movies on Data18, then click the 🕒 Watch Later icon on any card to save it here!'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              📥 Import Backup
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={`${item.itemType}-${item.itemId}`}
              className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-[#0c121d]/80 backdrop-blur-md transition-all duration-300 hover:shadow-xl ${
                item.isWatched
                  ? 'border-white/10 opacity-75 hover:opacity-100 hover:border-emerald-500/40'
                  : 'border-white/10 hover:border-cyan-400/40 hover:shadow-cyan-950/20'
              }`}
            >
              {/* Media Image container */}
              <div className="relative aspect-video w-full overflow-hidden bg-black/50">
                {item.imageUrl ? (
                  <img
                    src={toProxiedImageUrl(item.imageUrl)}
                    alt={item.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onClick={() => onZoomImage?.(item.imageUrl!)}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/20">
                    {item.itemType === 'scene' ? '🎬 No Preview' : '📼 No Cover'}
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c121d] via-transparent to-black/40" />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-mono font-bold uppercase shadow-sm ${
                      item.itemType === 'scene'
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/30'
                        : 'bg-amber-500/30 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {item.itemType === 'scene' ? 'Scene' : 'Movie'}
                  </span>

                  {/* Status toggle button */}
                  <button
                    type="button"
                    onClick={() => handleToggleWatched(item)}
                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-sm transition-all cursor-pointer active:scale-95 ${
                      item.isWatched
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/50'
                        : 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-500/50'
                    }`}
                    title={item.isWatched ? 'Click to mark as Unwatched' : 'Click to mark as Watched'}
                  >
                    <span>{item.isWatched ? '✓ Watched' : '🕒 Unwatched'}</span>
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-3.5 gap-2.5">
                <div>
                  {item.studio ? (
                    <div className="mb-1">
                      <Link
                        to={studioHref(item.studio.slug)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400/90 hover:text-rose-300 hover:underline transition-colors"
                      >
                        🏢 {item.studio.name}
                      </Link>
                    </div>
                  ) : null}

                  {/* Title Link */}
                  <h3 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2" title={item.title}>
                    <Link
                      to={item.itemType === 'scene' ? sceneHref(item.itemId) : movieHref(item.slug || item.itemId)}
                      className="text-white hover:text-cyan-300 transition-colors"
                    >
                      {item.title}
                    </Link>
                  </h3>
                </div>

                {/* Cast Chips */}
                {item.cast && item.cast.length > 0 ? (
                  <div className="flex flex-wrap gap-1 items-center border-t border-white/[0.06] pt-2">
                    {item.cast.slice(0, 3).map((c) => (
                      <Link
                        key={c.slug}
                        to={performerHref(c.slug)}
                        className="inline-flex items-center rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/80 hover:text-cyan-300 hover:bg-cyan-500/20 transition-all"
                      >
                        {c.name}
                      </Link>
                    ))}
                    {item.cast.length > 3 && (
                      <span className="text-[10px] font-mono text-white/40">+{item.cast.length - 3}</span>
                    )}
                  </div>
                ) : null}

                {/* Action Toolbar */}
                <div className="flex items-center justify-between gap-1.5 border-t border-white/[0.06] pt-2 mt-auto">
                  {/* Streaming Search Menu */}
                  <WatchSearchMenu
                    title={item.title}
                    studioName={item.studio?.name}
                    castNames={item.cast?.map((c) => c.name)}
                  />

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="rounded-lg p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove from Watch Later"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {isImportOpen && (
        <WatchLaterImportModal
          onClose={() => setIsImportOpen(false)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}
