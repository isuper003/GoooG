import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Data18MovieDetail } from '../../../shared/data18Types';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import { performerHref, sceneHref, studioHref } from '../../lib/data18Nav';
import ImageLightbox from '../gallery/ImageLightbox';
import CastSection from './CastSection';
import TagList from './TagList';

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-mono text-white/70">
      {children}
    </span>
  );
}

export default function MovieDetailView({ movie }: { movie: Data18MovieDetail }) {
  const covers = [movie.coverUrl, movie.backCoverUrl, movie.posterUrl].filter((u): u is string => !!u);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c121d] to-[#080d14] shadow-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="w-40 sm:w-52 shrink-0 self-center sm:self-start space-y-2">
            {covers[0] ? (
              <img
                src={toProxiedImageUrl(covers[0])}
                alt={movie.title}
                referrerPolicy="no-referrer"
                onClick={() => setZoomIndex(0)}
                className="w-full rounded-xl border border-white/10 shadow-xl cursor-zoom-in"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.2';
                }}
              />
            ) : (
              <div className="flex aspect-[1/1.42] items-center justify-center rounded-xl bg-black/50 text-white/20">
                📼 No Cover
              </div>
            )}
            {covers.length > 1 ? (
              <div className="flex gap-2">
                {covers.slice(1).map((url, i) => (
                  <img
                    key={url}
                    src={toProxiedImageUrl(url)}
                    alt=""
                    referrerPolicy="no-referrer"
                    onClick={() => setZoomIndex(i + 1)}
                    className="h-16 flex-1 min-w-0 rounded-lg border border-white/10 object-cover cursor-zoom-in"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <span className="w-fit rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-xs font-mono font-bold uppercase text-amber-300">
              Movie
            </span>
            <h1 className="text-xl sm:text-3xl font-display font-black text-white tracking-tight">{movie.title}</h1>

            <div className="flex flex-wrap gap-2">
              {movie.year ? <Badge>📅 {movie.year}</Badge> : null}
              {movie.releaseDate ? <Badge>Release: {movie.releaseDate}</Badge> : null}
              {movie.duration ? <Badge>⏱ {movie.duration}</Badge> : null}
              {movie.scenesCount ? <Badge>🎬 {movie.scenesCount} scenes</Badge> : null}
              {movie.photosCount ? <Badge>📷 {movie.photosCount} photos</Badge> : null}
            </div>

            <dl className="space-y-1.5 text-xs">
              {movie.studio ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-white/40">Studio</dt>
                  <dd>
                    <Link to={studioHref(movie.studio.slug)} className="font-semibold text-rose-300 hover:underline">
                      🏢 {movie.studio.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {movie.directors.length > 0 ? (
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 text-white/40">Director</dt>
                  <dd className="flex flex-wrap gap-x-3">
                    {movie.directors.map((d) => (
                      <Link key={d.slug} to={performerHref(d.slug)} className="font-semibold text-cyan-300 hover:underline">
                        {d.name}
                      </Link>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>

            <a
              href={movie.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-fit rounded-xl border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              Open on Data18 ↗
            </a>
          </div>
        </div>
      </div>

      {movie.description ? (
        <p className="max-w-3xl text-sm leading-relaxed text-white/70">{movie.description}</p>
      ) : null}

      {movie.scenes.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>🎬</span> Scenes
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-mono text-white/60">
              {movie.scenes.length}
            </span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {movie.scenes.map((s) => (
              <Link
                key={s.id}
                to={sceneHref(s.id)}
                className="group overflow-hidden rounded-xl border border-white/10 bg-[#0c121d]/80 hover:border-cyan-400/40 transition-colors"
              >
                <div className="aspect-video overflow-hidden bg-black/50">
                  {s.imageUrl ? (
                    <img
                      src={toProxiedImageUrl(s.imageUrl)}
                      alt={s.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-bold text-white/90">{s.title}</p>
                  {s.cast.length > 0 ? (
                    <p className="truncate text-[11px] text-white/50" title={s.cast.join(', ')}>
                      {s.cast.join(', ')}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <CastSection cast={movie.cast} />
      <TagList tags={movie.tags} />

      {zoomIndex !== null ? (
        <ImageLightbox
          images={covers}
          initialIndex={zoomIndex}
          characterName={movie.title}
          onClose={() => setZoomIndex(null)}
        />
      ) : null}
    </div>
  );
}
