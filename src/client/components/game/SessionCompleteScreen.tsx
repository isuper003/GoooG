import { Link } from 'react-router-dom';
import type { FinalSummary } from '../../hooks/useGameSession';

interface SessionCompleteScreenProps {
  summary: FinalSummary;
}

export default function SessionCompleteScreen({ summary }: SessionCompleteScreenProps) {
  const accuracyPct = Math.round(summary.accuracy * 100);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 text-center">
      <div>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          Case closed
        </span>
        <h2 className="font-display text-3xl font-semibold text-fg mt-1">Session complete</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="bg-bg-card border-2 border-bg-hover p-4">
          <div className="font-mono text-3xl font-semibold text-fg">{summary.totalRoundsPlayed}</div>
          <div className="text-xs text-fg-muted mt-1">Rounds played</div>
        </div>
        <div className="bg-bg-card border-2 border-bg-hover p-4">
          <div className="font-mono text-3xl font-semibold text-fg">{accuracyPct}%</div>
          <div className="text-xs text-fg-muted mt-1">Accuracy</div>
        </div>
        <div className="bg-bg-card border-2 border-bg-hover p-4">
          <div className="font-mono text-3xl font-semibold text-emerald-400">{summary.totalCorrect}</div>
          <div className="text-xs text-fg-muted mt-1">Correct</div>
        </div>
        <div className="bg-bg-card border-2 border-bg-hover p-4">
          <div className="font-mono text-3xl font-semibold text-rose-400">{summary.totalWrong}</div>
          <div className="text-xs text-fg-muted mt-1">Wrong</div>
        </div>
      </div>

      {summary.remediationRoundsPlayed > 0 ? (
        <p className="text-sm text-fg-muted">
          Plus {summary.remediationRoundsPlayed} practice{' '}
          {summary.remediationRoundsPlayed === 1 ? 'round' : 'rounds'} to master missed
          characters.
        </p>
      ) : null}

      <div className="flex gap-3 w-full">
        <Link
          to="/"
          className="flex-1 rounded-button bg-accent px-4 py-3 font-semibold text-white text-center transition-opacity hover:opacity-90"
        >
          Home
        </Link>
        <Link
          to="/gallery"
          className="flex-1 rounded-button bg-bg-muted px-4 py-3 font-medium text-fg text-center transition-colors hover:bg-bg-hover"
        >
          Gallery
        </Link>
      </div>
    </div>
  );
}
