import { useState } from 'react';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import { usePornPicsSearch } from '../../hooks/useData18';
import ImageLightbox from '../gallery/ImageLightbox';
import GalleryBrowser from '../shared/GalleryBrowser';

interface PornPicsPanelProps {
  /** Performer name as written on Data18. */
  name: string;
}

const SOURCE_LABEL = {
  profile: 'Performer page on PornPics',
  search: 'Search results',
  none: 'No results',
} as const;

export default function PornPicsPanel({ name }: PornPicsPanelProps) {
  const [requested, setRequested] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [browsingGalleries, setBrowsingGalleries] = useState(false);
  const { data, isFetching, error, refetch } = usePornPicsSearch(name, requested);

  const searchUrl = `https://www.pornpics.com/?q=${encodeURIComponent(name)}`;
  const images = data?.images ?? [];
  const galleries = data?.galleries ?? [];

  return (
    <section className="rounded-2xl border border-pink-500/20 bg-pink-500/[0.04] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📸</span> PornPics
          </h3>
          <p className="text-[11px] text-white/50 mt-0.5">
            Look up photo galleries for <b className="text-white/80">{name}</b> on pornpics.com.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={data?.pageUrl || searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            Open on PornPics ↗
          </a>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => (requested ? refetch() : setRequested(true))}
            className="rounded-xl bg-pink-400 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-pink-300 disabled:opacity-60 transition-all cursor-pointer"
          >
            {isFetching ? 'Searching…' : requested ? 'Search again' : `Search "${name}"`}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          {error instanceof Error ? error.message : 'PornPics search failed'}
        </p>
      ) : null}

      {isFetching && images.length === 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      ) : null}

      {data && !isFetching ? (
        images.length === 0 ? (
          <p className="text-xs text-white/50">
            Nothing found for "{name}". Try the search on the site itself using the button above.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-white/50">
              <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-pink-300">
                {SOURCE_LABEL[data.source]}
              </span>
              <span>{images.length} galleries</span>
              {galleries.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setBrowsingGalleries(true)}
                  className="rounded-md bg-pink-400 px-2 py-0.5 font-bold text-black hover:bg-pink-300 cursor-pointer"
                >
                  Browse all photos
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-black/50 cursor-zoom-in"
                >
                  <img
                    src={toProxiedImageUrl(url)}
                    alt={`${name} ${i + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.2';
                    }}
                  />
                </button>
              ))}
            </div>
          </>
        )
      ) : null}

      {browsingGalleries ? (
        <GalleryBrowser
          galleries={galleries}
          title={`${name} galleries`}
          onClose={() => setBrowsingGalleries(false)}
        />
      ) : null}

      {lightboxIndex !== null ? (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          characterName={name}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </section>
  );
}
