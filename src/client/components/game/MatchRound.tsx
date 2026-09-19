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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft' && tiles[0]) onSelect(tiles[0].characterId);
      if (e.key === 'ArrowRight' && tiles[1]) onSelect(tiles[1].characterId);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAnswered, tiles, onSelect]);

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-semibold">
          Which image belongs to:
        </span>
        <h2 className="text-3xl sm:text-5xl font-display font-black text-white mt-1 tracking-tight">
          {promptName}
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {tiles.map((tile, index) => {
          const isCorrectTile = tile.characterId === correctCharacterId;
          const isSelected = tile.characterId === selectedCharacterId;

          let ringClasses = 'border-white/10 hover:border-cyan-400/80';
          if (isAnswered) {
            if (isCorrectTile) {
              ringClasses = 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-400/50';
            } else if (isSelected) {
              ringClasses = 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/50 opacity-70';
            } else {
              ringClasses = 'border-white/10 opacity-30';
            }
          }

          return (
            <motion.button
              key={tile.characterId}
              type="button"
              disabled={isAnswered}
              onClick={() => onSelect(tile.characterId)}
              whileTap={{ scale: isAnswered ? 1 : 0.98 }}
              className={`hairline-card rounded-3xl aspect-[3/4] overflow-hidden cursor-pointer group relative transition-all border-2 text-left w-full ${ringClasses}`}
            >
              {tile.imageUrl ? (
                <img
                  src={tile.imageUrl}
                  alt={`Candidate ${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0.3';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono text-white/40 text-sm">
                  No portrait
                </div>
              )}

              {/* Bottom Key Cue */}
              <div className="absolute bottom-4 inset-x-4 text-center pointer-events-none">
                <span className="px-4 py-1.5 rounded-xl text-xs font-mono font-bold bg-black/80 text-white backdrop-blur-md border border-white/20 shadow-lg">
                  {index === 0 ? 'Key: [← Left Arrow]' : 'Key: [→ Right Arrow]'}
                </span>
              </div>

              {/* Feedback Overlay */}
              {isAnswered && isCorrectTile && (
                <div className="absolute inset-0 bg-cyan-950/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                  <div className="px-6 py-2.5 rounded-2xl bg-cyan-400 text-black font-display font-black text-lg uppercase tracking-wider shadow-2xl">
                    ✓ Verified Match
                  </div>
                </div>
              )}

              {isAnswered && isSelected && !isCorrectTile && (
                <div className="absolute inset-0 bg-rose-950/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
                  <div className="px-6 py-2.5 rounded-2xl bg-rose-500 text-white font-display font-black text-lg uppercase tracking-wider shadow-2xl">
                    ✗ Wrong Performer
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
