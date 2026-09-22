import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Data18SearchResult } from '../../shared/data18Types';
import { movieHref, performerHref, sceneHref, studioHref, toSitePath } from '../lib/data18Nav';
import { useData18Entity } from '../hooks/useData18';
import EntitySearchBar from '../components/data18/EntitySearchBar';
import EntityDetailView from '../components/data18/EntityDetailView';
import FollowingFeed from '../components/data18/FollowingFeed';
import { InfiniteMovieList, InfiniteSceneList } from '../components/data18/InfiniteLists';
import WatchLaterView from '../components/data18/WatchLaterView';
import { useData18WatchLater } from '../hooks/useData18WatchLater';
import ImageLightbox from '../components/gallery/ImageLightbox';

type Data18Mode = 'scenes' | 'upcoming' | 'movies' | 'performers' | 'studios' | 'following' | 'watch-later';

const MODES: Data18Mode[] = ['scenes', 'upcoming', 'movies', 'performers', 'studios', 'following', 'watch-later'];

const POPULAR_PERFORMERS = [
  { name: 'Cory Chase', slug: 'cory-chase' },
  { name: 'Angela White', slug: 'angela-white' },
  { name: 'Aubrey Kate', slug: 'aubrey-kate' },
  { name: 'Daisy Taylor', slug: 'daisy-taylor' },
  { name: 'Rocco Siffredi', slug: 'rocco-siffredi' },
  { name: 'Alia Starr', slug: 'alia-starr' },
];

const POPULAR_STUDIOS = [
  { name: 'Evil Angel', slug: 'evil-angel' },
  { name: 'Girlfriends Films', slug: 'girlfriends-films' },
  { name: 'Brazzers', slug: 'brazzers' },
  { name: 'Digital Playground', slug: 'digital-playground' },
  { name: 'Tushy', slug: 'tushy' },
  { name: 'Blacked', slug: 'blacked' },
];

const TAB_BASE =
  'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap';

function positiveInt(value: string | null): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default function Data18Page() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const modeParam = params.get('mode');
  const mode: Data18Mode = MODES.includes(modeParam as Data18Mode) ? (modeParam as Data18Mode) : 'scenes';
  const page = positiveInt(params.get('page'));
  const entityPath = params.get('entity');
  const entityPage = positiveInt(params.get('epage'));
  const entityTab: 'scenes' | 'movies' = params.get('etab') === 'movies' ? 'movies' : 'scenes';

  const entityQuery = useData18Entity(entityPath, entityPage, entityTab);
  const watchLaterQuery = useData18WatchLater();
  const unwatchedCount = watchLaterQuery.data?.stats.unwatched ?? 0;

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  function selectMode(next: Data18Mode) {
    setParams(next === 'scenes' ? {} : { mode: next });
  }

  function handleSearchResult(result: Data18SearchResult) {
    if (result.type === 'scene') {
      navigate(sceneHref(result.slug));
    } else if (result.type === 'movie') {
      navigate(movieHref(result.slug));
    } else {
      setParams({ mode: result.type === 'performer' ? 'performers' : 'studios', entity: toSitePath(result.url) });
    }
  }

  function openEntity(href: string) {
    navigate(href);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            Media Intelligence Database
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mt-0.5 flex items-center gap-2">
            <span>Data18 Explorer</span>
            <span className="text-xl">🎬</span>
          </h1>
          <p className="text-white/50 mt-1 text-xs">
            Browse the latest official scenes and movies, discover performers, and explore studios and networks.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center rounded-2xl bg-white/[0.04] border border-white/10 p-1 overflow-x-auto max-w-full">
          {(
            [
              ['scenes', '🎬', 'Latest Scenes', 'bg-cyan-400 text-black shadow-md shadow-cyan-400/20'],
              ['upcoming', '🗓️', 'Upcoming', 'bg-emerald-400 text-black shadow-md shadow-emerald-400/20'],
              ['movies', '📼', 'Latest Movies', 'bg-amber-400 text-black shadow-md shadow-amber-400/20'],
              ['performers', '⭐', 'By Performer', 'bg-white text-black shadow-md'],
              ['studios', '🏢', 'By Studio / Series', 'bg-rose-400 text-black shadow-md'],
              ['following', '💜', 'Following', 'bg-violet-400 text-black shadow-md'],
              ['watch-later', '🕒', 'Watch Later', 'bg-cyan-400 text-black shadow-md shadow-cyan-400/20'],
            ] as const
          ).map(([key, icon, label, activeClass]) => (
            <button
              key={key}
              type="button"
              onClick={() => selectMode(key)}
              className={`${TAB_BASE} ${
                mode === key && !entityPath ? activeClass : 'text-white/60 hover:text-white'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {key === 'watch-later' && unwatchedCount > 0 && (
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold leading-none ${
                    mode === 'watch-later' && !entityPath
                      ? 'bg-black text-cyan-300'
                      : 'bg-cyan-400/25 text-cyan-300 border border-cyan-400/40'
                  }`}
                >
                  {unwatchedCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {entityPath ? (
        /* Entity profile (performer / studio / site / series) */
        entityQuery.isPending ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
            <p className="text-xs font-mono text-cyan-300 uppercase tracking-widest">
              Loading Data18 Profile...
            </p>
          </div>
        ) : entityQuery.isError ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-sm text-rose-300">
            <p className="font-bold">Failed to load entity details</p>
            <p className="text-xs mt-1 opacity-80">
              {entityQuery.error instanceof Error ? entityQuery.error.message : 'Unknown error'}
            </p>
            <button
              type="button"
              onClick={() => update({ entity: null, epage: null })}
              className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
            >
              Back to Browse
            </button>
          </div>
        ) : (
          <EntityDetailView
            key={entityQuery.data.path}
            entity={entityQuery.data}
            isPageLoading={entityQuery.isPlaceholderData}
            tab={entityTab}
            onTabChange={(t) => update({ etab: t === 'movies' ? 'movies' : null, epage: null })}
            onBack={() => update({ entity: null, epage: null, etab: null })}
            onPageChange={(p) => update({ epage: p === 1 ? null : String(p) })}
            onZoomImage={setLightboxImage}
          />
        )
      ) : mode === 'watch-later' ? (
        <WatchLaterView onZoomImage={setLightboxImage} />
      ) : mode === 'scenes' || mode === 'upcoming' ? (
        <InfiniteSceneList
          key={`${mode}-${page}`}
          kind={mode === 'upcoming' ? 'upcoming' : 'latest'}
          startPage={page}
          onZoomImage={setLightboxImage}
        />
      ) : mode === 'movies' ? (
        <InfiniteMovieList key={`movies-${page}`} startPage={page} onZoomImage={setLightboxImage} />
      ) : mode === 'following' ? (
        <FollowingFeed onZoomImage={setLightboxImage} />
      ) : mode === 'performers' ? (
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center gap-3 pt-4">
            <span className="text-3xl">⭐</span>
            <h2 className="text-2xl font-bold text-white">Find Performers</h2>
            <p className="text-xs text-white/50 max-w-md">
              Search by performer name to discover their latest scene releases, movie catalog, cast pairings — and
              look them up on PornPics.
            </p>
          </div>

          <EntitySearchBar
            defaultType="performer"
            placeholder="Type a performer name (e.g. Cory Chase, Angela White)..."
            onSelectResult={handleSearchResult}
          />

          <div className="flex flex-col items-center gap-3 pt-2">
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Popular Performers:</span>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {POPULAR_PERFORMERS.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => openEntity(performerHref(p.slug))}
                  className="rounded-xl bg-white/[0.04] hover:bg-cyan-500/20 hover:text-cyan-300 hover:border-cyan-500/40 border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-all cursor-pointer"
                >
                  ⭐ {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col items-center text-center gap-3 pt-4">
            <span className="text-3xl">🏢</span>
            <h2 className="text-2xl font-bold text-white">Explore Studios &amp; Series</h2>
            <p className="text-xs text-white/50 max-w-md">
              Browse content catalogues by production studio, website network, or web series.
            </p>
          </div>

          <EntitySearchBar
            defaultType="studio"
            placeholder="Search studio, site, or series (e.g. Evil Angel, Brazzers, Rough Love)..."
            onSelectResult={handleSearchResult}
          />

          <div className="flex flex-col items-center gap-3 pt-2">
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Top Studios:</span>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xl">
              {POPULAR_STUDIOS.map((s) => (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => openEntity(studioHref(s.slug))}
                  className="rounded-xl bg-white/[0.04] hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition-all cursor-pointer"
                >
                  🏢 {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightboxImage ? (
        <ImageLightbox
          images={[lightboxImage]}
          characterName="Data18 Media Preview"
          onClose={() => setLightboxImage(null)}
        />
      ) : null}
    </div>
  );
}
