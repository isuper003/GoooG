import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import CategoryCard from '../components/home/CategoryCard';
import GameSetupModal from '../components/home/GameSetupModal';
import TodayTasksBar from '../components/home/TodayTasksBar';
import { apiClient } from '../lib/apiClient';
import { useCharacters } from '../hooks/useCharacters';
import { toProxiedImageUrl } from '../lib/imageUrl';

type Scope = 'trans' | 'sluts' | 'twinks' | 'mix';

const CARDS: {
  scope: Scope;
  label: string;
  tag: string;
  accentColor: string;
  badgeClass: string;
}[] = [
  {
    scope: 'sluts',
    label: 'Sluts',
    tag: 'SL',
    accentColor: '#ec4899',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  {
    scope: 'trans',
    label: 'Trans',
    tag: 'TR',
    accentColor: '#06b6d4',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    scope: 'twinks',
    label: 'Twinks',
    tag: 'TW',
    accentColor: '#a855f7',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  {
    scope: 'mix',
    label: 'Master Mix',
    tag: 'ALL',
    accentColor: '#22d3ee',
    badgeClass: 'bg-white/10 text-white border-white/20',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeScope, setActiveScope] = useState<Scope | null>(null);
  const [activeSpotlightIndex, setActiveSpotlightIndex] = useState(0);

  // Load category previews for deck stacks
  const { data: previewData } = useQuery({
    queryKey: ['home-previews'],
    queryFn: () => apiClient.getHomePreviews(),
    refetchOnWindowFocus: false,
  });

  // Load characters prioritized by weakest for Spotlight Hero
  const { data: characters = [] } = useCharacters({ sort: 'weakest' });

  // Pick top candidate performers for spotlight
  const spotlightChars = useMemo(() => {
    if (!characters.length) return [];
    return characters.slice(0, 4);
  }, [characters]);

  // Keep index in valid bounds
  const safeIndex = Math.min(activeSpotlightIndex, Math.max(0, spotlightChars.length - 1));
  const activeChar = spotlightChars[safeIndex];

  // Arrow key navigation for spotlight carousel
  useEffect(() => {
    if (!spotlightChars.length) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        setActiveSpotlightIndex((prev) => (prev + 1) % spotlightChars.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveSpotlightIndex((prev) => (prev - 1 + spotlightChars.length) % spotlightChars.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [spotlightChars.length]);

  // Active character statistics
  const totalReviews = activeChar ? activeChar.correctCount + activeChar.wrongCount : 0;
  const accuracy =
    activeChar && totalReviews > 0
      ? ((activeChar.correctCount / totalReviews) * 100).toFixed(1)
      : '100.0';
  const categoryConfig = CARDS.find((c) => c.scope === activeChar?.categoryKey) ?? CARDS[0];

  // 4 random/distinct photos for the active character without borders
  const spotlightHeroImages = useMemo(() => {
    if (!activeChar || !activeChar.images || activeChar.images.length === 0) return [];
    const urls = activeChar.images.map((img) => img.url).filter(Boolean);
    if (urls.length === 0) return [];
    if (urls.length >= 4) {
      const copy = [...urls];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, 4);
    }
    // Repeat/tile if character has fewer than 4 images
    const result: string[] = [];
    for (let i = 0; i < 4; i++) {
      result.push(urls[i % urls.length]);
    }
    return result;
  }, [activeChar?.id]);

  // Pick 1 random photo for each category card on mount/refresh
  const randomCategoryImages = useMemo(() => {
    function pickRandom(arr: string[]): string {
      if (!arr || arr.length === 0) return '';
      return arr[Math.floor(Math.random() * arr.length)];
    }
    const getImagesForCategory = (cat: Scope) => {
      const previewUrls = previewData?.[cat] ?? [];
      if (previewUrls.length > 0) return previewUrls;
      if (cat === 'mix') {
        return characters.flatMap((c) => c.images.map((i) => i.url));
      }
      return characters
        .filter((c) => c.categoryKey === cat)
        .flatMap((c) => c.images.map((i) => i.url));
    };

    return {
      sluts: pickRandom(getImagesForCategory('sluts')),
      trans: pickRandom(getImagesForCategory('trans')),
      twinks: pickRandom(getImagesForCategory('twinks')),
      mix: pickRandom(getImagesForCategory('mix')),
    };
  }, [previewData, characters]);

  // Category card counts
  const categoryCounts = useMemo(() => {
    return {
      sluts: characters.filter((c) => c.categoryKey === 'sluts').length,
      trans: characters.filter((c) => c.categoryKey === 'trans').length,
      twinks: characters.filter((c) => c.categoryKey === 'twinks').length,
      mix: characters.length,
    };
  }, [characters]);

  const activeCard = CARDS.find((c) => c.scope === activeScope) ?? null;

  return (
    <div className="flex flex-col gap-8 w-full pb-10">
      {/* ======================================================== */}
      {/* SPOTLIGHT HERO STAGE (CHARACTER-CENTRIC CINEMATIC STAGE) */}
      {/* ======================================================== */}
      <section className="relative w-full rounded-3xl overflow-hidden border border-white/10 bg-[#090d14] min-h-[560px] lg:min-h-[640px] flex flex-col justify-between p-6 sm:p-10 shadow-2xl group">
        {/* 4 Seamless Side-by-Side Character Photos (No borders, attached together) */}
        {spotlightHeroImages.length > 0 ? (
          <div className="absolute inset-0 z-0 grid grid-cols-2 sm:grid-cols-4 gap-0 h-full w-full overflow-hidden pointer-events-none">
            {spotlightHeroImages.map((imgUrl, idx) => (
              <div key={idx} className="relative h-full w-full overflow-hidden">
                <img
                  src={toProxiedImageUrl(imgUrl)}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top scale-100 group-hover:scale-105 transition-all duration-1000 filter brightness-[0.88] contrast-[1.05]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0.3';
                  }}
                />
              </div>
            ))}
            {/* Seamless cinematic overlay on top of the 4 photos (softened shadows) */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#04060a]/80 via-[#04060a]/25 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#04060a]/60 via-[#04060a]/15 to-transparent pointer-events-none" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-[#090d14] pointer-events-none" />
        )}

        {/* Top Badges & Controls Header */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {activeChar ? (
              <>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md ${categoryConfig.badgeClass}`}
                >
                  {categoryConfig.label} Deck
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-black/60 text-amber-300 border border-amber-300/30 backdrop-blur-md flex items-center gap-1.5">
                  <span>★</span> Level {activeChar.srsLevel} SRS Mastery
                </span>
              </>
            ) : (
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-white/10 text-white/70 border border-white/20">
                Studio Spotlight
              </span>
            )}
          </div>
        </div>

        {/* Character Identity & Roster Switcher Dock */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mt-12 sm:mt-20">
          {/* Identity & Action CTAs (Left 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest font-semibold">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                {activeChar?.wrongCount && activeChar.wrongCount > 0
                  ? 'Remediation Priority Candidate'
                  : 'Featured Active Rotation'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-black tracking-tight text-white leading-tight drop-shadow-md">
              {activeChar?.name ?? 'Studio Loading...'}
            </h1>

            {/* SRS Metrics Ribbon */}
            <div className="flex items-center gap-4 text-xs font-mono text-white/70 mt-1 flex-wrap">
              <div>
                Retention:{' '}
                <strong className="text-cyan-400 text-sm font-bold">{accuracy}%</strong>
              </div>
              <div className="h-3 w-px bg-white/20 hidden sm:block" />
              <div>
                Reviewed:{' '}
                <strong className="text-white text-sm font-bold">{totalReviews} Times</strong>
              </div>
              <div className="h-3 w-px bg-white/20 hidden sm:block" />
              <div>
                Interval:{' '}
                <strong className="text-emerald-400 text-sm font-bold">
                  {Math.max(1, activeChar?.srsLevel ?? 1) * 2} Days
                </strong>
              </div>
            </div>

            {/* Labels Pills */}
            {activeChar?.labels && activeChar.labels.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {activeChar.labels.map((lbl) => (
                  <span
                    key={lbl.id}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.08] text-white/80 border border-white/10"
                  >
                    #{lbl.name}
                  </span>
                ))}
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-3.5 mt-4 pt-4 border-t border-white/10">
              {activeChar && (
                <button
                  type="button"
                  onClick={() => setActiveScope(activeChar.categoryKey as Scope)}
                  className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs flex items-center gap-2 transition-all shadow-xl shadow-cyan-400/20 active:scale-95 cursor-pointer"
                >
                  <span>Train This Character</span>
                  <span className="font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded">↵</span>
                </button>
              )}

              {activeChar && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/gallery?search=${encodeURIComponent(activeChar.name)}`)
                  }
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 backdrop-blur-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span>View in Gallery ({activeChar.images.length} Photos)</span>
                  <span className="text-white/40">↗</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveScope('mix')}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs border border-white/10 transition-colors cursor-pointer"
              >
                Launch Full Mix
              </button>

              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-random-showcase'))}
                className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs border border-cyan-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>🎲</span>
                <span>Random</span>
              </button>
            </div>
          </div>

          {/* Featured Spotlight Switcher Strip (Right 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono text-white/60">
              <span>SELECT SPOTLIGHT PERFORMER</span>
              <button
                type="button"
                onClick={() => navigate('/gallery')}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                View All {characters.length} →
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5 bg-black/60 p-2.5 rounded-2xl border border-white/10 backdrop-blur-xl">
              {spotlightChars.map((char, idx) => {
                const isSelected = idx === safeIndex;
                const thumbImg = char.images?.[0]?.url;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setActiveSpotlightIndex(idx)}
                    className={`cursor-pointer relative aspect-[3/4] rounded-xl overflow-hidden transition-all text-left ${
                      isSelected
                        ? 'border-2 border-cyan-400 shadow-lg shadow-cyan-400/20 scale-[1.03]'
                        : 'border border-white/20 hover:border-white/60 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {thumbImg ? (
                      <img
                        src={toProxiedImageUrl(thumbImg)}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = '0.3';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center font-mono text-[10px] text-white/40">
                        N/A
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-1.5 text-center">
                      <span className="text-[10px] font-display font-bold text-white block truncate">
                        {char.name.split(' ')[0]}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Today Spaced Repetition Tasks */}
      <TodayTasksBar />

      {/* ======================================================== */}
      {/* INVESTIGATION ARCHIVES // CATEGORY DECKS                 */}
      {/* ======================================================== */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-mono text-xs text-white/60 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Investigation Archives &mdash; Category Decks</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-random-showcase'))}
              className="px-3 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs border border-cyan-500/30 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>🎲</span>
              <span>Random</span>
            </button>
            <span className="text-xs font-mono text-white/40 hidden sm:inline">
              Click any deck to customize round parameters
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
          {CARDS.map((card) => (
            <CategoryCard
              key={card.scope}
              title={card.label}
              tag={card.tag}
              image={randomCategoryImages[card.scope]}
              count={categoryCounts[card.scope]}
              badgeClass={card.badgeClass}
              onClick={() => setActiveScope(card.scope)}
            />
          ))}
        </div>
      </section>

      {/* Session Configuration Modal */}
      {activeCard && (
        <GameSetupModal
          scope={activeCard.scope}
          scopeLabel={activeCard.label}
          onClose={() => setActiveScope(null)}
        />
      )}
    </div>
  );
}
