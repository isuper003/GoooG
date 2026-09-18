import { useState } from 'react';
import { useLabels, useCreateLabel } from '../../hooks/useLabels';
import { ApiError } from '../../lib/apiClient';

interface LabelMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export default function LabelMultiSelect({ selectedIds, onChange }: LabelMultiSelectProps) {
  const { data: labels = [] } = useLabels();
  const createLabel = useCreateLabel();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  async function handleCreate() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const existing = labels.find((l) => l.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.id)) onChange([...selectedIds, existing.id]);
      setInputValue('');
      setError(null);
      return;
    }

    try {
      setError(null);
      const created = await createLabel.mutateAsync({ name: trimmed });
      onChange([...selectedIds, created.id]);
      setInputValue('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('That label already exists — pick it from the list above.');
      } else {
        setError('Could not create that label.');
      }
    }
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
          onClick={handleCreate}
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
