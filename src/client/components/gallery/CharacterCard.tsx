import { motion } from 'motion/react';
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
  onEdit: () => void;
  onViewImages: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isTogglingActive?: boolean;
}

export default function CharacterCard({
  character,
  isSelected,
  onSelect,
}: CharacterCardProps) {
  const primaryImage = character.images[0]?.url;
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
      className={`hairline-card rounded-2xl overflow-hidden group cursor-pointer transition-all flex flex-col justify-between ${
        isSelected
          ? 'border-2 border-cyan-400 shadow-xl shadow-cyan-400/10 scale-[1.01]'
          : 'border border-white/10 hover:border-white/40'
      } ${character.isActive ? '' : 'opacity-50 grayscale'}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black">
        {primaryImage ? (
          <img
            src={toProxiedImageUrl(primaryImage)}
            alt={character.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
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

        {/* Ambient Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 pointer-events-none" />

        {/* Category Pill on Top Left */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border backdrop-blur-md ${categoryMeta.badgeClass}`}
          >
            {categoryMeta.label}
          </span>
        </div>

        {/* SRS Stars on Top Right */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 text-amber-400 text-[11px] bg-black/70 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-md font-mono">
          {stars}
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
          <h3 className="font-display font-extrabold text-white text-base truncate drop-shadow-sm">
            {character.name}
          </h3>
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mt-0.5">
            <span>{accuracy}% Acc</span>
            <span className="text-white/40">{total} Runs</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
