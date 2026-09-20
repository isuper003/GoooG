import type { CategoryStats } from '../../../shared/types';

const CATEGORY_LABELS: Record<string, string> = {
  trans: 'Trans',
  sluts: 'Sluts',
  twinks: 'Twinks',
};

const CATEGORY_BAR_CLASSES: Record<string, string> = {
  trans: 'bg-cyan-400',
  sluts: 'bg-pink-400',
  twinks: 'bg-purple-400',
};

interface CategoryAccuracyChartProps {
  byCategory: CategoryStats[];
}

export default function CategoryAccuracyChart({ byCategory }: CategoryAccuracyChartProps) {
  return (
    <div className="hairline-card rounded-2xl border border-white/10 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h2 className="font-display text-lg font-bold text-white">
          Accuracy by Category Deck
        </h2>
        <span className="text-[11px] font-mono text-cyan-400">Target: &gt;80%</span>
      </div>

      <div className="flex flex-col gap-3.5">
        {byCategory.map((cat) => {
          const pct = Math.round(cat.accuracy * 100);
          const total = cat.correct + cat.wrong;
          return (
            <div key={cat.category} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-white uppercase">
                  {CATEGORY_LABELS[cat.category] ?? cat.category}
                </span>
                <span className="text-white/60">
                  {total > 0 ? (
                    <>
                      <strong className="text-cyan-400 font-bold">{pct}%</strong> ({cat.correct}/{total})
                    </>
                  ) : (
                    'No tests yet'
                  )}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    CATEGORY_BAR_CLASSES[cat.category] ?? 'bg-cyan-400'
                  }`}
                  style={{ width: `${total > 0 ? pct : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
