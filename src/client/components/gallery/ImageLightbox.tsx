import { useEffect, useState } from 'react';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import FullscreenButton from '../ui/FullscreenButton';

interface ImageLightboxProps {
  images: string[];
  characterName: string;
  onClose: () => void;
}

export default function ImageLightbox({ images, characterName, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between">
          <span className="font-semibold text-white">{characterName}</span>
          <div className="flex items-center gap-2">
            <FullscreenButton variant="header" />
            <button type="button" onClick={onClose} className="text-sm text-white/70 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">
              Close
            </button>
          </div>
        </div>

        <div className="relative aspect-square w-full overflow-hidden rounded-card bg-bg-muted">
          {images[index] ? (
            <img
              src={toProxiedImageUrl(images[index])}
              alt={characterName}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
            />
          ) : null}

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                &larr;
              </button>
              <button
                type="button"
                onClick={() => setIndex((i) => (i + 1) % images.length)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              >
                &rarr;
              </button>
            </>
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto">
            {images.map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-button border-2 transition-colors ${
                  i === index ? 'border-accent' : 'border-transparent opacity-60'
                }`}
              >
                <img src={toProxiedImageUrl(url)} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
