import type { StatsOverview, CharacterDTO } from '../../../shared/types';

interface OverviewCardsProps {
  stats: StatsOverview;
  characters?: CharacterDTO[];
}

export default function OverviewCards({ stats, characters = [] }: OverviewCardsProps) {
  const accuracyPct = Math.round(stats.overallAccuracy * 100);
  const masteredCount = characters.filter((c) => c.srsLevel >= 4).length;
  const weakCount = characters.filter((c) => c.wrongCount > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="hairline-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
        <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
          Total Rounds Tested
        </span>
        <div className="text-3xl sm:text-4xl font-display font-bold text-white mt-1">
          {stats.totalRoundsAnswered}
        </div>
        <span className="text-[11px] font-mono text-emerald-400 mt-2 block">
          {stats.gamesPlayed} Sessions Engaged
        </span>
      </div>

      <div className="hairline-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
        <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
          Global Retention Accuracy
        </span>
        <div className="text-3xl sm:text-4xl font-display font-bold text-cyan-400 mt-1">
          {accuracyPct}%
        </div>
        <span className="text-[11px] font-mono text-cyan-400/70 mt-2 block">
          Across All Decks
        </span>
      </div>

      <div className="hairline-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
        <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
          Mastered Performers (SRS &ge; 4)
        </span>
        <div className="text-3xl sm:text-4xl font-display font-bold text-amber-400 mt-1">
          {masteredCount}
        </div>
        <span className="text-[11px] font-mono text-amber-300/70 mt-2 block">
          {characters.length > 0
            ? `${Math.round((masteredCount / characters.length) * 100)}% of Roster`
            : '0% of Roster'}
        </span>
      </div>

      <div className="hairline-card rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
        <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
          Remediation Flagged
        </span>
        <div className="text-3xl sm:text-4xl font-display font-bold text-rose-400 mt-1">
          {weakCount}
        </div>
        <span className="text-[11px] font-mono text-rose-300/70 mt-2 block">
          Needs Reinforcement
        </span>
      </div>
    </div>
  );
}
