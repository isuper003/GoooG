import { useEffect } from 'react';
import { motion } from 'motion/react';

interface ClassicRoundProps {
  imageUrl: string;
  options: { characterId: number; name: string }[];
  correctCharacterId: number;
  isAnswered: boolean;
  selectedCharacterId: number | null;
  onSelect: (characterId: number) => void;
}

export default function ClassicRound({
  imageUrl,
  options,
  correctCharacterId,
  isAnswered,
  selectedCharacterId,
  onSelect,
}: ClassicRoundProps) {
  useEffect(() => {
    if (isAnswered) return;
    function handleKey(e: KeyboardEvent) {
      const index = Number(e.key) - 1;
      if (index >= 0 && index < options.length) {
        onSelect(options[index].characterId);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAnswered, options, onSelect]);

  return (
    <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="w-full md:w-1/2 aspect-square rounded-card overflow-hidden bg-bg-muted shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Guess this character"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.2';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-fg-dim text-sm">
            No image
          </div>
        )}
      </div>

      <div className="w-full md:w-1/2 flex flex-col gap-3">
        {options.map((option, index) => {
          const isCorrectOption = option.characterId === correctCharacterId;
          const isSelected = option.characterId === selectedCharacterId;

          let stateClasses = 'bg-bg-card border-bg-hover hover:bg-bg-hover';
          if (isAnswered) {
            if (isCorrectOption) {
              stateClasses = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
            } else if (isSelected) {
              stateClasses = 'bg-rose-500/20 border-rose-500 text-rose-300';
            } else {
              stateClasses = 'bg-bg-card border-bg-hover opacity-50';
            }
          }

          return (
            <motion.button
              key={option.characterId}
              type="button"
              disabled={isAnswered}
              onClick={() => onSelect(option.characterId)}
              whileTap={{ scale: isAnswered ? 1 : 0.97 }}
              className={`flex items-center gap-3 rounded-button border px-4 py-3 text-left text-fg font-medium transition-colors duration-150 ${stateClasses}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-badge bg-bg-muted text-xs font-semibold text-fg-muted">
                {index + 1}
              </span>
              {option.name}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
