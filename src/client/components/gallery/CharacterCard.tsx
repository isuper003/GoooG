import { motion } from 'motion/react';
import type { CharacterDTO } from '../../../shared/types';

const CATEGORY_CLASSES: Record<string, string> = {
  trans: 'bg-category-trans/20 text-category-trans',
  sluts: 'bg-category-sluts/20 text-category-sluts',
  sl: 'bg-category-sl/20 text-category-sl',
  twinks: 'bg-category-twinks/20 text-category-twinks',
};

interface CharacterCardProps {
  character: CharacterDTO;
  onEdit: () => void;
  onViewImages: () => void;
  onDelete: () => void;
}

export default function CharacterCard({
  character,
  onEdit,
  onViewImages,
  onDelete,
}: CharacterCardProps) {
  const primaryImage = character.images[0]?.url;

  return (
    <motion.div
      layout
      className="flex flex-col overflow-hidden rounded-card border border-bg-hover bg-bg-card"
    >
      <button
        type="button"
        onClick={onViewImages}
        className="aspect-square w-full overflow-hidden bg-bg-muted"
      >
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={character.name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.2';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-fg-dim">
            No image
          </div>
        )}
      </button>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-fg">{character.name}</span>
          <span
            className={`shrink-0 rounded-badge px-2 py-0.5 text-[10px] font-semibold uppercase ${
              CATEGORY_CLASSES[character.categoryKey] ?? 'bg-bg-muted text-fg-muted'
            }`}
          >
            {character.categoryKey}
          </span>
        </div>

        {character.labels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {character.labels.map((label) => (
              <span
                key={label.id}
                className="rounded-badge bg-bg-muted px-2 py-0.5 text-[10px] text-fg-muted"
              >
                {label.name}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span className="text-emerald-400">&#10003; {character.correctCount}</span>
          <span className="text-rose-400">&#10007; {character.wrongCount}</span>
          <span>SRS {character.srsLevel}</span>
        </div>

        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 rounded-button bg-bg-muted px-2 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-bg-hover"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex-1 rounded-button bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            Delete
          </button>
        </div>
      </div>
    </motion.div>
  );
}
