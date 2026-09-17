import { useState } from 'react';
import { useLabels, useCreateLabel, useDeleteLabel } from '../../hooks/useLabels';
import { ApiError } from '../../lib/apiClient';

interface LabelManagerProps {
  onClose: () => void;
}

export default function LabelManager({ onClose }: LabelManagerProps) {
  const { data: labels = [] } = useLabels();
  const createLabel = useCreateLabel();
  const deleteLabel = useDeleteLabel();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      setError(null);
      await createLabel.mutateAsync({ name: trimmed });
      setName('');
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? 'That label already exists.'
          : 'Could not create that label.'
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-card bg-bg-card border border-bg-hover p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-fg">Manage labels</h2>
          <button type="button" onClick={onClose} className="text-sm text-fg-muted hover:text-fg">
            Close
          </button>
        </div>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {labels.length === 0 ? (
            <p className="text-sm text-fg-muted">No labels yet.</p>
          ) : (
            labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center justify-between rounded-button bg-bg-muted px-3 py-2"
              >
                <span className="text-sm text-fg">{label.name}</span>
                {confirmingId === label.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        deleteLabel.mutate(label.id, { onSettled: () => setConfirmingId(null) })
                      }
                      className="font-semibold text-rose-400 hover:text-rose-300"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="text-fg-muted hover:text-fg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(label.id)}
                    className="text-xs text-fg-muted hover:text-rose-400"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreate();
              }
            }}
            placeholder="New label name"
            className="flex-1 rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createLabel.isPending}
            className="rounded-button bg-category-male px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error ? <span className="text-xs text-rose-400">{error}</span> : null}
      </div>
    </div>
  );
}
