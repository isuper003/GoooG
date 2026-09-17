import { useMemo, useState } from 'react';
import { useCharacters, useCreateCharacter } from '../hooks/useCharacters';
import LabelMultiSelect from '../components/shared/LabelMultiSelect';
import ImageUrlListEditor from '../components/shared/ImageUrlListEditor';

const CATEGORY_OPTIONS: { value: 'male' | 'female' | 'boys'; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'boys', label: 'Boys' },
];

export default function ImportPage() {
  const [name, setName] = useState('');
  const [categoryKey, setCategoryKey] = useState<'male' | 'female' | 'boys'>('male');
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createCharacter = useCreateCharacter();
  const { data: allCharacters = [] } = useCharacters({});

  const duplicateWarning = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    const duplicate = allCharacters.find(
      (c) => c.categoryKey === categoryKey && c.name.trim().toLowerCase() === trimmed
    );
    return duplicate ? `A character named "${duplicate.name}" already exists in this category.` : null;
  }, [allCharacters, name, categoryKey]);

  function resetForm() {
    setName('');
    setLabelIds([]);
    setImages([]);
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    setSuccessMessage(null);
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (images.length === 0) {
      setError('At least 1 image URL is required.');
      return;
    }
    try {
      setError(null);
      const created = await createCharacter.mutateAsync({
        name: trimmedName,
        categoryKey,
        labelIds,
        images: images.map((url) => ({ url })),
      });
      setSuccessMessage(`"${created.name}" was added.`);
      resetForm();
    } catch {
      setError('Could not create this character. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-fg">Smart Import</h1>
        <p className="text-fg-muted mt-1">Add a new character to your collection.</p>
      </div>

      <div className="max-w-xl rounded-card border border-bg-hover bg-bg-card p-6 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
            className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg"
          />
          {duplicateWarning ? (
            <span className="text-xs text-amber-400">{duplicateWarning}</span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
            Category
          </label>
          <select
            value={categoryKey}
            onChange={(e) => setCategoryKey(e.target.value as 'male' | 'female' | 'boys')}
            className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">Labels</label>
          <LabelMultiSelect selectedIds={labelIds} onChange={setLabelIds} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
            Images (1&ndash;6 URLs)
          </label>
          <ImageUrlListEditor value={images} onChange={setImages} />
        </div>

        {error ? (
          <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="rounded-button bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={createCharacter.isPending}
          className="rounded-button bg-category-male px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {createCharacter.isPending ? 'Adding...' : 'Add character'}
        </button>
      </div>

      <div className="max-w-xl rounded-card border border-dashed border-bg-hover bg-bg-card/50 p-6 opacity-60">
        <h2 className="font-semibold text-fg-muted">More import methods coming soon</h2>
        <p className="text-sm text-fg-dim mt-1">
          Bulk and AI-assisted import will be added here later.
        </p>
      </div>
    </div>
  );
}
