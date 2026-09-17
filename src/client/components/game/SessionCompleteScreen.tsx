import { Link } from 'react-router-dom';
import type { FinalSummary } from '../../hooks/useGameSession';

interface SessionCompleteScreenProps {
  summary: FinalSummary;
}

export default function SessionCompleteScreen({ summary }: SessionCompleteScreenProps) {
  const accuracyPct = Math.round(summary.accuracy * 100);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 text-center">
      <h2 className="text-3xl font-extrabold text-fg">Session complete!</h2>

      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="rounded-card bg-bg-card border border-bg-hover p-4">
          <div className="text-3xl font-bold text-fg">{summary.totalRoundsPlayed}</div>
          <div className="text-xs text-fg-muted mt-1">Rounds played</div>
        </div>
        <div className="rounded-card bg-bg-card border border-bg-hover p-4">
          <div className="text-3xl font-bold text-fg">{accuracyPct}%</div>
          <div className="text-xs text-fg-muted mt-1">Accuracy</div>
        </div>
        <div className="rounded-card bg-bg-card border border-bg-hover p-4">
          <div className="text-3xl font-bold text-emerald-400">{summary.totalCorrect}</div>
          <div className="text-xs text-fg-muted mt-1">Correct</div>
        </div>
        <div className="rounded-card bg-bg-card border border-bg-hover p-4">
          <div className="text-3xl font-bold text-rose-400">{summary.totalWrong}</div>
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
          className="flex-1 rounded-button bg-category-male px-4 py-3 font-semibold text-white text-center transition-opacity hover:opacity-90"
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
