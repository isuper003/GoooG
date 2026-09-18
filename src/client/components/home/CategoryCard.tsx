import { motion } from 'motion/react';

interface CategoryCardProps {
  title: string;
  tag: string;
  images: string[];
  accentClassName: string;
  borderClassName: string;
  onClick: () => void;
}

export default function CategoryCard({
  title,
  tag,
  images,
  accentClassName,
  borderClassName,
  onClick,
}: CategoryCardProps) {
  const previewImages = images.slice(0, 4);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`card-notch group relative aspect-[3/4] w-full overflow-hidden border-2 border-transparent bg-bg-card text-left transition-colors duration-150 ${borderClassName}`}
    >
      {previewImages.length > 0 ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
          {previewImages.map((url, i) => (
            <div key={i} className="overflow-hidden bg-bg-muted">
              <img
                src={url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          {Array.from({ length: Math.max(0, 4 - previewImages.length) }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-bg-muted" />
          ))}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-fg-dim text-sm">
          No characters yet
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      <div className={`absolute top-0 left-0 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white ${accentClassName}`}>
        {tag}
      </div>

      <div className="absolute inset-x-0 bottom-0 px-3 py-2.5">
        <div className="font-display text-lg sm:text-xl font-semibold text-white">{title}</div>
      </div>
    </motion.button>
  );
}
