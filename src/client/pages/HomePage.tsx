import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import CategoryCard from '../components/home/CategoryCard';
import GameSetupModal from '../components/home/GameSetupModal';
import { apiClient } from '../lib/apiClient';

type Scope = 'male' | 'female' | 'boys' | 'mix';

const CARDS: { scope: Scope; label: string; accentClassName: string }[] = [
  { scope: 'male', label: 'Male', accentClassName: 'bg-category-male' },
  { scope: 'female', label: 'Female', accentClassName: 'bg-category-female' },
  { scope: 'boys', label: 'Boys', accentClassName: 'bg-category-boys' },
  {
    scope: 'mix',
    label: 'Mix',
    accentClassName: 'bg-gradient-to-r from-category-male via-category-female to-category-boys',
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
      male: shuffle(data?.male ?? []),
      female: shuffle(data?.female ?? []),
      boys: shuffle(data?.boys ?? []),
      mix: shuffle(data?.mix ?? []),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const [activeScope, setActiveScope] = useState<Scope | null>(null);
  const activeCard = CARDS.find((c) => c.scope === activeScope) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-fg">Guess the Character</h1>
        <p className="text-fg-muted mt-1">Pick a category and start playing.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
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
