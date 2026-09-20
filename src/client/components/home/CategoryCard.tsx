import { motion } from 'motion/react';
import { toProxiedImageUrl } from '../../lib/imageUrl';

interface CategoryCardProps {
  title: string;
  tag: string;
  image?: string;
  count: number;
  badgeClass?: string;
  onClick: () => void;
}

export default function CategoryCard({
  title,
  image,
  count,
  badgeClass,
  onClick,
}: CategoryCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className="hairline-card rounded-2xl overflow-hidden group cursor-pointer relative transition-all text-left w-full border border-white/10 hover:border-cyan-400 shadow-xl aspect-[9/16] flex flex-col justify-between"
    >
      {/* Full 9:16 Portrait Image */}
      <div className="absolute inset-0 bg-black">
        {image ? (
          <img
            src={toProxiedImageUrl(image)}
            alt={title}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover object-top scale-100 group-hover:scale-105 transition-transform duration-700 filter brightness-[0.88] contrast-[1.05]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-white/30">
            No portrait
          </div>
        )}

        {/* Translucent Ambient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/60 pointer-events-none" />
      </div>

      {/* Top Meta Floating Row */}
      <div className="relative z-10 p-3.5 flex items-center justify-between w-full">
        <span
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md ${
            badgeClass || 'bg-white/10 text-white/80 border-white/20'
          }`}
        >
          {title}
        </span>
        <span className="text-[10px] font-mono text-white/75 bg-black/50 px-2 py-0.5 rounded-full border border-white/10 backdrop-blur-md">
          {count} Cards
        </span>
      </div>

      {/* Bottom Title & Action Floating Row */}
      <div className="relative z-10 p-3.5 mt-auto flex flex-col gap-1 w-full pointer-events-none">
        <h3 className="font-display font-black text-white text-xl sm:text-2xl drop-shadow-md truncate">
          {title}
        </h3>
      </div>
    </motion.button>
  );
}

