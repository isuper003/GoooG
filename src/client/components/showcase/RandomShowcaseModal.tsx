import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useCharacters } from '../../hooks/useCharacters';
import type { CharacterDTO } from '../../../shared/types';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import ShowcaseCardViewer from './ShowcaseCardViewer';
import {
  sampleCharactersByCategory,
  sampleTotalRandomCharacters,
} from './randomSampler';

interface RandomShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SetupMode = 'total' | 'byCategory';
type ViewMode = 'carousel' | 'grid';

const CATEGORY_CONFIG: {
  key: string;
  label: string;
  accentColor: string;
  badgeClass: string;
}[] = [
  {
    key: 'sluts',
    label: 'Sluts',
    accentColor: '#ec4899',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  {
    key: 'trans',
    label: 'Trans',
    accentColor: '#06b6d4',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  {
    key: 'twinks',
    label: 'Twinks',
    accentColor: '#a855f7',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
];

const PRESET_TOTALS = [1, 3, 5, 10, 15, 20];

export default function RandomShowcaseModal({ isOpen, onClose }: RandomShowcaseModalProps) {
  const { data: characters = [] } = useCharacters({});

  const activeCharacters = useMemo(
    () => characters.filter((c) => c.isActive),
    [characters]
  );

  // Available per category
  const categoryAvailabilities = useMemo(() => {
    const counts: Record<string, number> = { sluts: 0, trans: 0, twinks: 0 };
    for (const char of activeCharacters) {
      if (counts[char.categoryKey] !== undefined) {
        counts[char.categoryKey]++;
      }
    }
    return counts;
  }, [activeCharacters]);

  // Setup state
  const [step, setStep] = useState<'setup' | 'showcase'>('setup');
  const [setupMode, setSetupMode] = useState<SetupMode>('total');
  const [totalCount, setTotalCount] = useState<number>(5);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({
    sluts: 2,
    trans: 2,
    twinks: 1,
  });

  // Showcase state
  const [sampledCharacters, setSampledCharacters] = useState<CharacterDTO[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('carousel');

  // Reset to setup when opened
  useEffect(() => {
    if (isOpen) {
      // If we don't have sampled characters, remain in setup
      if (sampledCharacters.length === 0) {
        setStep('setup');
      }
    }
  }, [isOpen, sampledCharacters.length]);

  // Perform random sampling
  const executeRoll = useCallback(() => {
    let results: CharacterDTO[] = [];
    if (setupMode === 'total') {
      results = sampleTotalRandomCharacters({
        characters: activeCharacters,
        count: totalCount,
        activeOnly: true,
      });
    } else {
      results = sampleCharactersByCategory({
        characters: activeCharacters,
        categoryCounts,
        activeOnly: true,
      });
    }

    if (results.length > 0) {
      setSampledCharacters(results);
      setActiveCardIndex(0);
      setStep('showcase');
    }
  }, [setupMode, activeCharacters, totalCount, categoryCounts]);

  // Handle keyboard shortcuts when showcase overlay is active
  useEffect(() => {
    if (!isOpen || step !== 'showcase') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setActiveCardIndex((i) => (i + 1) % sampledCharacters.length);
      } else if (e.key === 'ArrowLeft') {
        setActiveCardIndex((i) => (i - 1 + sampledCharacters.length) % sampledCharacters.length);
      } else if (e.key === 'r' || e.key === 'R') {
        executeRoll();
      } else if (e.key === 'g' || e.key === 'G') {
        setViewMode((m) => (m === 'carousel' ? 'grid' : 'carousel'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step, sampledCharacters.length, executeRoll, onClose]);

  if (!isOpen) return null;

  const activeChar = sampledCharacters[activeCardIndex] || null;
  const byCategoryTotalSum = Object.values(categoryCounts).reduce((a, b) => a + b, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 overflow-hidden">
        {/* ======================================================== */}
        {/* STEP 1: CONFIGURATION MODAL                             */}
        {/* ======================================================== */}
        {step === 'setup' && (
          <motion.div
            key="setup-modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg rounded-3xl bg-[#090d14] border border-white/15 p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scroll"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest font-semibold">
                  <span className="text-base">🎲</span>
                  <span>Random Selection</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 tracking-tight">
                  Random
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  Inspect random character cards in a floating showcase overlay.
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black/50 border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSetupMode('total')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  setupMode === 'total'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Total Random
              </button>
              <button
                type="button"
                onClick={() => setSetupMode('byCategory')}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  setupMode === 'byCategory'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                By Category
              </button>
            </div>

            {/* MODE 1: TOTAL RANDOM */}
            {setupMode === 'total' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-white/60">
                    Characters to Sample
                  </span>
                  <span className="text-xs font-mono text-cyan-400">
                    {activeCharacters.length} Available in Roster
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_TOTALS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTotalCount(preset)}
                      className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border cursor-pointer ${
                        totalCount === preset
                          ? 'bg-cyan-400 text-black border-cyan-400 shadow-md shadow-cyan-400/20'
                          : 'bg-white/[0.04] text-white/70 border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Stepper Input */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-black/40 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setTotalCount((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center font-bold text-lg border border-white/10 transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={activeCharacters.length || 100}
                    value={totalCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setTotalCount(Math.max(1, Math.min(activeCharacters.length || 100, val)));
                    }}
                    className="flex-1 bg-transparent text-center font-display text-2xl font-bold text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setTotalCount((prev) => Math.min(activeCharacters.length || 100, prev + 1))}
                    className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center font-bold text-lg border border-white/10 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* MODE 2: BY CATEGORY */}
            {setupMode === 'byCategory' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60 uppercase tracking-wider">Configure Each Category</span>
                  <span className="text-cyan-400">Total: {byCategoryTotalSum} cards</span>
                </div>

                {CATEGORY_CONFIG.map((cat) => {
                  const available = categoryAvailabilities[cat.key] ?? 0;
                  const currentCount = categoryCounts[cat.key] ?? 0;

                  return (
                    <div
                      key={cat.key}
                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${cat.badgeClass}`}
                        >
                          {cat.label}
                        </span>
                        <span className="text-xs font-mono text-white/40">
                          ({available} in deck)
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryCounts((prev) => ({
                              ...prev,
                              [cat.key]: Math.max(0, (prev[cat.key] ?? 0) - 1),
                            }))
                          }
                          className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center font-bold border border-white/10 transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-white text-sm">
                          {currentCount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCategoryCounts((prev) => ({
                              ...prev,
                              [cat.key]: Math.min(available, (prev[cat.key] ?? 0) + 1),
                            }))
                          }
                          disabled={currentCount >= available}
                          className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-30 text-white flex items-center justify-center font-bold border border-white/10 transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Launch Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={executeRoll}
                disabled={setupMode === 'byCategory' && byCategoryTotalSum === 0}
                className="w-full py-3.5 rounded-xl bg-cyan-400 hover:bg-white disabled:bg-zinc-700 disabled:text-zinc-500 text-black font-semibold text-sm transition-all duration-200 shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>🎲</span>
                <span>
                  Roll {setupMode === 'total' ? totalCount : byCategoryTotalSum} Characters
                </span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ======================================================== */}
        {/* STEP 2: FLOATING SHOWCASE OVERLAY                        */}
        {/* ======================================================== */}
        {step === 'showcase' && (
          <motion.div
            key="showcase-overlay"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="w-full h-full max-w-6xl flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-6 relative"
          >
            {/* Top Showcase Controls Bar */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
                  <span>🎲</span>
                  <span>Random</span>
                </span>
                <span className="text-xs font-mono text-white/60 hidden sm:inline-block">
                  {sampledCharacters.length} Cards in Showcase
                </span>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2">
                {/* View Mode Toggle */}
                <div className="flex items-center p-0.5 rounded-lg bg-white/[0.06] border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('carousel')}
                    title="Carousel View (◫)"
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'carousel'
                        ? 'bg-cyan-400 text-black font-bold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Carousel
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title="Grid View (▦)"
                    className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-cyan-400 text-black font-bold shadow-sm'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Grid
                  </button>
                </div>

                {/* Re-roll Button */}
                <button
                  type="button"
                  onClick={executeRoll}
                  title="Re-roll characters (R)"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/90 hover:text-white border border-white/10 hover:border-white/25 text-xs font-mono transition-all cursor-pointer active:scale-95"
                >
                  <span className="text-sm">↺</span>
                  <span className="hidden sm:inline">Re-roll</span>
                </button>

                {/* Return to Setup */}
                <button
                  type="button"
                  onClick={() => setStep('setup')}
                  title="Change setup"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white border border-white/10 text-xs font-mono transition-all cursor-pointer"
                >
                  <span>⚙</span>
                  <span className="hidden sm:inline">Setup</span>
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  title="Close (Esc)"
                  className="w-8 h-8 rounded-lg bg-white/[0.08] hover:bg-rose-500/20 text-white/70 hover:text-rose-300 border border-white/15 hover:border-rose-400/40 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center my-auto py-2 overflow-hidden w-full">
              {/* CAROUSEL VIEW */}
              {viewMode === 'carousel' && activeChar && (
                <ShowcaseCardViewer
                  character={activeChar}
                  currentIndex={activeCardIndex}
                  totalCount={sampledCharacters.length}
                  onPrev={() =>
                    setActiveCardIndex(
                      (i) => (i - 1 + sampledCharacters.length) % sampledCharacters.length
                    )
                  }
                  onNext={() =>
                    setActiveCardIndex((i) => (i + 1) % sampledCharacters.length)
                  }
                />
              )}

              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <div className="w-full max-h-[70vh] overflow-y-auto custom-scroll p-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {sampledCharacters.map((char, idx) => {
                      const primaryImg = char.images[0]?.url;
                      const catConfig = CATEGORY_CONFIG.find((c) => c.key === char.categoryKey);
                      const isCurrent = idx === activeCardIndex;

                      return (
                        <div
                          key={char.id}
                          onClick={() => {
                            setActiveCardIndex(idx);
                            setViewMode('carousel');
                          }}
                          className={`hairline-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 group flex flex-col ${
                            isCurrent
                              ? 'border-2 border-cyan-400 shadow-xl shadow-cyan-400/20 scale-[1.02]'
                              : 'border border-white/10 hover:border-white/30 hover:scale-[1.01]'
                          }`}
                        >
                          <div className="relative aspect-[3/4] bg-black overflow-hidden">
                            {primaryImg ? (
                              <img
                                src={toProxiedImageUrl(primaryImg)}
                                alt={char.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-white/30 text-xs font-mono">
                                No portrait
                              </div>
                            )}

                            <div className="absolute top-2 left-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border backdrop-blur-md ${
                                  catConfig?.badgeClass ?? 'bg-white/10 text-white border-white/20'
                                }`}
                              >
                                {catConfig?.label ?? char.categoryKey}
                              </span>
                            </div>

                            <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                              <h4 className="font-display font-bold text-white text-xs truncate">
                                {char.name}
                              </h4>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Filmstrip (when in Carousel view) */}
            {viewMode === 'carousel' && sampledCharacters.length > 1 && (
              <div className="shrink-0 flex items-center justify-center gap-2 overflow-x-auto py-2 no-scrollbar border-t border-white/10">
                {sampledCharacters.map((char, idx) => {
                  const thumb = char.images[0]?.url;
                  const isSelected = idx === activeCardIndex;

                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => setActiveCardIndex(idx)}
                      className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)] scale-105'
                          : 'border-white/10 opacity-50 hover:opacity-100 hover:border-white/30'
                      }`}
                    >
                      {thumb ? (
                        <img
                          src={toProxiedImageUrl(thumb)}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[10px] text-white/50">
                          {idx + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
