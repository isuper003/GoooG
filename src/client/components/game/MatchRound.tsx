import { useEffect } from 'react';
import { motion } from 'motion/react';

interface MatchRoundProps {
  promptName: string;
  tiles: { characterId: number; imageUrl: string }[];
  correctCharacterId: number;
  isAnswered: boolean;
  selectedCharacterId: number | null;
  onSelect: (characterId: number) => void;
}

export default function MatchRound({
  promptName,
  tiles,
  correctCharacterId,
  isAnswered,
  selectedCharacterId,
  onSelect,
}: MatchRoundProps) {
  useEffect(() => {
    if (isAnswered) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && tiles[0]) onSelect(tiles[0].characterId);
      if (e.key === 'ArrowRight' && tiles[1]) onSelect(tiles[1].characterId);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAnswered, tiles, onSelect]);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-fg text-center">{promptName}</h2>

      <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
        {tiles.map((tile) => {
          const isCorrectTile = tile.characterId === correctCharacterId;
          const isSelected = tile.characterId === selectedCharacterId;

          let ringClasses = 'border-transparent hover:border-bg-hover';
          if (isAnswered) {
            if (isCorrectTile) {
              ringClasses = 'border-emerald-500 ring-2 ring-emerald-500/50';
            } else if (isSelected) {
              ringClasses = 'border-rose-500 ring-2 ring-rose-500/50 opacity-70';
            } else {
              ringClasses = 'border-transparent opacity-40';
            }
          }

          return (
            <motion.button
              key={tile.characterId}
              type="button"
              disabled={isAnswered}
              onClick={() => onSelect(tile.characterId)}
              whileTap={{ scale: isAnswered ? 1 : 0.97 }}
              className={`w-full sm:w-56 aspect-square rounded-card overflow-hidden border-2 bg-bg-muted transition-all duration-150 ${ringClasses}`}
            >
              {tile.imageUrl ? (
                <img
                  src={tile.imageUrl}
                  alt="Choose this character"
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
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
