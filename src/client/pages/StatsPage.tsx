import { useState } from 'react';
import type { CharacterSort } from '../lib/apiClient';
import { useStatsOverview, useConfusions } from '../hooks/useStats';
import { useCharacters } from '../hooks/useCharacters';
import OverviewCards from '../components/stats/OverviewCards';
import CategoryAccuracyChart from '../components/stats/CategoryAccuracyChart';
import SrsDistributionChart from '../components/stats/SrsDistributionChart';
import ConfusedPairsList from '../components/stats/ConfusedPairsList';
import CharacterStatsTable from '../components/stats/CharacterStatsTable';

export default function StatsPage() {
  const [sort, setSort] = useState<CharacterSort>('weakest');
  const { data: overview, isLoading: overviewLoading } = useStatsOverview();
  const { data: characters = [], isLoading: charactersLoading } = useCharacters({ sort });
  const { data: confusions = [] } = useConfusions();

  const isLoading = overviewLoading || charactersLoading;

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="border-b border-white/[0.08] pb-5">
        <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
          Analytics &amp; Performance
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mt-0.5">
          Recognition &amp; Retention Stats
        </h1>
        <p className="text-white/50 mt-1 text-xs">
          Cross-category accuracy telemetry, SRS spaced-repetition distribution, and performer retention ranks.
        </p>
      </div>

      {isLoading || !overview ? (
        <div className="flex items-center justify-center py-24 text-cyan-400 font-mono text-xs">
          Loading analytics telemetry...
        </div>
      ) : overview.totalRoundsAnswered === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center hairline-card rounded-3xl p-8 border border-white/10">
          <p className="font-display text-xl text-white">No telemetry recorded yet</p>
          <p className="text-xs text-white/50">Engage in an Arena session to populate your retention metrics.</p>
        </div>
      ) : (
        <>
          <OverviewCards stats={overview} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <CategoryAccuracyChart byCategory={overview.byCategory} />
            <SrsDistributionChart characters={characters} />
          </div>

          <ConfusedPairsList pairs={confusions} />

          <CharacterStatsTable characters={characters} sort={sort} onSortChange={setSort} />
        </>
      )}
    </div>
  );
}
