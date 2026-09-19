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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const index = Number(e.key) - 1;
      if (index >= 0 && index < options.length) {
        onSelect(options[index].characterId);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isAnswered, options, onSelect]);

  const gotItRight = isAnswered && selectedCharacterId === correctCharacterId;
  const correctOption = options.find((opt) => opt.characterId === correctCharacterId);

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-10 items-center">
      {/* Left: Centerpiece Theater Portrait (7 cols on desktop) */}
      <div className="md:col-span-7 relative aspect-[3/4] sm:aspect-[4/4.8] w-full rounded-3xl overflow-hidden border border-white/15 bg-black shadow-2xl group character-glow">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Target Performer"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top filter brightness-[0.95] contrast-[1.05] transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.opacity = '0.3';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 font-mono text-sm">
            No portrait available
          </div>
        )}

        {/* Cinematic Crosshairs Overlays */}
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80 pointer-events-none" />

        {/* Floating Target Badge */}
        <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
          <div className="px-4 py-1.5 rounded-full bg-black/75 border border-white/15 text-xs font-mono text-white/90 backdrop-blur-md shadow-lg tracking-wider">
            IDENTIFY PERFORMER
          </div>
        </div>

        {/* Bottom Key Hint */}
        <div className="absolute bottom-4 right-4 bg-black/75 px-3 py-1.5 rounded-xl border border-white/10 text-[11px] font-mono text-white/70 backdrop-blur-md pointer-events-none">
          Keys [1 &ndash; 4]
        </div>

        {/* Instant Feedback HUD Overlay */}
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30"
          >
            <div
              className={`px-8 py-3 rounded-2xl text-xl font-display font-black uppercase tracking-wider shadow-2xl ${
                gotItRight
                  ? 'bg-cyan-400 text-black shadow-cyan-400/30'
                  : 'bg-rose-500 text-white shadow-rose-500/30'
              }`}
            >
              {gotItRight ? '✓ Recognized' : '✗ Missed'}
            </div>
            <div className="text-sm font-mono text-white/90">
              {correctOption ? `${correctOption.name} · Target Verified` : ''}
            </div>
          </motion.div>
        )}
      </div>

      {/* Right: Tactile Options Column (5 cols on desktop) */}
      <div className="md:col-span-5 flex flex-col justify-center gap-4 w-full">
        <div className="flex flex-col gap-1 pb-1 border-b border-white/[0.08]">
          <span className="font-mono text-[11px] text-cyan-400 font-bold uppercase tracking-wider">
            Performer Selection
          </span>
          <h3 className="font-display font-black text-white text-xl sm:text-2xl tracking-tight">
            Who is this target?
          </h3>
        </div>

        <div className="flex flex-col gap-3 w-full">
          {options.map((option, index) => {
            const isCorrectOption = option.characterId === correctCharacterId;
            const isSelected = option.characterId === selectedCharacterId;

            let stateClasses = 'hairline-card hover:border-cyan-400/60';
            if (isAnswered) {
              if (isCorrectOption) {
                stateClasses = 'border-cyan-400 bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/40';
              } else if (isSelected) {
                stateClasses = 'border-rose-500 bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40';
              } else {
                stateClasses = 'hairline-card opacity-35';
              }
            }

            return (
              <motion.button
                key={option.characterId}
                type="button"
                disabled={isAnswered}
                onClick={() => onSelect(option.characterId)}
                whileTap={{ scale: isAnswered ? 1 : 0.97 }}
                className={`key-btn p-4 rounded-2xl flex items-center justify-between text-left group cursor-pointer transition-all ${stateClasses}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-colors shrink-0 ${
                      isAnswered && isCorrectOption
                        ? 'bg-cyan-400 text-black'
                        : 'bg-white/10 text-white/80 group-hover:bg-cyan-400 group-hover:text-black'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-display font-bold text-base text-white truncate">
                    {option.name}
                  </span>
                </div>
                <span className="text-xs text-white/20 group-hover:text-cyan-400 font-mono shrink-0 ml-2">
                  ↵
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-white/40 pt-1 px-1">
          <span>Click or press keys [1 &ndash; 4]</span>
          <span className="text-cyan-400 font-semibold">Instant Input</span>
        </div>
      </div>
    </div>
  );
}
