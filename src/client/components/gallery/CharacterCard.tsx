import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { CharacterDTO } from '../../../shared/types';
import { toProxiedImageUrl } from '../../lib/imageUrl';

const CATEGORY_BADGES: Record<string, { label: string; badgeClass: string }> = {
  trans: { label: 'Trans', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  sluts: { label: 'Sluts', badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  sl: { label: 'Sluts', badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  twinks: { label: 'Twinks', badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
};

interface CharacterCardProps {
  character: CharacterDTO;
  isSelected?: boolean;
  onSelect?: () => void;
  onZoom?: (character: CharacterDTO, photoIndex: number) => void;
  onEdit?: () => void;
  onViewImages?: () => void;
  onDelete?: () => void;
  onToggleActive?: () => void;
  isTogglingActive?: boolean;
}

export default function CharacterCard({
  character,
  isSelected,
  onSelect,
  onZoom,
}: CharacterCardProps) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const images = character.images || [];
  const imagesCount = images.length;
  const currentPhoto = images[activePhotoIdx] || images[0];
  const primaryImage = currentPhoto?.url;

  const nextImage = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      if (imagesCount <= 1) return;
      setActivePhotoIdx((prev) => (prev + 1) % imagesCount);
    },
    [imagesCount]
  );

  const prevImage = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      if (imagesCount <= 1) return;
      setActivePhotoIdx((prev) => (prev - 1 + imagesCount) % imagesCount);
    },
    [imagesCount]
  );

  // Touch swipe support (left / right) to switch character photos
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    if (diffX > 30) {
      nextImage(e);
    } else if (diffX < -30) {
      prevImage(e);
    }
    touchStartX.current = null;
  };

  // Mouse wheel horizontal scroll or trackpad swipe
  const lastScrollTime = useRef(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (imagesCount <= 1) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 18) {
      const now = Date.now();
      if (now - lastScrollTime.current > 260) {
        lastScrollTime.current = now;
        if (delta > 0) nextImage();
        else prevImage();
      }
    }
  };

  const categoryMeta = CATEGORY_BADGES[character.categoryKey] ?? {
    label: character.categoryKey,
    badgeClass: 'bg-white/10 text-white/80 border-white/20',
  };

  const total = character.correctCount + character.wrongCount;
  const accuracy = total > 0 ? ((character.correctCount / total) * 100).toFixed(1) : '100.0';
  const starsCount = Math.min(5, Math.max(1, character.srsLevel));
  const stars = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={`hairline-card rounded-2xl overflow-hidden group cursor-pointer transition-all flex flex-col justify-between select-none ${
        isSelected
          ? 'border-2 border-cyan-400 shadow-xl shadow-cyan-400/10 scale-[1.01]'
          : 'border border-white/10 hover:border-white/40'
      } ${character.isActive ? '' : 'opacity-50 grayscale'}`}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden bg-black cursor-zoom-in"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
          onZoom?.(character, activePhotoIdx);
        }}
        title="Click to Zoom-in • Scroll or swipe to switch photos"
      >
        <AnimatePresence mode="wait">
          {primaryImage ? (
            <motion.img
              key={`${character.id}-${activePhotoIdx}`}
              src={toProxiedImageUrl(primaryImage)}
              alt={character.name}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.7 }}
              transition={{ duration: 0.18 }}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-xs text-white/40">
              No portrait
            </div>
          )}
        </AnimatePresence>

        {/* Ambient Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent opacity-90 pointer-events-none" />

        {/* Left / Right Scroll Overlay Arrows (Appear on hover if character has multiple photos) */}
        {imagesCount > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous photo"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-sm text-sm border border-white/20 hover:border-cyan-400 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
              title="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next photo"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-sm text-sm border border-white/20 hover:border-cyan-400 hover:scale-110 active:scale-95 cursor-pointer shadow-lg"
              title="Next photo"
            >
              ›
            </button>
          </>
        )}

        {/* Category Pill on Top Left */}
        <div className="absolute top-2.5 left-2.5 pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border backdrop-blur-md ${categoryMeta.badgeClass}`}
          >
            {categoryMeta.label}
          </span>
        </div>

        {/* Top Right Badges: SRS Stars + Photo Count Pill */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 pointer-events-none">
          {imagesCount > 1 && (
            <span className="text-[10px] font-mono text-cyan-300 bg-black/70 px-1.5 py-0.5 rounded-md border border-white/10 backdrop-blur-md font-semibold">
              {activePhotoIdx + 1}/{imagesCount}
            </span>
          )}
          <div className="flex items-center gap-0.5 text-amber-400 text-[11px] bg-black/70 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-md font-mono">
            {stars}
          </div>
        </div>

        

        {/* Sealed Indicator if Inactive */}
        {!character.isActive && (
          <div className="absolute top-1/2 inset-x-0 -translate-y-1/2 text-center pointer-events-none">
            <span className="bg-black/80 text-white/80 font-mono text-xs uppercase px-3 py-1 rounded-full border border-white/20 backdrop-blur-md">
              Sealed (Archived)
            </span>
          </div>
        )}

        {/* Bottom Performer Info */}
        <div className="absolute bottom-2.5 inset-x-3 pointer-events-none">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-extrabold text-white text-base truncate drop-shadow-sm">
              {character.name}
            </h3>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mt-0.5">
            <span>{accuracy}% Acc</span>
            <span className="text-white/40">{total} Runs</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
