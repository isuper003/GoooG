import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { CharacterDTO } from '../../shared/types';
import type { CharacterSort } from '../lib/apiClient';
import { useCharacters, useDeleteCharacter, useSetCharacterActive } from '../hooks/useCharacters';
import { useLabels } from '../hooks/useLabels';
import CharacterCard from '../components/gallery/CharacterCard';
import CharacterEditModal from '../components/gallery/CharacterEditModal';
import ImageLightbox from '../components/gallery/ImageLightbox';
import LabelManager from '../components/gallery/LabelManager';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import GameSetupModal from '../components/home/GameSetupModal';
import { toProxiedImageUrl } from '../lib/imageUrl';

type CategoryFilter = 'trans' | 'sluts' | 'twinks' | undefined;
type SpecialFilter = 'all' | 'mastered' | 'weak';

export default function GalleryPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') ?? '';

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [category, setCategory] = useState<CategoryFilter>(undefined);
  const [specialFilter, setSpecialFilter] = useState<SpecialFilter>('all');
  const [labelFilter, setLabelFilter] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<CharacterSort>('newest');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [zoomModalData, setZoomModalData] = useState<{
    character: CharacterDTO;
    photoIndex: number;
  } | null>(null);

  const [trainingCategory, setTrainingCategory] = useState<
    'trans' | 'sluts' | 'twinks' | 'mix' | null
  >(null);
  const [editingCharacter, setEditingCharacter] = useState<CharacterDTO | null>(null);
  const [viewingImagesFor, setViewingImagesFor] = useState<CharacterDTO | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState<CharacterDTO | null>(null);
  const [showLabelManager, setShowLabelManager] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: allRoster = [] } = useCharacters({});
  const { data: rawCharacters = [], isLoading } = useCharacters({
    category,
    label: labelFilter,
    search: debouncedSearch || undefined,
    sort,
  });

  const { data: labels = [] } = useLabels();
  const deleteCharacter = useDeleteCharacter();
  const setCharacterActive = useSetCharacterActive();

  // Apply special client-side filters (Mastered / Weak)
  const characters = useMemo(() => {
    if (specialFilter === 'mastered') {
      return rawCharacters.filter((c) => c.srsLevel >= 4);
    }
    if (specialFilter === 'weak') {
      return rawCharacters.filter((c) => c.wrongCount > 0 || c.srsLevel <= 2);
    }
    return rawCharacters;
  }, [rawCharacters, specialFilter]);

  // Active character for the Right-Pane Dossier
  const activeDossierChar = useMemo(() => {
    if (!characters.length) return null;
    if (selectedCharacterId) {
      const found = characters.find((c) => c.id === selectedCharacterId);
      if (found) return found;
    }
    return characters[0];
  }, [characters, selectedCharacterId]);

  // Reset selected photo when character changes
  useEffect(() => {
    setSelectedPhotoIndex(0);
  }, [activeDossierChar?.id]);

  const dossierTotal = activeDossierChar
    ? activeDossierChar.correctCount + activeDossierChar.wrongCount
    : 0;
  const dossierAccuracy =
    activeDossierChar && dossierTotal > 0
      ? ((activeDossierChar.correctCount / dossierTotal) * 100).toFixed(1)
      : '100.0';
  const dossierHeroImg =
    activeDossierChar?.images?.[selectedPhotoIndex]?.url ||
    activeDossierChar?.images?.[0]?.url;

  // Dossier photo navigation (scroll left/right or click)
  const dossierImagesCount = activeDossierChar?.images.length || 0;
  const nextDossierPhoto = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      if (dossierImagesCount <= 1) return;
      setSelectedPhotoIndex((prev) => (prev + 1) % dossierImagesCount);
    },
    [dossierImagesCount]
  );

  const prevDossierPhoto = useCallback(
    (e?: React.MouseEvent | React.TouchEvent) => {
      e?.stopPropagation();
      if (dossierImagesCount <= 1) return;
      setSelectedPhotoIndex((prev) => (prev - 1 + dossierImagesCount) % dossierImagesCount);
    },
    [dossierImagesCount]
  );

  const dossierTouchStartX = useRef<number | null>(null);
  const handleDossierTouchStart = (e: React.TouchEvent) => {
    dossierTouchStartX.current = e.touches[0].clientX;
  };
  const handleDossierTouchEnd = (e: React.TouchEvent) => {
    if (dossierTouchStartX.current === null) return;
    const diffX = dossierTouchStartX.current - e.changedTouches[0].clientX;
    if (diffX > 30) nextDossierPhoto(e);
    else if (diffX < -30) prevDossierPhoto(e);
    dossierTouchStartX.current = null;
  };

  const lastDossierScrollTime = useRef(0);
  const handleDossierWheel = (e: React.WheelEvent) => {
    if (dossierImagesCount <= 1) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) > 18) {
      const now = Date.now();
      if (now - lastDossierScrollTime.current > 260) {
        lastDossierScrollTime.current = now;
        if (delta > 0) nextDossierPhoto();
        else prevDossierPhoto();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* ================= Dossier Header & Global Filters ================= */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            Visual Archives
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mt-0.5">
            Character Gallery
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by performer name..."
            className="bg-[#090d14] border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-400 w-52 sm:w-64 font-mono transition-colors"
          />

          <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Posters
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Table
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowLabelManager(true)}
            className="rounded-xl bg-white/[0.04] border border-white/10 px-3.5 py-2 text-xs font-mono text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            🏷️ Labels
          </button>
        </div>
      </div>

      {/* ================= Category Filter Pills Strip ================= */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto custom-scroll pb-1">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setCategory(undefined);
              setSpecialFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
              category === undefined && specialFilter === 'all'
                ? 'bg-white/15 text-white border-white/30'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            All Performers ({allRoster.length || rawCharacters.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('sluts');
              setSpecialFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
              category === 'sluts' && specialFilter === 'all'
                ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Sluts ({allRoster.filter((c) => c.categoryKey === 'sluts').length})
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('trans');
              setSpecialFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
              category === 'trans' && specialFilter === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Trans ({allRoster.filter((c) => c.categoryKey === 'trans').length})
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory('twinks');
              setSpecialFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
              category === 'twinks' && specialFilter === 'all'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            Twinks ({allRoster.filter((c) => c.categoryKey === 'twinks').length})
          </button>
          <button
            type="button"
            onClick={() => setSpecialFilter('mastered')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
              specialFilter === 'mastered'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'border-transparent text-amber-300/70 hover:text-amber-300'
            }`}
          >
            ★ Mastered (SRS &ge; 4)
          </button>
          <button
            type="button"
            onClick={() => setSpecialFilter('weak')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0 border ${
              specialFilter === 'weak'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'border-transparent text-rose-400/70 hover:text-rose-400'
            }`}
          >
            ⚠ Remediation Candidates
          </button>
        </div>

        {/* Filter Controls (Labels & Sort) */}
        <div className="flex items-center gap-2 shrink-0">
          {labels.length > 0 && (
            <select
              value={labelFilter ?? ''}
              onChange={(e) => setLabelFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="rounded-xl border border-white/10 bg-[#090d14] px-3 py-1.5 text-xs font-mono text-white/80 focus:border-cyan-400 focus:outline-none shrink-0"
            >
              <option value="">All Labels</option>
              {labels.map((lbl) => (
                <option key={lbl.id} value={lbl.id}>
                  #{lbl.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CharacterSort)}
            className="rounded-xl border border-white/10 bg-[#090d14] px-3 py-1.5 text-xs font-mono text-white/80 focus:border-cyan-400 focus:outline-none shrink-0"
          >
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="weakest">Sort: Weakest First</option>
            <option value="most_correct">Sort: Most Correct</option>
            <option value="least_correct">Sort: Least Correct</option>
            <option value="category">Sort: Category</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-cyan-400 font-mono text-xs">
          Scanning character gallery...
        </div>
      ) : characters.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center hairline-card rounded-3xl p-8 border border-white/10">
          <p className="font-display text-xl text-white">No matching characters found</p>
          <p className="text-xs text-white/50 max-w-sm">
            Try adjusting your search criteria or import new candidates from the Photo Studio.
          </p>
          <Link
            to="/import"
            className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-400 text-black font-semibold text-xs transition-colors"
          >
            Go to Photo Studio →
          </Link>
        </div>
      ) : viewMode === 'cards' ? (
        /* ================= 2-PANE POSTER GRID + INSTANT DETAIL DOSSIER ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Posters Grid (8 cols) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {characters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                isSelected={char.id === activeDossierChar?.id}
                onSelect={() => setSelectedCharacterId(char.id)}
                onZoom={(character, photoIndex) =>
                  setZoomModalData({ character, photoIndex })
                }
                onEdit={() => setEditingCharacter(char)}
                onViewImages={() => setViewingImagesFor(char)}
                onDelete={() => setDeletingCharacter(char)}
                onToggleActive={() =>
                  setCharacterActive.mutate({ id: char.id, isActive: !char.isActive })
                }
              />
            ))}
          </div>

          {/* Right: Active Performer Dossier & 6-Photo Filmstrip (4 cols) */}
          {activeDossierChar && (
            <div className="lg:col-span-4 hairline-card rounded-3xl p-6 flex flex-col justify-between sticky top-20 shadow-2xl border border-white/15 bg-[#090d14]">
              <div>
                {/* Large Selected Performer Portrait */}
                <div
                  className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-white/15 bg-black shadow-xl group cursor-zoom-in select-none"
                  onClick={() =>
                    setZoomModalData({ character: activeDossierChar, photoIndex: selectedPhotoIndex })
                  }
                  onTouchStart={handleDossierTouchStart}
                  onTouchEnd={handleDossierTouchEnd}
                  onWheel={handleDossierWheel}
                  title="Click to Zoom-in • Scroll or swipe to switch photos"
                >
                  {dossierHeroImg ? (
                    <img
                      src={toProxiedImageUrl(dossierHeroImg)}
                      alt={activeDossierChar.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-mono text-xs text-white/40">
                      No portrait
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

                  {/* Left / Right Hero Scroll Arrows */}
                  {dossierImagesCount > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={prevDossierPhoto}
                        aria-label="Previous photo"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-sm text-sm border border-white/20 hover:border-cyan-400 cursor-pointer shadow-lg active:scale-95"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={nextDossierPhoto}
                        aria-label="Next photo"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-sm text-sm border border-white/20 hover:border-cyan-400 cursor-pointer shadow-lg active:scale-95"
                      >
                        ›
                      </button>
                    </>
                  )}

                  

                  <div className="absolute bottom-3 inset-x-3 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase bg-white/15 text-cyan-300 px-2.5 py-0.5 rounded-full border border-white/20 backdrop-blur-md">
                        {activeDossierChar.categoryKey} Deck
                      </span>
                      {dossierImagesCount > 1 && (
                        <span className="text-[10px] font-mono text-white/70 bg-black/70 px-2 py-0.5 rounded-full border border-white/15 backdrop-blur-md">
                          {selectedPhotoIndex + 1} / {dossierImagesCount}
                        </span>
                      )}
                    </div>
                    <h2 className="text-2xl font-display font-black text-white mt-1 drop-shadow-md truncate">
                      {activeDossierChar.name}
                    </h2>
                  </div>
                </div>

                {/* 6-Photo Filmstrip */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-2">
                    <span>TRAINING PHOTOS ({activeDossierChar.images.length})</span>
                    <span className="text-cyan-400 font-semibold text-[11px]">
                      Click to Preview
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const img = activeDossierChar.images[idx];
                      const isCurrent = idx === selectedPhotoIndex;
                      if (!img) {
                        return (
                          <div
                            key={idx}
                            className="aspect-square rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-center text-white/20 font-mono text-[9px]"
                          >
                            -
                          </div>
                        );
                      }
                      return (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setSelectedPhotoIndex(idx)}
                          className={`aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${
                            isCurrent
                              ? 'border-2 border-cyan-400 ring-1 ring-cyan-400/50 scale-105'
                              : 'border-white/20 hover:border-white opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={toProxiedImageUrl(img.url)}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Labels */}
                {activeDossierChar.labels.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {activeDossierChar.labels.map((lbl) => (
                      <span
                        key={lbl.id}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/70 border border-white/10"
                      >
                        #{lbl.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* SRS Retention Stats Card */}
                <div className="mt-5 p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-white/50">Retention Curve</span>
                    <span className="text-cyan-400 font-bold">{dossierAccuracy}%</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${dossierAccuracy}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50 pt-1">
                    <span>Interval: {Math.max(1, activeDossierChar.srsLevel) * 2} Days</span>
                    <span>Reviews: {dossierTotal}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-5 border-t border-white/10 mt-6 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setTrainingCategory(
                      activeDossierChar.categoryKey as 'trans' | 'sluts' | 'twinks' | 'mix'
                    )
                  }
                  className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-cyan-400/20 cursor-pointer"
                >
                  <span>Target Train This Performer</span>
                  <span className="font-mono text-[10px] bg-black/20 px-1.5 py-0.5 rounded">↵</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCharacter(activeDossierChar)}
                    className="py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
                  >
                    Edit Info &amp; Tags
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCharacterActive.mutate({
                        id: activeDossierChar.id,
                        isActive: !activeDossierChar.isActive,
                      })
                    }
                    className="py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
                  >
                    {activeDossierChar.isActive ? '👁 In Rotation' : '🚫 Sealed'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDeletingCharacter(activeDossierChar)}
                  className="py-2 rounded-xl text-rose-400/80 hover:text-rose-300 text-xs font-mono transition-colors cursor-pointer"
                >
                  Delete Record
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ================= TABLE / LEDGER VIEW ================= */
        <div className="hairline-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-black/60 text-white/50 uppercase tracking-wider border-b border-white/[0.08]">
                <tr>
                  <th className="p-4">Performer</th>
                  <th className="p-4">Deck</th>
                  <th className="p-4 text-center">SRS Mastery</th>
                  <th className="p-4 text-center">Retention</th>
                  <th className="p-4 text-center">Reviews</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {characters.map((char) => {
                  const total = char.correctCount + char.wrongCount;
                  const acc = total > 0 ? ((char.correctCount / total) * 100).toFixed(1) : '100.0';
                  const thumb = char.images[0]?.url;
                  return (
                    <tr key={char.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        <div
                          onClick={() => setZoomModalData({ character: char, photoIndex: 0 })}
                          className="w-10 h-13 rounded-lg overflow-hidden bg-black border border-white/10 shrink-0 cursor-zoom-in group/thumb relative shadow-sm"
                          title="Click to Zoom-in"
                        >
                          {thumb ? (
                            <img
                              src={toProxiedImageUrl(thumb)}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110"
                            />
                          ) : null}
                        </div>
                        <div>
                          <div className="font-display font-bold text-white text-sm">{char.name}</div>
                          <div className="text-[10px] text-white/40">{char.images.length} photos</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/10">
                          {char.categoryKey}
                        </span>
                      </td>
                      <td className="p-4 text-center text-amber-400">
                        {'★'.repeat(Math.min(5, char.srsLevel))}
                        {'☆'.repeat(5 - Math.min(5, char.srsLevel))}
                      </td>
                      <td className="p-4 text-center text-cyan-400 font-bold">{acc}%</td>
                      <td className="p-4 text-center text-white/70">{total} runs</td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            char.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {char.isActive ? 'Active' : 'Sealed'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCharacterId(char.id);
                              setViewMode('cards');
                            }}
                            className="text-cyan-400 hover:underline text-xs"
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCharacter(char)}
                            className="text-white/60 hover:text-white text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Target Train Modal */}
      {trainingCategory && (
        <GameSetupModal
          scope={trainingCategory}
          scopeLabel={trainingCategory.toUpperCase()}
          onClose={() => setTrainingCategory(null)}
        />
      )}

      {/* Modals & Dialogs */}
      {editingCharacter && (
        <CharacterEditModal
          character={editingCharacter}
          onClose={() => setEditingCharacter(null)}
        />
      )}

      {/* Floating Zoom-In Modal */}
      {zoomModalData && (
        <ImageLightbox
          images={zoomModalData.character.images.map((img) => img.url)}
          characterName={zoomModalData.character.name}
          categoryKey={zoomModalData.character.categoryKey}
          initialIndex={zoomModalData.photoIndex}
          onClose={() => setZoomModalData(null)}
        />
      )}

      {viewingImagesFor && (
        <ImageLightbox
          images={viewingImagesFor.images.map((img) => img.url)}
          characterName={viewingImagesFor.name}
          categoryKey={viewingImagesFor.categoryKey}
          initialIndex={0}
          onClose={() => setViewingImagesFor(null)}
        />
      )}

      {showLabelManager && <LabelManager onClose={() => setShowLabelManager(false)} />}

      {deletingCharacter && (
        <ConfirmDialog
          title="Delete Character?"
          message={`Are you sure you want to permanently delete "${deletingCharacter.name}" and all associated review telemetry?`}
          onCancel={() => setDeletingCharacter(null)}
          onConfirm={async () => {
            await deleteCharacter.mutateAsync(deletingCharacter.id);
            setDeletingCharacter(null);
          }}
        />
      )}
    </div>
  );
}
