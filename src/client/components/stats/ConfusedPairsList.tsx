import type { ConfusedPair } from '../../../shared/types';

interface ConfusedPairsListProps {
  pairs?: ConfusedPair[];
}

export function ConfusedPairsList({ pairs = [] }: ConfusedPairsListProps) {
  if (!pairs || pairs.length === 0) {
    return null;
  }

  const maxCount = Math.max(1, ...pairs.map((p) => p.count));

  return (
    <div className="hairline-card rounded-2xl border border-white/10 p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <h2 className="font-display text-lg font-bold text-white">
          Confused Pairs
        </h2>
        <span className="text-[11px] font-mono text-cyan-400">Recurring Discrimination Errors</span>
      </div>

      <div className="flex flex-col gap-3.5">
        {pairs.map((pair) => {
          const pct = Math.round((pair.count / maxCount) * 100);
          return (
            <div key={`${pair.targetId}-${pair.selectedId}`} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-white truncate">{pair.targetName}</span>
                  <span className="text-white/50 text-[11px] shrink-0">&middot; mistaken for &middot;</span>
                  <span className="text-white/70 truncate">{pair.selectedName}</span>
                </div>
                <span className="text-cyan-400 font-bold shrink-0 ml-3">{pair.count}x</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ConfusedPairsList;
