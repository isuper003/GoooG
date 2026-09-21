import type { ReactElement } from 'react';
import { useReviewQueues } from '../../hooks/useReview';
import { usePresetSession } from '../../hooks/usePresetSession';

interface LeechAlertProps {
  className?: string;
}

export default function LeechAlert({ className }: LeechAlertProps): ReactElement | null {
  const { data: queues } = useReviewQueues();
  const { startPresetSession, isStarting, startError } = usePresetSession();

  const count = queues?.leech?.count ?? 0;
  if (count === 0) {
    return null;
  }

  return (
    <div
      className={`hairline-card rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        className ?? ''
      }`}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display font-bold text-base sm:text-lg text-rose-400 flex items-center gap-2">
          <span>🩺</span>
          <span>
            {count} {count === 1 ? 'character needs' : 'characters need'} rescue
          </span>
        </h2>
        <p className="text-white/60 text-xs leading-relaxed">
          Critical retention drop detected. Engage in a targeted rescue drill to restore memory strength.
        </p>
        {startError && (
          <span className="text-xs font-mono text-rose-300 mt-1">
            {startError}
          </span>
        )}
      </div>

      <button
        type="button"
        disabled={isStarting}
        onClick={() => startPresetSession('leech', count)}
        className="shrink-0 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-mono text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
      >
        {isStarting ? (
          <>
            <span className="inline-block animate-spin font-mono text-xs leading-none">⟳</span>
            <span>Starting Drill...</span>
          </>
        ) : (
          <span>Start Rescue Drill →</span>
        )}
      </button>
    </div>
  );
}
