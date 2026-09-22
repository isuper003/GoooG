import { Link } from 'react-router-dom';
import type { Data18Scene } from '../../../shared/data18Types';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import { performerHref, sceneHref, studioHref } from '../../lib/data18Nav';
import WatchLaterButton from './WatchLaterButton';

interface SceneCardProps {
  scene: Data18Scene;
  onZoomImage?: (url: string) => void;
}

export default function SceneCard({ scene, onZoomImage }: SceneCardProps) {
  const proxiedImg = toProxiedImageUrl(scene.imageUrl);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0c121d]/80 backdrop-blur-md transition-all duration-300 hover:border-cyan-400/40 hover:shadow-xl hover:shadow-cyan-950/20">
      {/* Media Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-black/50">
        {scene.imageUrl ? (
          <img
            src={proxiedImg}
            alt={scene.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onClick={() => onZoomImage?.(scene.imageUrl)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/20">
            🎬 No Preview
          </div>
        )}

        {/* Gradient overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c121d] via-transparent to-black/30" />

        {/* Top Badges: Photos & Date & Watch Later */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
          {scene.photosCount ? (
            <span className="flex items-center gap-1 rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-mono text-cyan-300 font-semibold border border-cyan-400/20 shadow-sm">
              📷 {scene.photosCount}
            </span>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-1.5 pointer-events-auto">
            <WatchLaterButton
              itemType="scene"
              itemId={scene.id}
              title={scene.title}
              url={scene.url}
              imageUrl={scene.imageUrl}
              releaseDate={scene.date}
              studio={scene.studio}
              cast={scene.cast}
            />
            {scene.date ? (
              <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-mono text-white/70 border border-white/10 shadow-sm">
                {scene.date}
              </span>
            ) : null}
          </div>
        </div>

        {/* Quick External Link */}
        <a
          href={scene.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open scene on Data18"
          className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 backdrop-blur-md p-1.5 text-white/60 hover:text-white hover:bg-cyan-500 hover:text-black transition-all shadow-md"
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

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-3.5 gap-2.5">
        <div>
          {/* Studio Tag if available */}
          {scene.studio ? (
            <div className="mb-1">
              <Link
                to={studioHref(scene.studio.slug)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400/90 hover:text-rose-300 hover:underline transition-colors"
              >
                🏢 {scene.studio.name}
              </Link>
            </div>
          ) : null}

          {/* Scene Title */}
          <h3 className="text-sm font-bold leading-snug line-clamp-2" title={scene.title}>
            <Link to={sceneHref(scene.id)} className="text-white hover:text-cyan-300 transition-colors">
              {scene.title}
            </Link>
          </h3>
        </div>

        {/* Cast Members Chips */}
        {scene.cast && scene.cast.length > 0 ? (
          <div className="border-t border-white/[0.06] pt-2 flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] font-mono text-white/40 uppercase">Cast:</span>
            {scene.cast.map((member) => (
              <Link
                key={member.slug}
                to={performerHref(member.slug)}
                className="inline-flex items-center rounded-full bg-white/[0.06] hover:bg-cyan-400/20 hover:text-cyan-300 hover:border-cyan-400/40 border border-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80 transition-all"
              >
                {member.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
