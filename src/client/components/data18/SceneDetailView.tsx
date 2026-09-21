import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Data18SceneDetail } from '../../../shared/data18Types';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import { movieHref, sceneHref, studioHref, toSitePath, entityHref } from '../../lib/data18Nav';
import ImageLightbox from '../gallery/ImageLightbox';
import CastSection from './CastSection';
import TagList from './TagList';

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-mono text-white/70">
      {children}
    </span>
  );
}

export default function SceneDetailView({ scene }: { scene: Data18SceneDetail }) {
  const [zoom, setZoom] = useState(false);
  const image = scene.imageUrl || scene.thumbUrl;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c121d] to-[#080d14] shadow-2xl">
        <div className="grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="relative aspect-video bg-black/60">
            {image ? (
              <img
                src={toProxiedImageUrl(image)}
                alt={scene.title}
                referrerPolicy="no-referrer"
                onClick={() => setZoom(true)}
                className="h-full w-full object-cover cursor-zoom-in"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.2';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/20">🎬 No Preview</div>
            )}
          </div>

          <div className="flex flex-col gap-3 p-5 sm:p-6">
            <span className="w-fit rounded-full border border-cyan-500/30 bg-cyan-500/20 px-2.5 py-0.5 text-xs font-mono font-bold uppercase text-cyan-300">
              Scene
            </span>
            <h1 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight">{scene.title}</h1>

            <div className="flex flex-wrap gap-2">
              {scene.releaseDate ? <Badge>📅 {scene.releaseDate}</Badge> : null}
              {scene.duration ? <Badge>⏱ {scene.duration}</Badge> : null}
              {scene.photosCount ? <Badge>📷 {scene.photosCount} photos</Badge> : null}
            </div>

            <dl className="space-y-1.5 text-xs">
              {scene.studio ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-white/40">Studio</dt>
                  <dd>
                    <Link to={studioHref(scene.studio.slug)} className="font-semibold text-rose-300 hover:underline">
                      🏢 {scene.studio.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {scene.series ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-white/40">Series</dt>
                  <dd>
                    <Link
                      to={entityHref(toSitePath(scene.series.url))}
                      className="font-semibold text-amber-300 hover:underline"
                    >
                      {scene.series.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {scene.movie ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-white/40">Movie</dt>
                  <dd>
                    <Link to={movieHref(scene.movie.slug)} className="font-semibold text-amber-300 hover:underline">
                      📼 {scene.movie.title}
                    </Link>
                    {scene.movie.sceneNumber ? (
                      <span className="ml-2 font-mono text-white/40">scene {scene.movie.sceneNumber}</span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>

            <a
              href={scene.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto w-fit rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              Open on Data18 ↗
            </a>
          </div>
        </div>
      </div>

      {scene.description ? (
        <p className="max-w-3xl text-sm leading-relaxed text-white/70">{scene.description}</p>
      ) : null}

      <CastSection cast={scene.cast} />
      <TagList tags={scene.tags} />

      {scene.siblingScenes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🎞️</span> More scenes from this movie
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {scene.siblingScenes.map((s) => (
              <Link
                key={s.id}
                to={sceneHref(s.id)}
                className="group overflow-hidden rounded-xl border border-white/10 bg-[#0c121d]/80 hover:border-cyan-400/40 transition-colors"
              >
                <div className="aspect-video overflow-hidden bg-black/50">
                  <img
                    src={toProxiedImageUrl(s.imageUrl)}
                    alt={s.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <p className="truncate p-2 text-[11px] font-semibold text-white/80" title={s.title}>
                  {s.label ? `${s.label} · ` : ''}
                  {s.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {zoom && image ? (
        <ImageLightbox images={[image]} characterName={scene.title} onClose={() => setZoom(false)} />
      ) : null}
    </div>
  );
}
