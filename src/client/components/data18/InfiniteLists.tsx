import type { ReactNode } from 'react';
import { useData18InfiniteMovies, useData18InfiniteScenes } from '../../hooks/useData18';
import type { SceneFeedKind } from '../../hooks/useData18';
import InfiniteFooter from './InfiniteFooter';
import MovieCard from './MovieCard';
import SceneCard from './SceneCard';

interface ListProps {
  /** Page the list starts at (from the URL); later pages are appended while scrolling. */
  startPage: number;
  onZoomImage?: (url: string) => void;
}

const SCENE_GRID = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5';
const MOVIE_GRID = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4';

function Skeleton({ className, aspect }: { className: string; aspect: string }) {
  return (
    <div className={className}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={`${aspect} w-full rounded-2xl bg-white/[0.03] animate-pulse border border-white/5`} />
      ))}
    </div>
  );
}

function Message({ tone, children }: { tone: 'error' | 'empty'; children: ReactNode }) {
  return tone === 'error' ? (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-300">
      {children}
    </div>
  ) : (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-white/40 text-sm">
      {children}
    </div>
  );
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/** Latest or upcoming scenes as an endless list. */
export function InfiniteSceneList({ kind, startPage, onZoomImage }: ListProps & { kind: SceneFeedKind }) {
  const q = useData18InfiniteScenes(kind, startPage);
  const label = kind === 'upcoming' ? 'Upcoming scenes' : 'Recently released scenes';

  return (
    <div className="space-y-6">
      <span className="text-xs font-mono text-white/50">
        {label}
        {q.totalFound ? ` • ${q.totalFound.toLocaleString()} in database` : ''}
        {startPage > 1 ? ` • starting at page ${startPage}` : ''}
      </span>

      {q.isPending ? (
        <Skeleton className={SCENE_GRID} aspect="aspect-video" />
      ) : q.isError && q.scenes.length === 0 ? (
        <Message tone="error">{errorText(q.error, 'Failed to load scenes')}</Message>
      ) : q.scenes.length === 0 ? (
        <Message tone="empty">No scenes found.</Message>
      ) : (
        <>
          <div className={SCENE_GRID}>
            {q.scenes.map((scene) => (
              <SceneCard key={scene.id} scene={scene} onZoomImage={onZoomImage} />
            ))}
          </div>
          <InfiniteFooter
            hasNextPage={!!q.hasNextPage}
            isFetchingNextPage={q.isFetchingNextPage}
            errorMessage={q.isFetchNextPageError ? errorText(q.error, 'Failed to load more') : null}
            loadedCount={q.scenes.length}
            totalCount={q.totalFound}
            onLoadMore={() => void q.fetchNextPage()}
          />
        </>
      )}
    </div>
  );
}

/** Latest movies as an endless list. */
export function InfiniteMovieList({ startPage, onZoomImage }: ListProps) {
  const q = useData18InfiniteMovies(startPage);

  return (
    <div className="space-y-6">
      <span className="text-xs font-mono text-white/50">
        Recently released movies
        {q.totalFound ? ` • ${q.totalFound.toLocaleString()} in database` : ''}
        {startPage > 1 ? ` • starting at page ${startPage}` : ''}
      </span>

      {q.isPending ? (
        <Skeleton className={MOVIE_GRID} aspect="aspect-[1/1.42]" />
      ) : q.isError && q.movies.length === 0 ? (
        <Message tone="error">{errorText(q.error, 'Failed to load movies')}</Message>
      ) : q.movies.length === 0 ? (
        <Message tone="empty">No movies found.</Message>
      ) : (
        <>
          <div className={MOVIE_GRID}>
            {q.movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onZoomImage={onZoomImage} />
            ))}
          </div>
          <InfiniteFooter
            hasNextPage={!!q.hasNextPage}
            isFetchingNextPage={q.isFetchingNextPage}
            errorMessage={q.isFetchNextPageError ? errorText(q.error, 'Failed to load more') : null}
            loadedCount={q.movies.length}
            totalCount={q.totalFound}
            onLoadMore={() => void q.fetchNextPage()}
          />
        </>
      )}
    </div>
  );
}
