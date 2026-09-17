import { motion } from 'motion/react';

interface CategoryCardProps {
  title: string;
  images: string[];
  accentClassName: string;
  onClick: () => void;
}

export default function CategoryCard({ title, images, accentClassName, onClick }: CategoryCardProps) {
  const previewImages = images.slice(0, 4);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="group relative aspect-[4/3] w-full overflow-hidden rounded-card border border-bg-hover bg-bg-card text-left"
    >
      {previewImages.length > 0 ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
          {previewImages.map((url, i) => (
            <div key={i} className="overflow-hidden bg-bg-muted">
              <img
                src={url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

      <div className={`absolute inset-x-0 bottom-0 h-1 ${accentClassName}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-3 left-4 right-4 truncate text-lg sm:text-xl font-bold text-white drop-shadow">
        {title}
      </div>
    </motion.button>
  );
}
