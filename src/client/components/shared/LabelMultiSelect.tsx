import { useState, useRef, useEffect, useMemo } from 'react';
import { useLabels, useCreateLabel } from '../../hooks/useLabels';
import { ApiError } from '../../lib/apiClient';

interface LabelMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  compact?: boolean;
}

export default function LabelMultiSelect({
  selectedIds,
  onChange,
  compact = false,
}: LabelMultiSelectProps) {
  const { data: labels = [] } = useLabels();
  const createLabel = useCreateLabel();
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function handleCreate(customName?: string) {
    const raw = customName !== undefined ? customName : (compact ? searchQuery : inputValue);
    const trimmed = raw.trim();
    if (!trimmed) return;

    const existing = labels.find((l) => l.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.id)) onChange([...selectedIds, existing.id]);
      setInputValue('');
      setSearchQuery('');
      setError(null);
      return;
    }

    try {
      setError(null);
      const created = await createLabel.mutateAsync({ name: trimmed });
      onChange([...selectedIds, created.id]);
      setInputValue('');
      setSearchQuery('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That label already exists.');
      } else {
        setError('Could not create that label.');
      }
    }
  }

  const selectedLabels = useMemo(
    () => labels.filter((l) => selectedIds.includes(l.id)),
    [labels, selectedIds]
  );

  const filteredLabels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return labels;
    return labels.filter((l) => l.name.toLowerCase().includes(q));
  }, [labels, searchQuery]);

  const exactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? labels.find((l) => l.name.toLowerCase() === q) : null;
  }, [labels, searchQuery]);

  if (compact) {
    return (
      <div className="relative inline-flex flex-wrap items-center gap-1.5" ref={popoverRef}>
        {selectedLabels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 rounded-badge bg-category-trans/20 border border-category-trans/40 text-category-trans px-2 py-0.5 text-xs font-semibold"
          >
            <span>{label.name}</span>
            <button
              type="button"
              onClick={() => toggle(label.id)}
              className="ml-0.5 text-category-trans/70 hover:text-white transition-colors"
              title="Remove label"
            >
              &times;
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setSearchQuery('');
            setError(null);
          }}
          className="inline-flex items-center gap-1 rounded-badge bg-bg-muted hover:bg-bg-hover border border-bg-hover text-fg-muted hover:text-fg px-2 py-0.5 text-xs font-medium transition-colors"
        >
          <span>🏷️</span>
          <span>{selectedLabels.length === 0 ? '+ Add Label' : '+'}</span>
        </button>

        {/* Dropdown Popover */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-1.5 z-30 w-64 rounded-card border border-bg-hover bg-bg-card p-2.5 shadow-2xl backdrop-blur-md flex flex-col gap-2">
            <div className="flex items-center justify-between pb-1 border-b border-bg-muted">
              <span className="text-[11px] font-bold uppercase tracking-wider text-fg-dim">
                Select Labels
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-fg-dim hover:text-fg"
              >
                &times;
              </button>
            </div>

            {/* Quick Filter Input */}
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (exactMatch) {
                    toggle(exactMatch.id);
                  } else if (searchQuery.trim()) {
                    handleCreate(searchQuery);
                  }
                }
              }}
              placeholder="Filter or create label..."
              className="w-full rounded-button border border-bg-hover bg-bg-muted px-2.5 py-1 text-xs text-fg placeholder:text-fg-dim focus:border-category-trans focus:outline-none"
            />

            {/* Label List without scrollbar */}
            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto no-scrollbar pt-1">
              {filteredLabels.length > 0 ? (
                filteredLabels.map((label) => {
                  const isChecked = selectedIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggle(label.id)}
                      className={`flex items-center justify-between rounded-button px-2 py-1 text-xs transition-colors text-left ${
                        isChecked
                          ? 'bg-category-trans/20 text-category-trans font-bold'
                          : 'hover:bg-bg-hover text-fg'
                      }`}
                    >
                      <span className="truncate">{label.name}</span>
                      {isChecked ? <span className="text-category-trans font-bold">✓</span> : null}
                    </button>
                  );
                })
              ) : (
                <span className="text-[11px] text-fg-dim py-1 text-center">
                  No matching labels
                </span>
              )}
            </div>

            {/* Create new label prompt if query doesn't match */}
            {searchQuery.trim() && !exactMatch ? (
              <div className="border-t border-bg-muted pt-1.5">
                <button
                  type="button"
                  onClick={() => handleCreate(searchQuery)}
                  disabled={createLabel.isPending}
                  className="w-full rounded-button bg-category-trans/20 hover:bg-category-trans/30 border border-category-trans/40 px-2 py-1 text-xs font-semibold text-category-trans transition-colors text-left truncate"
                >
                  + Create &ldquo;{searchQuery.trim()}&rdquo;
                </button>
              </div>
            ) : null}

            {error ? <span className="text-[10px] text-rose-400">{error}</span> : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => {
            const selected = selectedIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggle(label.id)}
                className={`rounded-badge px-3 py-1 text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-category-trans text-white'
                    : 'bg-bg-muted text-fg-muted hover:bg-bg-hover hover:text-fg'
                }`}
              >
                {label.name}
              </button>
            );
          })}
        </div>
      ) : (
        <span className="text-xs text-fg-dim">No labels yet &mdash; create one below.</span>
      )}

      <div className="flex gap-2">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="Add a label..."
          className="flex-1 rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg"
        />
        <button
          type="button"
          onClick={() => handleCreate()}
          disabled={createLabel.isPending}
          className="rounded-button bg-bg-hover px-3 py-2 text-sm font-medium text-fg disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </div>
  );
}

