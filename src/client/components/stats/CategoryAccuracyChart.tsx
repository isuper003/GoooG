import type { CategoryStats } from '../../../shared/types';

const CATEGORY_LABELS: Record<string, string> = {
  trans: 'Trans',
  sluts: 'Sluts',
  sl: 'Sluts',
  twinks: 'Twinks',
};

const CATEGORY_BAR_CLASSES: Record<string, string> = {
  trans: 'bg-category-trans',
  sluts: 'bg-category-sluts',
  sl: 'bg-category-sluts',
  twinks: 'bg-category-twinks',
};

interface CategoryAccuracyChartProps {
  byCategory: CategoryStats[];
}

export default function CategoryAccuracyChart({ byCategory }: CategoryAccuracyChartProps) {
  return (
    <div className="border-2 border-bg-hover bg-bg-card p-5 flex flex-col gap-4">
      <h2 className="font-display text-lg font-semibold text-fg">
        Accuracy by Category
      </h2>
      <div className="flex flex-col gap-3">
        {byCategory.map((cat) => {
          const pct = Math.round(cat.accuracy * 100);
          const total = cat.correct + cat.wrong;
          return (
            <div key={cat.category} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-fg">
                  {CATEGORY_LABELS[cat.category] ?? cat.category}
                </span>
                <span className="font-mono text-fg-muted">
                  {total > 0 ? `${pct}% (${cat.correct}/${total})` : 'No data yet'}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden bg-bg-muted">
                <div
                  className={`h-full transition-all duration-300 ${
                    CATEGORY_BAR_CLASSES[cat.category] ?? 'bg-fg-dim'
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
