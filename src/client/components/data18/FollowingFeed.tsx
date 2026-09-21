import { Link } from 'react-router-dom';
import type { Data18FeedItem } from '../../../shared/data18Types';
import { entityHref } from '../../lib/data18Nav';
import { useData18Feed, useMarkData18Seen, useToggleData18Favorite } from '../../hooks/useData18';
import PerformerAvatar from './PerformerAvatar';
import SceneCard from './SceneCard';

interface FollowingFeedProps {
  onZoomImage?: (url: string) => void;
}

function FeedSection({ item, onZoomImage }: { item: Data18FeedItem; onZoomImage?: (url: string) => void }) {
  const markSeen = useMarkData18Seen();
  const toggle = useToggleData18Favorite();
  const { favorite } = item;

  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {favorite.kind === 'performer' ? (
            <PerformerAvatar
              slug={favorite.slug}
              name={favorite.name}
              className="h-10 w-10 shrink-0 rounded-full object-cover bg-black/40 flex items-center justify-center"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lg">
              🏢
            </span>
          )}
          <div className="min-w-0">
            <Link
              to={entityHref(favorite.path)}
              className="block truncate text-sm font-bold text-white hover:text-cyan-300 transition-colors"
            >
              {favorite.name}
            </Link>
            <span className="text-[10px] font-mono uppercase tracking-wider text-white/40">{favorite.kind}</span>
          </div>
          {item.newCount > 0 ? (
            <span className="rounded-full bg-violet-400 px-2 py-0.5 text-[11px] font-bold text-black">
              {item.newCount} new
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {item.newCount > 0 && item.newestSceneId ? (
            <button
              type="button"
              disabled={markSeen.isPending}
              onClick={() => markSeen.mutate([{ path: favorite.path, sceneId: item.newestSceneId! }])}
              className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
            >
              Mark seen
            </button>
          ) : null}
          <button
            type="button"
            disabled={toggle.isPending}
            onClick={() => toggle.mutate({ path: favorite.path, follow: false })}
            className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/60 hover:text-rose-300 hover:bg-white/10 disabled:opacity-50 cursor-pointer"
          >
            Unfollow
          </button>
        </div>
      </div>

      {item.error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          Could not load the latest scenes: {item.error}
        </p>
      ) : item.scenes.length === 0 ? (
        <p className="text-xs text-white/40">No scenes listed.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {item.scenes.map((scene, index) => (
            <div
              key={scene.id}
              className={`rounded-2xl ${index < item.newCount ? 'ring-2 ring-violet-400/70' : ''}`}
            >
              <SceneCard scene={scene} onZoomImage={onZoomImage} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** "Following" tab: the latest scenes of every followed performer/studio, with new-scene counts. */
export default function FollowingFeed({ onZoomImage }: FollowingFeedProps) {
  const feed = useData18Feed();
  const markSeen = useMarkData18Seen();

  if (feed.isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (feed.isError) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-300">
        {feed.error instanceof Error ? feed.error.message : 'Failed to load your feed'}
      </div>
    );
  }

  const { items, totalFavorites } = feed.data;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center text-sm text-white/50">
        <p className="text-3xl mb-2">☆</p>
        You are not following anyone yet. Open a performer or studio and press <b>Follow</b> to see their new
        scenes here.
      </div>
    );
  }

  const unseen = items.filter((i) => i.newCount > 0 && i.newestSceneId);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-mono text-white/50">
          Following {totalFavorites}
          {totalFavorites > items.length ? ` • showing the latest ${items.length}` : ''}
        </span>
        {unseen.length > 0 ? (
          <button
            type="button"
            disabled={markSeen.isPending}
            onClick={() =>
              markSeen.mutate(unseen.map((i) => ({ path: i.favorite.path, sceneId: i.newestSceneId! })))
            }
            className="rounded-xl bg-violet-400 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-violet-300 disabled:opacity-50 cursor-pointer"
          >
            Mark all as seen
          </button>
        ) : null}
      </div>

      {items.map((item) => (
        <FeedSection key={item.favorite.path} item={item} onZoomImage={onZoomImage} />
      ))}
    </div>
  );
}
