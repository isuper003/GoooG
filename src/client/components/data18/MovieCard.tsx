import { Link } from 'react-router-dom';
import type { Data18Movie } from '../../../shared/data18Types';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import { movieHref, studioHref } from '../../lib/data18Nav';

interface MovieCardProps {
  movie: Data18Movie;
  onZoomImage?: (url: string) => void;
}

export default function MovieCard({ movie, onZoomImage }: MovieCardProps) {
  const proxiedCover = toProxiedImageUrl(movie.coverUrl);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c121d]/80 backdrop-blur-md transition-all duration-300 hover:border-amber-400/40 hover:shadow-xl hover:shadow-amber-950/20">
      {/* Movie Poster (2:3 Aspect Ratio) */}
      <div className="relative aspect-[1/1.42] w-full overflow-hidden bg-black/60">
        {movie.coverUrl ? (
          <img
            src={proxiedCover}
            alt={movie.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onClick={() => onZoomImage?.(movie.coverUrl)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/20">
            📼 No Cover
          </div>
        )}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c121d] via-transparent to-black/30" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          {movie.photosCount ? (
            <span className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[11px] font-mono text-amber-300 font-semibold border border-amber-400/20 shadow-sm">
              📷 {movie.photosCount}
            </span>
          ) : (
            <span />
          )}

          {movie.date ? (
            <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white/70 border border-white/10 shadow-sm">
              {movie.date}
            </span>
          ) : null}
        </div>

        {/* External Link */}
        <a
          href={movie.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open movie on Data18"
          className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 backdrop-blur-md p-1.5 text-white/60 hover:text-white hover:bg-amber-400 hover:text-black transition-all shadow-md"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col justify-between p-3 gap-2">
        <div>
          {movie.studio ? (
            <div className="mb-0.5">
              <Link
                to={studioHref(movie.studio.slug)}
                className="inline-flex items-center text-[10px] font-mono font-semibold text-amber-300/80 hover:text-amber-200 hover:underline transition-colors"
              >
                🏢 {movie.studio.name}
              </Link>
            </div>
          ) : null}

          <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2" title={movie.title}>
            <Link to={movieHref(movie.slug)} className="text-white hover:text-amber-300 transition-colors">
              {movie.title}
            </Link>
          </h4>
        </div>
      </div>
    </div>
  );
}
