import { useState, useRef } from 'react';

interface BottomImageTrayProps {
  availableImages: string[];
  selectedImages: string[];
  onToggleImage: (url: string) => void;
  onSetPrimary: (url: string) => void;
  onAddImage: (url: string) => void;
  onRemoveCandidate: (url: string) => void;
  showAddUrl?: boolean;
}

export default function BottomImageTray({
  availableImages,
  selectedImages,
  onToggleImage,
  onSetPrimary,
  onAddImage,
  onRemoveCandidate,
  showAddUrl = false,
}: BottomImageTrayProps) {
  const [newUrl, setNewUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollLeft() {
    scrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' });
  }

  function scrollRight() {
    scrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' });
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (e.deltaY !== 0 && scrollRef.current) {
      if (scrollRef.current.scrollWidth > scrollRef.current.clientWidth) {
        scrollRef.current.scrollLeft += e.deltaY;
      }
    }
  }

  function handleAddUrl() {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      setUrlError('Please enter a valid URL.');
      return;
    }
    setUrlError(null);
    onAddImage(trimmed);
    setNewUrl('');
  }

  function handleSelectAll() {
    // Select up to 6 available images
    const toSelect = availableImages.slice(0, 6);
    toSelect.forEach((url) => {
      if (!selectedImages.includes(url)) {
        onToggleImage(url);
      }
    });
  }

  function handleClearSelection() {
    [...selectedImages].forEach((url) => onToggleImage(url));
  }

  return (
    <div className="rounded-card border border-bg-hover bg-bg-card/95 p-4 backdrop-blur-md flex flex-col gap-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bg-muted pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-fg">
            Candidate Images ({availableImages.length})
          </span>
          <span
            className={`rounded-badge px-2 py-0.5 text-[11px] font-semibold ${
              selectedImages.length >= 1 && selectedImages.length <= 6
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-amber-500/20 text-amber-300'
            }`}
          >
            {selectedImages.length}/6 selected
          </span>
          {selectedImages.length === 0 ? (
            <span className="text-xs text-rose-400 font-medium">
              (Select at least 1 image to save)
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={availableImages.length === 0 || selectedImages.length >= 6}
            className="rounded-button bg-bg-muted px-2.5 py-1 text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors disabled:opacity-40"
          >
            Select Top 6
          </button>
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={selectedImages.length === 0}
            className="rounded-button bg-bg-muted px-2.5 py-1 text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors disabled:opacity-40"
          >
            Clear Selected
          </button>
        </div>
      </div>

      {availableImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center text-fg-muted">
          <p className="text-xs">No candidate images available for this character yet.</p>
          {showAddUrl ? (
            <p className="text-[11px] text-fg-dim mt-0.5">Paste an image URL below to add one.</p>
          ) : null}
        </div>
      ) : (
        <div className="relative group/scroll-container">
          {availableImages.length > 3 && (
            <button
              type="button"
              onClick={scrollLeft}
              className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-bg-card/90 border border-bg-hover hover:border-fg text-fg shadow-lg w-7 h-7 flex items-center justify-center text-sm font-bold opacity-0 group-hover/scroll-container:opacity-100 transition-opacity"
              title="Scroll left"
            >
              ‹
            </button>
          )}

          <div
            ref={scrollRef}
            onWheel={handleWheel}
            className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth"
          >
            {availableImages.map((url, idx) => {
              const selectedIdx = selectedImages.indexOf(url);
              const isSelected = selectedIdx !== -1;
              const isPrimary = selectedIdx === 0;

              return (
                <div
                  key={`${url}-${idx}`}
                  className={`group relative shrink-0 aspect-square w-32 sm:w-36 overflow-hidden rounded-button border-2 transition-all cursor-pointer ${
                    isSelected
                      ? isPrimary
                        ? 'border-accent ring-2 ring-accent/40 shadow-md shadow-accent/20'
                        : 'border-emerald-400 ring-1 ring-emerald-400/40'
                      : 'border-bg-hover hover:border-fg-dim opacity-70 hover:opacity-100'
                  }`}
                  onClick={() => onToggleImage(url)}
                >
                  <img
                    src={url}
                    alt={`Candidate ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />

                  {/* Selection badge */}
                  {isSelected ? (
                    <div
                      className={`absolute top-1 left-1 flex items-center justify-center rounded-badge px-2 py-0.5 text-xs font-bold text-white shadow-sm ${
                        isPrimary ? 'bg-accent' : 'bg-emerald-500'
                      }`}
                    >
                      {isPrimary ? '★ Primary' : `#${selectedIdx + 1}`}
                    </div>
                  ) : (
                    <div className="absolute top-1 left-1 hidden group-hover:flex items-center justify-center rounded-badge bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-fg-muted">
                      Click to pick
                    </div>
                  )}

                  {/* Quick actions overlay on hover */}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/80 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isSelected && !isPrimary ? (
                      <button
                        type="button"
                        onClick={() => onSetPrimary(url)}
                        className="text-[11px] font-semibold text-accent hover:underline"
                      >
                        Make primary
                      </button>
                    ) : (
                      <span className="text-[10px] text-fg-dim">
                        {isSelected ? 'Primary' : 'Unselected'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveCandidate(url)}
                      className="text-xs text-rose-300 hover:text-rose-100 px-1"
                      title="Remove from candidate list"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {availableImages.length > 3 && (
            <button
              type="button"
              onClick={scrollRight}
              className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-bg-card/90 border border-bg-hover hover:border-fg text-fg shadow-lg w-7 h-7 flex items-center justify-center text-sm font-bold opacity-0 group-hover/scroll-container:opacity-100 transition-opacity"
              title="Scroll right"
            >
              ›
            </button>
          )}
        </div>
      )}

      {/* Direct Add Image URL row */}
      {showAddUrl ? (
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="Paste another image URL for this character..."
              className="flex-1 rounded-button border border-bg-hover bg-bg-muted px-3 py-1.5 text-xs text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddUrl}
              className="rounded-button bg-bg-hover px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg-muted transition-colors"
            >
              Add Image
            </button>
          </div>
          {urlError ? <span className="text-xs text-rose-400">{urlError}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

