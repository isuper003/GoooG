import { Link } from 'react-router-dom';
import type { FinalSummary } from '../../hooks/useGameSession';

interface SessionCompleteScreenProps {
  summary: FinalSummary;
}

export default function SessionCompleteScreen({ summary }: SessionCompleteScreenProps) {
  const accuracyPct = Math.round(summary.accuracy * 100);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 text-center py-6">
      <div>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
          Investigation Completed
        </span>
        <h2 className="font-display text-3xl font-bold text-white mt-1">Session Debrief</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        <div className="hairline-card rounded-2xl p-4 border border-white/10">
          <div className="font-mono text-3xl font-bold text-white">{summary.totalRoundsPlayed}</div>
          <div className="text-xs font-mono text-white/50 mt-1">Rounds Cleared</div>
        </div>
        <div className="hairline-card rounded-2xl p-4 border border-white/10">
          <div className="font-mono text-3xl font-bold text-cyan-400">{accuracyPct}%</div>
          <div className="text-xs font-mono text-white/50 mt-1">Retention Rate</div>
        </div>
        <div className="hairline-card rounded-2xl p-4 border border-white/10">
          <div className="font-mono text-3xl font-bold text-emerald-400">{summary.totalCorrect}</div>
          <div className="text-xs font-mono text-white/50 mt-1">Recognized</div>
        </div>
        <div className="hairline-card rounded-2xl p-4 border border-white/10">
          <div className="font-mono text-3xl font-bold text-rose-400">{summary.totalWrong}</div>
          <div className="text-xs font-mono text-white/50 mt-1">Missed</div>
        </div>
      </div>

      {summary.remediationRoundsPlayed > 0 ? (
        <p className="text-xs font-mono text-white/60">
          Completed {summary.remediationRoundsPlayed} remediation{' '}
          {summary.remediationRoundsPlayed === 1 ? 'drill' : 'drills'} to reinforce missed performers.
        </p>
      ) : null}

      <div className="flex gap-3 w-full pt-2">
        <Link
          to="/"
          className="flex-1 py-3 px-4 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs tracking-wide transition-all shadow-xl shadow-cyan-400/20 text-center"
        >
          Spotlight Home →
        </Link>
        <Link
          to="/gallery"
          className="flex-1 py-3 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white font-mono text-xs border border-white/10 transition-colors text-center"
        >
          Character Gallery
        </Link>
      </div>
    </div>
  );
}
