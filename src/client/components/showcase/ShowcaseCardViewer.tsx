import { useState } from 'react';
import type { CharacterDTO } from '../../../shared/types';
import { toProxiedImageUrl } from '../../lib/imageUrl';

const CATEGORY_BADGES: Record<string, { label: string; badgeClass: string; accentColor: string }> = {
  trans: {
    label: 'Trans',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    accentColor: '#06b6d4',
  },
  sluts: {
    label: 'Sluts',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    accentColor: '#ec4899',
  },
  sl: {
    label: 'Sluts',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    accentColor: '#ec4899',
  },
  twinks: {
    label: 'Twinks',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accentColor: '#a855f7',
  },
};

interface ShowcaseCardViewerProps {
  character: CharacterDTO;
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function ShowcaseCardViewer({
  character,
  currentIndex,
  totalCount,
  onPrev,
  onNext,
}: ShowcaseCardViewerProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const images = character.images || [];
  const safeImageIndex = Math.min(activeImageIndex, Math.max(0, images.length - 1));
  const currentImage = images[safeImageIndex]?.url;

  const categoryMeta = CATEGORY_BADGES[character.categoryKey] ?? {
    label: character.categoryKey,
    badgeClass: 'bg-white/10 text-white/80 border-white/20',
    accentColor: '#22d3ee',
  };

  const totalReviews = character.correctCount + character.wrongCount;
  const accuracy = totalReviews > 0 ? ((character.correctCount / totalReviews) * 100).toFixed(1) : '100.0';
  const starsCount = Math.min(5, Math.max(1, character.srsLevel));
  const stars = '★'.repeat(starsCount) + '☆'.repeat(5 - starsCount);

  return (
    <div className="relative w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto flex flex-col items-center">
      {/* Main Floating Card Container */}
      <div className="w-full hairline-card rounded-3xl overflow-hidden border border-white/15 bg-[#090d14] shadow-2xl relative group">
        {/* Top Floating Badge Strip */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md ${categoryMeta.badgeClass}`}
            >
              {categoryMeta.label}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-black/70 text-amber-300 border border-amber-300/30 backdrop-blur-md">
              Level {character.srsLevel} SRS
            </span>
          </div>

          <div className="pointer-events-auto px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-black/70 text-white/80 border border-white/15 backdrop-blur-md">
            {currentIndex + 1} / {totalCount}
          </div>
        </div>

        {/* Character Image Stage */}
        <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[55vh] sm:max-h-[60vh] bg-black overflow-hidden flex items-center justify-center">
          {currentImage ? (
            <img
              src={toProxiedImageUrl(currentImage)}
              alt={character.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top filter brightness-[0.95] contrast-[1.05]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.3';
              }}
            />
          ) : (
            <div className="text-white/40 font-mono text-sm">No Image Available</div>
          )}

          {/* Ambient subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-transparent to-black/40 pointer-events-none" />

          {/* Multi-image indicators/arrows if character has > 1 images */}
          {images.length > 1 && (
            <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((i) => (i - 1 + images.length) % images.length);
                }}
                className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 backdrop-blur-md text-xs transition-colors cursor-pointer"
                title="Previous photo"
              >
                ◀
              </button>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`pointer-events-auto h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === safeImageIndex ? 'w-4 bg-cyan-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveImageIndex((i) => (i + 1) % images.length);
                }}
                className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center border border-white/20 backdrop-blur-md text-xs transition-colors cursor-pointer"
                title="Next photo"
              >
                ▶
              </button>
            </div>
          )}
        </div>

        {/* Card Details Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-2.5 bg-[#090d14] border-t border-white/[0.08]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {character.name}
            </h3>
            <span className="text-amber-400 text-sm font-mono tracking-wider shrink-0">{stars}</span>
          </div>

          {/* Stats Ribbon */}
          <div className="flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-mono text-white/70 flex-wrap">
            <div>
              Retention: <strong className="text-cyan-400 font-bold">{accuracy}%</strong>
            </div>
            <div className="h-3 w-px bg-white/15" />
            <div>
              Reviews: <strong className="text-white font-bold">{totalReviews}</strong>
            </div>
            <div className="h-3 w-px bg-white/15" />
            <div>
              Status:{' '}
              <strong className={character.isActive ? 'text-emerald-400 font-bold' : 'text-zinc-500 font-bold'}>
                {character.isActive ? 'Active' : 'Archived'}
              </strong>
            </div>
          </div>

          {/* Labels / Tags */}
          {character.labels && character.labels.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {character.labels.map((lbl) => (
                <span
                  key={lbl.id}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/80 border border-white/10"
                >
                  #{lbl.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Prev / Next Arrow Dock Buttons (Sides) */}
      {totalCount > 1 && (
        <>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous character"
            className="absolute -left-3 sm:-left-12 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/80 hover:bg-black text-white hover:text-cyan-300 border border-white/20 hover:border-cyan-400/50 flex items-center justify-center shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next character"
            className="absolute -right-3 sm:-right-12 top-1/2 -translate-y-1/2 z-30 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/80 hover:bg-black text-white hover:text-cyan-300 border border-white/20 hover:border-cyan-400/50 flex items-center justify-center shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
