import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CategoryCard from '../components/home/CategoryCard';
import GameSetupModal from '../components/home/GameSetupModal';
import { apiClient } from '../lib/apiClient';

type Scope = 'trans' | 'sluts' | 'twinks' | 'mix';

const CARDS: {
  scope: Scope;
  label: string;
  tag: string;
  accentClassName: string;
  borderClassName: string;
}[] = [
  {
    scope: 'trans',
    label: 'Trans',
    tag: 'TR',
    accentClassName: 'bg-category-trans',
    borderClassName: 'hover:border-category-trans',
  },
  {
    scope: 'sluts',
    label: 'Sluts',
    tag: 'SL',
    accentClassName: 'bg-category-sluts',
    borderClassName: 'hover:border-category-sluts',
  },
  {
    scope: 'twinks',
    label: 'Twinks',
    tag: 'TW',
    accentClassName: 'bg-category-twinks',
    borderClassName: 'hover:border-category-twinks',
  },
  {
    scope: 'mix',
    label: 'Mix',
    tag: 'ALL',
    accentClassName: 'bg-accent',
    borderClassName: 'hover:border-accent',
  },
];

export default function HomePage() {
  const { data } = useQuery({
    queryKey: ['home-previews'],
    queryFn: () => apiClient.getHomePreviews(),
    refetchOnWindowFocus: false,
  });

  // Shuffle each category's own preview list once per mount so repeated
  // re-renders (e.g. opening/closing the modal) don't visibly reshuffle it.
  const shuffled = useMemo(() => {
    function shuffle(arr: string[]) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    }
    return {
      trans: shuffle(data?.trans ?? []),
      sluts: shuffle(data?.sluts ?? []),
      twinks: shuffle(data?.twinks ?? []),
      mix: shuffle(data?.mix ?? []),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const [activeScope, setActiveScope] = useState<Scope | null>(null);
  const activeCard = CARDS.find((c) => c.scope === activeScope) ?? null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[calc(100vh-8rem)] gap-8">
      <div className="text-center">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
          Select a file
        </span>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-fg mt-1">
          Who do you recognize?
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full max-w-5xl">
        {CARDS.map((card) => (
          <CategoryCard
            key={card.scope}
            title={card.label}
            tag={card.tag}
            images={shuffled[card.scope]}
            accentClassName={card.accentClassName}
            borderClassName={card.borderClassName}
            onClick={() => setActiveScope(card.scope)}
          />
        ))}
      </div>

      {activeCard ? (
        <GameSetupModal
          scope={activeCard.scope}
          scopeLabel={activeCard.label}
          onClose={() => setActiveScope(null)}
        />
      ) : null}
    </div>
  );
}
