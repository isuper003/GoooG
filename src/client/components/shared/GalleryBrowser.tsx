import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { GalleryCard } from '../../../shared/galleryTypes';
import { apiClient } from '../../lib/apiClient';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import ImageLightbox from '../gallery/ImageLightbox';

interface GalleryBrowserProps {
  galleries: GalleryCard[];
  onClose: () => void;
  /** When given, every photo gets an "Add" button that hands its URL to the caller. */
  onPickImage?: (url: string) => void;
  /** Photos the caller already has, shown as added. */
  pickedImages?: string[];
  title?: string;
}

/** Modal that lists galleries and opens one to browse (and optionally pick) its full-size photos. */
export default function GalleryBrowser({
  galleries,
  onClose,
  onPickImage,
  pickedImages = [],
  title = 'Galleries',
}: GalleryBrowserProps) {
  const [active, setActive] = useState<GalleryCard | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const photosQuery = useQuery({
    queryKey: ['gallery-images', active?.url],
    queryFn: () => apiClient.getGalleryImages(active!.url),
    enabled: !!active,
    staleTime: 30 * 60_000,
  });
  const photos = photosQuery.data?.images ?? [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // The lightbox handles Escape itself while it is open.
      if (e.key === 'Escape' && zoomIndex === null) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomIndex]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 backdrop-blur-sm px-3 py-8 sm:px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-[#0c121d] p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {active ? (
              <button
                type="button"
                onClick={() => {
                  setActive(null);
                  setZoomIndex(null);
                }}
                className="shrink-0 rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/10 cursor-pointer"
              >
                ← Galleries
              </button>
            ) : null}
            <h3 className="truncate text-sm font-bold text-white">
              {active ? photosQuery.data?.title || active.title || 'Gallery' : `${title} (${galleries.length})`}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {active ? (
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-white/70 hover:text-white"
              >
                Open on PornPics ↗
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg bg-white/10 px-2.5 py-1 text-sm font-bold text-white hover:bg-white/20 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {!active ? (
          galleries.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/50">No galleries available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {galleries.map((gallery) => (
                <button
                  key={gallery.url}
                  type="button"
                  onClick={() => setActive(gallery)}
                  title={gallery.title}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-black/40 text-left hover:border-pink-400/50 transition-colors cursor-pointer"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <img
                      src={toProxiedImageUrl(gallery.cover)}
                      alt={gallery.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  {gallery.title ? (
                    <p className="line-clamp-2 p-2 text-[11px] font-medium text-white/80">{gallery.title}</p>
                  ) : null}
                </button>
              ))}
            </div>
          )
        ) : photosQuery.isPending ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-white/[0.05]" />
            ))}
          </div>
        ) : photosQuery.isError ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs text-rose-300">
            {photosQuery.error instanceof Error ? photosQuery.error.message : 'Failed to load the gallery'}
          </p>
        ) : photos.length === 0 ? (
          <p className="py-8 text-center text-xs text-white/50">This gallery has no photos.</p>
        ) : (
          <>
            <p className="text-[11px] font-mono text-white/50">{photos.length} photos</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {photos.map((url, i) => {
                const isPicked = pickedImages.includes(url);
                return (
                  <div
                    key={url}
                    className={`group relative aspect-[3/4] overflow-hidden rounded-xl border bg-black/50 ${
                      isPicked ? 'border-emerald-400/70' : 'border-white/10'
                    }`}
                  >
                    <img
                      src={toProxiedImageUrl(url)}
                      alt={`${photosQuery.data?.title ?? 'Photo'} ${i + 1}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onClick={() => setZoomIndex(i)}
                      className="h-full w-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.2';
                      }}
                    />
                    {onPickImage ? (
                      <button
                        type="button"
                        disabled={isPicked}
                        onClick={() => onPickImage(url)}
                        className={`absolute bottom-1.5 left-1.5 right-1.5 rounded-lg px-2 py-1 text-[11px] font-bold transition-colors ${
                          isPicked
                            ? 'bg-emerald-500/90 text-black cursor-default'
                            : 'bg-black/75 text-white hover:bg-pink-400 hover:text-black cursor-pointer'
                        }`}
                      >
                        {isPicked ? '✓ Added' : '+ Add'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {zoomIndex !== null && photos.length > 0 ? (
        <ImageLightbox
          images={photos}
          initialIndex={zoomIndex}
          characterName={photosQuery.data?.title || active?.title || 'Gallery'}
          onClose={() => setZoomIndex(null)}
        />
      ) : null}
    </div>
  );
}
