import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CategoryCard from '../components/home/CategoryCard';
import GameSetupModal from '../components/home/GameSetupModal';
import { apiClient } from '../lib/apiClient';

type Scope = 'trans' | 'sluts' | 'twinks' | 'mix';

const CARDS: { scope: Scope; label: string; accentClassName: string }[] = [
  { scope: 'trans', label: 'Trans', accentClassName: 'bg-category-trans' },
  { scope: 'sluts', label: 'Sluts', accentClassName: 'bg-category-sluts' },
  { scope: 'twinks', label: 'Twinks', accentClassName: 'bg-category-twinks' },
  {
    scope: 'mix',
    label: 'Mix',
    accentClassName: 'bg-gradient-to-r from-category-trans via-category-sluts to-category-twinks',
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
    <div className="flex-1 flex items-center justify-center w-full min-h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full max-w-5xl">
        {CARDS.map((card) => (
          <CategoryCard
            key={card.scope}
            title={card.label}
            images={shuffled[card.scope]}
            accentClassName={card.accentClassName}
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
