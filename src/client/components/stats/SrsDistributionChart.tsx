import type { CharacterDTO } from '../../../shared/types';

interface SrsDistributionChartProps {
  characters: CharacterDTO[];
}

const LEVELS = [0, 1, 2, 3, 4, 5];

export default function SrsDistributionChart({ characters }: SrsDistributionChartProps) {
  const counts = LEVELS.map((level) => characters.filter((c) => c.srsLevel === level).length);
  const maxCount = Math.max(1, ...counts);

  return (
    <div className="hairline-card rounded-2xl border border-white/10 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h2 className="font-display text-lg font-bold text-white">
          SRS Retention Distribution
        </h2>
        <span className="text-[11px] font-mono text-cyan-400">Levels 0 &ndash; 5</span>
      </div>

      <div className="flex items-end justify-between gap-3 h-36 pt-4">
        {LEVELS.map((level, i) => {
          const count = counts[i];
          const heightPct = (count / maxCount) * 100;
          return (
            <div key={level} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
              <span className="font-mono text-xs font-bold text-white">{count}</span>
              <div className="flex h-24 w-full items-end bg-white/[0.04] rounded-lg p-1 border border-white/5">
                <div
                  className="w-full bg-cyan-400 rounded-md transition-all duration-500 shadow-sm shadow-cyan-400/20"
                  style={{ height: `${count > 0 ? Math.max(heightPct, 8) : 0}%` }}
                />
              </div>
              <span className="font-mono text-[11px] text-white/50">Lvl {level}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] font-mono text-white/40 pt-1">
        Level 0 = In Initial Queue &middot; Level 5 = Fully Mastered Long-term Memory
      </p>
    </div>
  );
}
