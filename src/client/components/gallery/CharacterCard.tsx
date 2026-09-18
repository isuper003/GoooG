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
  onToggleActive: () => void;
  isTogglingActive?: boolean;
}

export default function CharacterCard({
  character,
  onEdit,
  onViewImages,
  onDelete,
  onToggleActive,
  isTogglingActive,
}: CharacterCardProps) {
  const primaryImage = character.images[0]?.url;

  return (
    <motion.div
      layout
      className={`flex flex-col overflow-hidden bg-bg-card border-2 border-bg-hover transition-opacity ${
        character.isActive ? '' : 'opacity-60'
      }`}
    >
      <button
        type="button"
        onClick={onViewImages}
        className="card-notch relative aspect-square w-full overflow-hidden bg-bg-muted"
      >
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={character.name}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover ${character.isActive ? '' : 'grayscale'}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.2';
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-fg-dim">
            No image
          </div>
        )}
        {!character.isActive ? (
          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 font-mono text-[10px] font-bold text-white uppercase tracking-wider">
            Sealed
          </div>
        ) : null}
      </button>

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-display font-semibold text-fg">{character.name}</span>
          <span
            className={`shrink-0 rounded-badge px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
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

        <div className="flex items-center gap-3 font-mono text-xs text-fg-muted">
          <span className="text-emerald-400">&#10003; {character.correctCount}</span>
          <span className="text-rose-400">&#10007; {character.wrongCount}</span>
          <span>SRS {character.srsLevel}</span>
        </div>

        <button
          type="button"
          onClick={onToggleActive}
          disabled={isTogglingActive}
          className={`rounded-button px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            character.isActive
              ? 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg'
              : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
          }`}
          title={
            character.isActive
              ? 'Hide this character from the game'
              : 'Show this character in the game again'
          }
        >
          {character.isActive ? '👁 In rotation' : '🚫 Sealed — tap to reopen'}
        </button>

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
