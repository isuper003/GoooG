import { useState } from 'react';
import type { Data18EntityDetail } from '../../../shared/data18Types';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import SceneCard from './SceneCard';
import MovieCard from './MovieCard';
import Pager from './Pager';
import PerformerAvatar from './PerformerAvatar';
import PerformerExtraPanel from './PerformerExtraPanel';
import PornPicsPanel from './PornPicsPanel';
import AddToCharactersModal from './AddToCharactersModal';
import FavoriteButton from './FavoriteButton';

interface EntityDetailViewProps {
  entity: Data18EntityDetail;
  /** True while another page of this entity is loading. */
  isPageLoading?: boolean;
  tab: 'scenes' | 'movies';
  onTabChange: (tab: 'scenes' | 'movies') => void;
  onBack: () => void;
  onPageChange: (page: number) => void;
  onZoomImage?: (url: string) => void;
}

/** Remount with `key={entity.slug}` so the active tab resets when switching entity. */
export default function EntityDetailView({
  entity,
  isPageLoading = false,
  tab: activeTab,
  onTabChange,
  onBack,
  onPageChange,
  onZoomImage,
}: EntityDetailViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  const pager = (
    <Pager
      page={entity.page}
      totalPages={entity.totalPages}
      isLoading={isPageLoading}
      accent={activeTab === 'movies' ? 'amber' : 'cyan'}
      onChange={(p) => {
        onPageChange(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    />
  );

  const typeColorMap = {
    performer: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    studio: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    site: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    network: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    series: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer"
        >
          <span>←</span>
          <span>Back</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c121d] to-[#080d14] p-6 sm:p-8 shadow-2xl">
        {/* Glow */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar / Logo */}
          <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-white/15 bg-black/60 shadow-xl">
            {entity.type === 'performer' ? (
              <PerformerAvatar
                slug={entity.slug}
                name={entity.name}
                className="h-full w-full object-cover text-3xl"
              />
            ) : entity.avatarUrl ? (
              <img
                src={toProxiedImageUrl(entity.avatarUrl)}
                alt={entity.name}
                onClick={() => onZoomImage?.(entity.avatarUrl!)}
                className="h-full w-full object-cover cursor-zoom-in"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl">
                🏢
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-mono font-bold uppercase border ${
                  typeColorMap[entity.type] || 'bg-white/10 text-white border-white/20'
                }`}
              >
                {entity.type}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
              {entity.name}
            </h1>

            {/* Stats Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-1 text-xs font-mono text-cyan-300">
                🎬 <b>{(entity.scenesCount ?? entity.scenes.length).toLocaleString()}</b> Scenes
              </span>
              <span className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-1 text-xs font-mono text-amber-300">
                📼 <b>{(entity.moviesCount ?? entity.movies.length).toLocaleString()}</b> Movies
              </span>
              <a
                href={`https://www.data18.com${entity.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-1 text-xs font-mono text-white/60 hover:text-white transition-colors"
              >
                Data18 ↗
              </a>
              <FavoriteButton path={entity.path} />
              {entity.type === 'performer' ? (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="rounded-xl bg-pink-400 px-3 py-1 text-xs font-bold text-black hover:bg-pink-300 transition-colors cursor-pointer"
                >
                  ➕ Add to characters
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {entity.type === 'performer' ? (
        <>
          <PerformerExtraPanel slug={entity.slug} stats={entity.stats} />
          <PornPicsPanel name={entity.name} />
        </>
      ) : null}

      {/* Sub Tabs: Scenes / Movies */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-1">
          <button
            type="button"
            onClick={() => onTabChange('scenes')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scenes'
                ? 'bg-cyan-400 text-black shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>🎬 Scenes</span>
            <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-mono font-bold">
              {(entity.scenesCount ?? entity.scenes.length).toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('movies')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'movies'
                ? 'bg-amber-400 text-black shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>📼 Movies</span>
            <span className="rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-mono font-bold">
              {(entity.moviesCount ?? entity.movies.length).toLocaleString()}
            </span>
          </button>
        </div>
      </div>

      {showAddModal ? (
        <AddToCharactersModal name={entity.name} onClose={() => setShowAddModal(false)} />
      ) : null}

      {/* Tab Content */}
      {entity.tab !== activeTab ? (
        <div className="flex justify-center p-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        </div>
      ) : activeTab === 'scenes' ? (
        entity.scenes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40 text-sm">
            No scenes found for this entity.
          </div>
        ) : (
          <div className="space-y-5">
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 transition-opacity ${
                isPageLoading ? 'opacity-50' : ''
              }`}
            >
              {entity.scenes.map((scene) => (
                <SceneCard key={scene.id} scene={scene} onZoomImage={onZoomImage} />
              ))}
            </div>
            {pager}
          </div>
        )
      ) : entity.movies.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40 text-sm">
          No movies found for this entity.
        </div>
      ) : (
        <div className="space-y-5">
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 transition-opacity ${
              isPageLoading ? 'opacity-50' : ''
            }`}
          >
            {entity.movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onZoomImage={onZoomImage} />
            ))}
          </div>
          {pager}
        </div>
      )}
    </div>
  );
}
