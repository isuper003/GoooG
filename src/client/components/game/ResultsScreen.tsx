import type { MissedCharacter } from '../../hooks/useGameSession';

interface ResultsScreenProps {
  missedCharacters: MissedCharacter[];
  onPractice: () => void;
  onSkip: () => void;
}

export default function ResultsScreen({
  missedCharacters,
  onPractice,
  onSkip,
}: ResultsScreenProps) {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <div>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
          {missedCharacters.length} open {missedCharacters.length === 1 ? 'case' : 'cases'}
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
          Review Missed Performers
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Reinforce visual retention by running immediate remediation on missed cards.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {missedCharacters.map((c) => (
          <div
            key={c.id}
            className="flex flex-col items-center gap-2.5 hairline-card rounded-2xl p-3 border border-white/10"
          >
            <div className="w-full aspect-[3/4] overflow-hidden rounded-xl bg-black border border-white/10">
              {c.imageUrl ? (
                <img
                  src={c.imageUrl}
                  alt={c.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0.3';
                  }}
                />
              ) : null}
            </div>
            <span className="text-xs font-display font-bold text-white text-center truncate w-full">
              {c.name}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onPractice}
          className="flex-1 py-3 px-4 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs tracking-wide transition-all shadow-xl shadow-cyan-400/20 cursor-pointer"
        >
          Practice Missed Candidates →
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="py-3 px-5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white font-mono text-xs border border-white/10 transition-colors cursor-pointer"
        >
          Skip Remediation
        </button>
      </div>
    </div>
  );
}
