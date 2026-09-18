import { useState } from 'react';
import type { CharacterSort } from '../lib/apiClient';
import { useStatsOverview } from '../hooks/useStats';
import { useCharacters } from '../hooks/useCharacters';
import OverviewCards from '../components/stats/OverviewCards';
import CategoryAccuracyChart from '../components/stats/CategoryAccuracyChart';
import SrsDistributionChart from '../components/stats/SrsDistributionChart';
import CharacterStatsTable from '../components/stats/CharacterStatsTable';

export default function StatsPage() {
  const [sort, setSort] = useState<CharacterSort>('weakest');
  const { data: overview, isLoading: overviewLoading } = useStatsOverview();
  const { data: characters = [], isLoading: charactersLoading } = useCharacters({ sort });

  const isLoading = overviewLoading || charactersLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-fg">
          Statistics
        </h1>
        <p className="text-fg-muted mt-1 text-sm">
          Recognition accuracy ledger, category proficiency, and SRS retention levels.
        </p>
      </div>

      {isLoading || !overview ? (
        <p className="text-sm text-fg-muted">Loading...</p>
      ) : overview.gamesPlayed === 0 && characters.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-fg-muted">Play a game to see your stats here.</p>
        </div>
      ) : (
        <>
          <OverviewCards stats={overview} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CategoryAccuracyChart byCategory={overview.byCategory} />
            <SrsDistributionChart characters={characters} />
          </div>

          <CharacterStatsTable characters={characters} sort={sort} onSortChange={setSort} />
        </>
      )}
    </div>
  );
}
