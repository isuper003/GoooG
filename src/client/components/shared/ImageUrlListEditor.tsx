import { useState } from 'react';
import { toProxiedImageUrl } from '../../lib/imageUrl';

const MIN_IMAGES = 1;
const MAX_IMAGES = 6;

interface ImageUrlListEditorProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUrlListEditor({ value, onChange }: ImageUrlListEditorProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  function addUrl() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (value.length >= MAX_IMAGES) {
      setError(`You can add at most ${MAX_IMAGES} images.`);
      return;
    }
    try {
      new URL(trimmed);
    } catch {
      setError('Enter a valid image URL.');
      return;
    }
    setError(null);
    onChange([...value, trimmed]);
    setDraft('');
  }

  function removeAt(index: number) {
    if (value.length <= MIN_IMAGES) {
      setError(`At least ${MIN_IMAGES} image is required.`);
      return;
    }
    setError(null);
    onChange(value.filter((_, i) => i !== index));
  }

  function moveEarlier(index: number) {
    if (index === 0) return;
    const copy = [...value];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    onChange(copy);
  }

  function moveLater(index: number) {
    if (index === value.length - 1) return;
    const copy = [...value];
    [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]];
    onChange(copy);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {value.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative aspect-square overflow-hidden rounded-button border border-bg-hover bg-bg-muted"
          >
            <img
              src={toProxiedImageUrl(url)}
              alt=""
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = '0.2';
              }}
            />
            {i === 0 ? (
              <span className="absolute top-1 left-1 rounded-badge bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                Primary
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/70 px-1 py-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => moveEarlier(i)}
                disabled={i === 0}
                className="px-1 text-xs text-white disabled:opacity-20"
                title="Move earlier"
              >
                &larr;
              </button>
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="px-1 text-xs text-rose-300 hover:text-rose-200"
                title="Remove"
              >
                &times;
              </button>
              <button
                type="button"
                onClick={() => moveLater(i)}
                disabled={i === value.length - 1}
                className="px-1 text-xs text-white disabled:opacity-20"
                title="Move later"
              >
                &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      {value.length < MAX_IMAGES ? (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="https://..."
            className="flex-1 rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg"
          />
          <button
            type="button"
            onClick={addUrl}
            className="rounded-button bg-bg-hover px-3 py-2 text-sm font-medium text-fg"
          >
            Add
          </button>
        </div>
      ) : null}

      <span className="text-xs text-fg-dim">
        {value.length} / {MAX_IMAGES} images &mdash; the first one is the primary image
      </span>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </div>
  );
}
