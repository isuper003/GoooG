import type { StatsOverview } from '../../../shared/types';

interface OverviewCardsProps {
  stats: StatsOverview;
}

export default function OverviewCards({ stats }: OverviewCardsProps) {
  const accuracyPct = Math.round(stats.overallAccuracy * 100);

  const tiles = [
    { label: 'Games played', value: stats.gamesPlayed },
    { label: 'Rounds answered', value: stats.totalRoundsAnswered },
    { label: 'Overall accuracy', value: `${accuracyPct}%` },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="border-2 border-bg-hover bg-bg-card p-5 flex flex-col gap-1"
        >
          <span className="font-mono text-3xl font-semibold text-fg">{tile.value}</span>
          <span className="text-xs uppercase tracking-wider text-fg-dim font-semibold">
            {tile.label}
          </span>
        </div>
      ))}
    </div>
  );
}
