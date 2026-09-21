import { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import FullscreenButton from '../ui/FullscreenButton';

interface ImageLightboxProps {
  images: string[];
  characterName: string;
  categoryKey?: string;
  initialIndex?: number;
  onClose: () => void;
}

const CATEGORY_BADGES: Record<string, { label: string; badgeClass: string }> = {
  trans: { label: 'Trans', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  sluts: { label: 'Sluts', badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  sl: { label: 'Sluts', badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  twinks: { label: 'Twinks', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
};

export default function ImageLightbox({
  images,
  characterName,
  categoryKey,
  initialIndex = 0,
  onClose,
}: ImageLightboxProps) {
  const [index, setIndex] = useState(
    Math.max(0, Math.min(initialIndex, Math.max(0, images.length - 1)))
  );

  const imagesCount = images.length;

  const nextImage = useCallback(() => {
    if (imagesCount <= 1) return;
    setIndex((i) => (i + 1) % imagesCount);
  }, [imagesCount]);

  const prevImage = useCallback(() => {
    if (imagesCount <= 1) return;
    setIndex((i) => (i - 1 + imagesCount) % imagesCount);
  }, [imagesCount]);

  // Lock body scroll while zoom-in is open & listen for escape / arrow keys
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    }

    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
    };
  }, [nextImage, onClose, prevImage]);

  // Touch gesture support (swipe left / right to navigate)
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (diffX > 40) {
      nextImage();
    } else if (diffX < -40) {
      prevImage();
    }
    touchStartX.current = null;
  };

  // Wheel horizontal scroll to flip photos
  const lastScrollTime = useRef(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (imagesCount <= 1) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 20) {
      const now = Date.now();
      if (now - lastScrollTime.current > 250) {
        lastScrollTime.current = now;
        if (delta > 0) nextImage();
        else prevImage();
      }
    }
  };

  const categoryMeta = categoryKey ? CATEGORY_BADGES[categoryKey] : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 select-none">
        {/* Backdrop (clicking empty space cancels zoom-in with smooth animation) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-zoom-out"
        />

        {/* Floating Zoom Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.86, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative z-10 flex flex-col items-center max-w-5xl w-full h-full max-h-[94vh] justify-between pointer-events-auto"
        >
          {/* Top Floating Control Bar */}
          <div className="w-full flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-[#090d14]/90 border border-white/10 backdrop-blur-xl shadow-2xl shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <span className="font-display font-black text-white text-sm sm:text-base truncate drop-shadow-sm">
                {characterName}
              </span>

              {categoryMeta && (
                <span
                  className={`hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${categoryMeta.badgeClass}`}
                >
                  {categoryMeta.label}
                </span>
              )}

              {imagesCount > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-cyan-400 font-mono text-xs font-semibold shrink-0">
                  {index + 1} / {imagesCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <FullscreenButton variant="header" />

              <button
                type="button"
                onClick={onClose}
                aria-label="Close zoom"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.15] text-white/80 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer active:scale-95"
                title="Press Esc or click empty space to close"
              >
                <span>✕</span>
                <span className="hidden sm:inline text-[11px] text-white/50">Close</span>
              </button>
            </div>
          </div>

          {/* Central Floating Image Viewport */}
          <div
            className="relative flex-1 w-full flex items-center justify-center overflow-hidden my-3 sm:my-4"
            onClick={onClose}
          >
            {images[index] ? (
              <motion.div
                key={images[index]}
                initial={{ opacity: 0.4, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-h-full max-w-full flex items-center justify-center group"
              >
                <img
                  src={toProxiedImageUrl(images[index])}
                  alt={`${characterName} - photo ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[72vh] sm:max-h-[76vh] max-w-[92vw] sm:max-w-[85vw] md:max-w-4xl w-auto h-auto object-contain rounded-2xl border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.8)] bg-black/70 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0.3';
                  }}
                />

                {/* Left Floating Arrow */}
                {imagesCount > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    aria-label="Previous photo"
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-cyan-400 flex items-center justify-center text-lg sm:text-xl transition-all shadow-xl backdrop-blur-md cursor-pointer active:scale-95 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  >
                    ‹
                  </button>
                )}

                {/* Right Floating Arrow */}
                {imagesCount > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    aria-label="Next photo"
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-cyan-400 flex items-center justify-center text-lg sm:text-xl transition-all shadow-xl backdrop-blur-md cursor-pointer active:scale-95 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                  >
                    ›
                  </button>
                )}
              </motion.div>
            ) : (
              <div className="font-mono text-xs text-white/40">No photo available</div>
            )}
          </div>

          {/* Bottom Filmstrip Thumbnails & Hint */}
          <div className="w-full flex flex-col items-center gap-2 shrink-0">
            {imagesCount > 1 ? (
              <div className="flex items-center gap-2 max-w-full overflow-x-auto p-1.5 rounded-2xl bg-[#090d14]/80 border border-white/10 backdrop-blur-md shadow-xl no-scrollbar">
                {images.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIndex(i);
                    }}
                    className={`h-11 w-11 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-xl border transition-all cursor-pointer ${
                      i === index
                        ? 'border-2 border-cyan-400 ring-2 ring-cyan-400/40 scale-105 shadow-md shadow-cyan-400/20'
                        : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/40'
                    }`}
                  >
                    <img
                      src={toProxiedImageUrl(url)}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
