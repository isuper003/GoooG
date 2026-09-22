import { useState } from 'react';
import { useData18WatchLaterMap, useToggleWatchLater } from '../../hooks/useData18WatchLater';

interface WatchLaterButtonProps {
  itemType: 'scene' | 'movie';
  itemId: string;
  title: string;
  url: string;
  slug?: string;
  imageUrl?: string;
  releaseDate?: string | null;
  duration?: string | null;
  studio?: { name: string; slug: string } | null;
  cast?: { name: string; slug: string }[];
  variant?: 'icon' | 'compact' | 'pill';
  className?: string;
}

export default function WatchLaterButton({
  itemType,
  itemId,
  title,
  url,
  slug,
  imageUrl,
  releaseDate,
  duration,
  studio,
  cast,
  variant = 'icon',
  className = '',
}: WatchLaterButtonProps) {
  const watchLaterMap = useData18WatchLaterMap();
  const toggle = useToggleWatchLater();
  const [justToggled, setJustToggled] = useState(false);

  const key = `${itemType}:${itemId}`;
  const savedItem = watchLaterMap.get(key);
  const isSaved = Boolean(savedItem);
  const isWatched = savedItem?.isWatched ?? false;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toggle.mutate(
      {
        savedItem,
        itemToSave: {
          itemType,
          itemId,
          title,
          url,
          slug,
          imageUrl,
          releaseDate,
          duration,
          studio,
          cast,
        },
      },
      {
        onSuccess: () => {
          setJustToggled(true);
          setTimeout(() => setJustToggled(false), 1200);
        },
      }
    );
  };

  const titleTooltip = isWatched
    ? 'Watched (Click to remove from Watch Later)'
    : isSaved
    ? 'In Watch Later (Click to remove)'
    : 'Add to Watch Later';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={toggle.isPending}
        title={titleTooltip}
        aria-label={titleTooltip}
        className={`relative flex items-center justify-center rounded-xl p-1.5 transition-all duration-200 cursor-pointer active:scale-90 ${
          isWatched
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
            : isSaved
            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/20 hover:bg-cyan-500/30'
            : 'bg-black/60 backdrop-blur-md text-white/60 border border-white/10 hover:text-white hover:border-cyan-400/40 hover:bg-black/80'
        } ${className}`}
      >
        <span className={`text-xs ${justToggled ? 'scale-125 transition-transform' : ''}`}>
          {isWatched ? '✓' : '🕒'}
        </span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={toggle.isPending}
        title={titleTooltip}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
          isWatched
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            : isSaved
            ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm'
            : 'bg-white/[0.06] text-white/70 border border-white/10 hover:text-white hover:bg-white/10'
        } ${className}`}
      >
        <span>{isWatched ? '✓' : '🕒'}</span>
        <span>{isWatched ? 'Watched' : isSaved ? 'Saved' : 'Watch Later'}</span>
      </button>
    );
  }

  // Pill variant (for Detail Views)
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={toggle.isPending}
      title={titleTooltip}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer active:scale-95 ${
        isWatched
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
          : isSaved
          ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-200 border border-cyan-500/50 shadow-md shadow-cyan-500/20 hover:from-cyan-500/35 hover:to-blue-500/35'
          : 'bg-white/[0.06] text-white/80 border border-white/10 hover:bg-white/10 hover:text-white'
      } ${className}`}
    >
      <span className="text-sm">{isWatched ? '✓' : '🕒'}</span>
      <span>{isWatched ? 'Marked as Watched' : isSaved ? 'In Watch Later' : 'Add to Watch Later'}</span>
    </button>
  );
}
