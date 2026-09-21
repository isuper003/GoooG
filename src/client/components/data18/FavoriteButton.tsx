import { ApiError } from '../../lib/apiClient';
import { useData18Favorites, useToggleData18Favorite } from '../../hooks/useData18';

interface FavoriteButtonProps {
  /** Canonical entity path, e.g. `/name/cory-chase`. */
  path: string;
}

/** Follow / unfollow toggle for a Data18 performer, studio or series. */
export default function FavoriteButton({ path }: FavoriteButtonProps) {
  const { data: favorites, isPending } = useData18Favorites();
  const toggle = useToggleData18Favorite();

  const isFollowing = favorites?.some((f) => f.path === path) ?? false;
  const error = toggle.error
    ? toggle.error instanceof ApiError
      ? toggle.error.message
      : 'Could not update'
    : null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={isPending || toggle.isPending}
        onClick={() => toggle.mutate({ path, follow: !isFollowing })}
        aria-pressed={isFollowing}
        className={`rounded-xl border px-3 py-1 text-xs font-bold transition-colors cursor-pointer disabled:opacity-60 ${
          isFollowing
            ? 'border-violet-400/60 bg-violet-400/20 text-violet-200 hover:bg-violet-400/30'
            : 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/10'
        }`}
      >
        {toggle.isPending ? '…' : isFollowing ? '★ Following' : '☆ Follow'}
      </button>
      {error ? <span className="text-[11px] text-rose-300">{error}</span> : null}
    </span>
  );
}
