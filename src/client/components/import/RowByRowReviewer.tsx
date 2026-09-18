import { useMemo, useState } from 'react';
import type { CharacterDTO } from '../../../shared/types';
import LabelMultiSelect from '../shared/LabelMultiSelect';
import BottomImageTray from './BottomImageTray';

export interface QueueItem {
  id: string;
  name: string;
  avatarUrl?: string; // Profile image displayed in small square box next to name
  categoryKey: 'trans' | 'sluts' | 'twinks';
  labelIds: number[];
  availableImages: string[]; // Gallery photos, excluding profile avatar from bottom tray
  selectedImages: string[];
  status: 'pending' | 'imported' | 'skipped' | 'failed';
  error?: string;
}

interface RowByRowReviewerProps {
  queue: QueueItem[];
  allCharacters: CharacterDTO[];
  onUpdateItem: (id: string, updates: Partial<QueueItem>) => void;
  onSaveItem: (item: QueueItem) => Promise<boolean>;
  onSaveAllReady: () => Promise<void>;
  onClearQueue: () => void;
  isSavingBatch: boolean;
}

const CATEGORY_OPTIONS: {
  key: 'trans' | 'sluts' | 'twinks';
  label: string;
  activeClass: string;
  idleClass: string;
}[] = [
  {
    key: 'trans',
    label: 'Trans',
    activeClass: 'bg-category-trans text-white shadow-md shadow-category-trans/30 ring-2 ring-category-trans/50',
    idleClass: 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg',
  },
  {
    key: 'sluts',
    label: 'Sluts',
    activeClass: 'bg-category-sluts text-white shadow-md shadow-category-sluts/30 ring-2 ring-category-sluts/50',
    idleClass: 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg',
  },
  {
    key: 'twinks',
    label: 'Twinks',
    activeClass: 'bg-category-twinks text-white shadow-md shadow-category-twinks/30 ring-2 ring-category-twinks/50',
    idleClass: 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg',
  },
];

export default function RowByRowReviewer({
  queue,
  allCharacters,
  onUpdateItem,
  onSaveItem,
  onSaveAllReady,
  onClearQueue,
  isSavingBatch,
}: RowByRowReviewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSavingCurrent, setIsSavingCurrent] = useState(false);

  const activeItem = queue[currentIndex] ?? null;

  // Stats
  const stats = useMemo(() => {
    let pending = 0;
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    queue.forEach((item) => {
      if (item.status === 'imported') imported++;
      else if (item.status === 'skipped') skipped++;
      else if (item.status === 'failed') failed++;
      else pending++;
    });
    return { pending, imported, skipped, failed, total: queue.length };
  }, [queue]);

  const duplicateWarning = useMemo(() => {
    if (!activeItem || !activeItem.name.trim()) return null;
    const trimmed = activeItem.name.trim().toLowerCase();
    const duplicate = allCharacters.find(
      (c) => c.categoryKey === activeItem.categoryKey && c.name.trim().toLowerCase() === trimmed
    );
    return duplicate ? `A character named "${duplicate.name}" is already in the database (${duplicate.categoryKey}).` : null;
  }, [activeItem, allCharacters]);

  function handleNext() {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  function handleSkip() {
    if (!activeItem) return;
    onUpdateItem(activeItem.id, { status: 'skipped' });
    handleNext();
  }

  async function handleSaveAndNext() {
    if (!activeItem) return;
    setIsSavingCurrent(true);
    const ok = await onSaveItem(activeItem);
    setIsSavingCurrent(false);
    if (ok) {
      // Advance to next pending item if possible
      const nextPendingIndex = queue.findIndex(
        (it, idx) => idx > currentIndex && it.status === 'pending'
      );
      if (nextPendingIndex !== -1) {
        setCurrentIndex(nextPendingIndex);
      } else if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  }

  function toggleSelectedImage(url: string) {
    if (!activeItem) return;
    const isCurrentlySelected = activeItem.selectedImages.includes(url);
    if (isCurrentlySelected) {
      onUpdateItem(activeItem.id, {
        selectedImages: activeItem.selectedImages.filter((u) => u !== url),
      });
    } else {
      if (activeItem.selectedImages.length >= 6) {
        return; // Max 6
      }
      onUpdateItem(activeItem.id, {
        selectedImages: [...activeItem.selectedImages, url],
      });
    }
  }

  function setPrimaryImage(url: string) {
    if (!activeItem) return;
    const filtered = activeItem.selectedImages.filter((u) => u !== url);
    onUpdateItem(activeItem.id, {
      selectedImages: [url, ...filtered],
    });
  }

  function addAvailableImage(url: string) {
    if (!activeItem) return;
    if (!activeItem.availableImages.includes(url)) {
      const newAvail = [...activeItem.availableImages, url];
      const newSelected =
        activeItem.selectedImages.length < 6
          ? [...activeItem.selectedImages, url]
          : activeItem.selectedImages;
      onUpdateItem(activeItem.id, {
        availableImages: newAvail,
        selectedImages: newSelected,
      });
    }
  }

  function removeCandidateImage(url: string) {
    if (!activeItem) return;
    onUpdateItem(activeItem.id, {
      availableImages: activeItem.availableImages.filter((u) => u !== url),
      selectedImages: activeItem.selectedImages.filter((u) => u !== url),
    });
  }

  if (queue.length === 0) {
    return null;
  }

  const primarySelectedImage = activeItem?.selectedImages[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Queue Progress Bar */}
      <div className="rounded-card border border-bg-hover bg-bg-card p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-fg">
              Reviewing Character {currentIndex + 1} of {queue.length}
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="rounded-badge bg-emerald-500/20 px-2 py-0.5 text-emerald-300 font-semibold">
                ✓ {stats.imported} Saved
              </span>
              <span className="rounded-badge bg-bg-muted px-2 py-0.5 text-fg-muted">
                ⏭ {stats.skipped} Skipped
              </span>
              {stats.pending > 0 ? (
                <span className="rounded-badge bg-amber-500/20 px-2 py-0.5 text-amber-300">
                  ⏳ {stats.pending} Pending
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveAllReady}
              disabled={isSavingBatch || stats.pending === 0}
              className="rounded-button bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
            >
              {isSavingBatch ? 'Saving...' : '⚡ Save All Ready'}
            </button>
            <button
              type="button"
              onClick={onClearQueue}
              className="rounded-button bg-bg-muted hover:bg-rose-500/20 hover:text-rose-300 px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors"
            >
              Clear Queue
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-badge bg-bg-muted">
          <div
            className="h-full bg-gradient-to-r from-category-trans to-emerald-400 transition-all duration-300"
            style={{
              width: `${Math.round(((stats.imported + stats.skipped) / queue.length) * 100)}%`,
            }}
          />
        </div>

        {/* Queue Items Mini Navigator Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {queue.map((item, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`shrink-0 rounded-badge px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? 'ring-2 ring-category-trans bg-bg-hover text-fg font-bold scale-105'
                    : item.status === 'imported'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : item.status === 'skipped'
                    ? 'bg-bg-muted text-fg-dim line-through'
                    : item.status === 'failed'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-bg-muted text-fg-muted hover:bg-bg-hover'
                }`}
              >
                #{idx + 1} {item.name || 'Unnamed'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Review Card for Active Item */}
      {activeItem ? (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-card border border-bg-hover bg-bg-card p-6">
            {/* Left Side: Large Primary Preview & Selected images */}
            <div className="lg:col-span-5 flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
                Primary Card Preview
              </span>

              <div className="relative aspect-square w-full overflow-hidden rounded-card border border-bg-hover bg-bg-muted shadow-inner">
                {primarySelectedImage ? (
                  <img
                    src={primarySelectedImage}
                    alt={activeItem.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-fg-dim">
                    <span className="text-3xl mb-1">🖼️</span>
                    <span className="text-xs">No image selected yet</span>
                    <span className="text-[11px] text-fg-dim/80 mt-1">
                      Pick at least 1 image from the bottom tray
                    </span>
                  </div>
                )}

                {primarySelectedImage ? (
                  <div className="absolute top-2 left-2 rounded-badge bg-black/70 backdrop-blur-sm px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                    Primary Image
                  </div>
                ) : null}

                {/* Status indicator on top right */}
                <div className="absolute top-2 right-2">
                  {activeItem.status === 'imported' ? (
                    <span className="rounded-badge bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-md">
                      ✓ Imported
                    </span>
                  ) : activeItem.status === 'skipped' ? (
                    <span className="rounded-badge bg-bg-muted px-2 py-0.5 text-[11px] font-semibold text-fg-muted">
                      Skipped
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Mini thumbnails of all selected images */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-fg-dim">
                  Selected Images ({activeItem.selectedImages.length}/6):
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {activeItem.selectedImages.map((url, i) => (
                    <div
                      key={`selected-${url}-${i}`}
                      className="relative shrink-0 aspect-square w-12 overflow-hidden rounded-button border border-emerald-500/50 bg-bg-muted"
                    >
                      <img
                        src={url}
                        alt=""
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[9px] font-bold text-emerald-300">
                        {i + 1}
                      </span>
                    </div>
                  ))}
                  {activeItem.selectedImages.length === 0 ? (
                    <span className="text-xs text-rose-400 italic">None selected yet</span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Right Side: Character Info, Category, Labels & Actions */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-5">
              <div className="flex flex-col gap-5">
                {/* Character Name & Profile Avatar Box */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
                    Character Profile &amp; Name
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Small Square Profile Avatar Box */}
                    <div
                      className="group relative shrink-0 aspect-square w-14 h-14 rounded-button overflow-hidden border-2 border-bg-hover bg-bg-muted shadow-sm flex items-center justify-center"
                      title={activeItem.avatarUrl ? 'Profile Avatar Image' : 'No profile avatar'}
                    >
                      {activeItem.avatarUrl ? (
                        <>
                          <img
                            src={activeItem.avatarUrl}
                            alt={activeItem.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.opacity = '0.3';
                            }}
                          />
                          <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[8px] font-bold text-center text-fg-muted uppercase py-0.5 tracking-tighter">
                            Profile
                          </span>
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-[9px] text-fg-dim">
                          <span>👤</span>
                          <span>No Avatar</span>
                        </div>
                      )}
                    </div>

                    {/* Name Input */}
                    <div className="flex-1 flex flex-col gap-1">
                      <input
                        value={activeItem.name}
                        onChange={(e) => onUpdateItem(activeItem.id, { name: e.target.value })}
                        placeholder="Enter character name..."
                        className="w-full rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-base font-semibold text-fg focus:border-category-trans focus:outline-none"
                      />
                      {duplicateWarning ? (
                        <span className="text-xs text-amber-400">{duplicateWarning}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Category Selection Buttons */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
                    Category
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORY_OPTIONS.map((cat) => {
                      const isSelected = activeItem.categoryKey === cat.key;
                      return (
                        <button
                          key={cat.key}
                          type="button"
                          onClick={() => onUpdateItem(activeItem.id, { categoryKey: cat.key })}
                          className={`rounded-button py-2.5 px-3 text-sm font-bold transition-all ${
                            isSelected ? cat.activeClass : cat.idleClass
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Labels Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
                    Labels
                  </label>
                  <LabelMultiSelect
                    selectedIds={activeItem.labelIds}
                    onChange={(ids) => onUpdateItem(activeItem.id, { labelIds: ids })}
                  />
                </div>

                {activeItem.error ? (
                  <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
                    {activeItem.error}
                  </div>
                ) : null}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="border-t border-bg-muted pt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="rounded-button bg-bg-muted px-3 py-2 text-xs font-medium text-fg hover:bg-bg-hover disabled:opacity-40"
                  >
                    ← Previous
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={currentIndex === queue.length - 1}
                    className="rounded-button bg-bg-muted px-3 py-2 text-xs font-medium text-fg hover:bg-bg-hover disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="rounded-button bg-bg-muted hover:bg-bg-hover px-4 py-2 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
                  >
                    Skip ⏭
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndNext}
                    disabled={
                      isSavingCurrent ||
                      !activeItem.name.trim() ||
                      activeItem.selectedImages.length === 0
                    }
                    className="rounded-button bg-category-trans hover:opacity-90 px-5 py-2 text-sm font-bold text-white shadow-md shadow-category-trans/20 transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isSavingCurrent ? (
                      'Saving...'
                    ) : activeItem.status === 'imported' ? (
                      '✓ Saved (Save Again)'
                    ) : (
                      '💾 Save & Next'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Candidate Image Gallery Tray */}
          <BottomImageTray
            availableImages={activeItem.availableImages}
            selectedImages={activeItem.selectedImages}
            onToggleImage={toggleSelectedImage}
            onSetPrimary={setPrimaryImage}
            onAddImage={addAvailableImage}
            onRemoveCandidate={removeCandidateImage}
          />
        </div>
      ) : null}
    </div>
  );
}
