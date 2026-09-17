import type { CharacterDTO } from '../../../shared/types';

interface SrsDistributionChartProps {
  characters: CharacterDTO[];
}

const LEVELS = [0, 1, 2, 3, 4, 5];

export default function SrsDistributionChart({ characters }: SrsDistributionChartProps) {
  const counts = LEVELS.map((level) => characters.filter((c) => c.srsLevel === level).length);
  const maxCount = Math.max(1, ...counts);

  return (
    <div className="rounded-card border border-bg-hover bg-bg-card p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-dim">
        SRS level distribution
      </h2>
      <div className="flex items-end justify-between gap-2 h-32">
        {LEVELS.map((level, i) => {
          const count = counts[i];
          const heightPct = (count / maxCount) * 100;
          return (
            <div key={level} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-fg">{count}</span>
              <div className="flex h-24 w-full items-end">
                <div
                  className="w-full rounded-t-button bg-category-male/70 transition-all duration-300"
                  style={{ height: `${count > 0 ? Math.max(heightPct, 6) : 0}%` }}
                />
              </div>
              <span className="text-xs text-fg-dim">{level}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-fg-dim">Level 0 = new/weak &middot; Level 5 = mastered</p>
    </div>
  );
}
