import { useMemo, useState } from 'react';
import type { CharacterDTO } from '../../../shared/types';
import { useCharacters, useUpdateCharacter } from '../../hooks/useCharacters';
import LabelMultiSelect from '../shared/LabelMultiSelect';
import ImageUrlListEditor from '../shared/ImageUrlListEditor';

interface CharacterEditModalProps {
  character: CharacterDTO;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { value: 'trans' | 'sluts' | 'twinks'; label: string }[] = [
  { value: 'trans', label: 'Trans' },
  { value: 'sluts', label: 'Sluts' },
  { value: 'twinks', label: 'Twinks' },
];

export default function CharacterEditModal({ character, onClose }: CharacterEditModalProps) {
  const [name, setName] = useState(character.name);
  const [categoryKey, setCategoryKey] = useState<'trans' | 'sluts' | 'twinks'>(
    character.categoryKey as 'trans' | 'sluts' | 'twinks'
  );
  const [labelIds, setLabelIds] = useState<number[]>(character.labels.map((l) => l.id));
  const [images, setImages] = useState<string[]>(character.images.map((img) => img.url));
  const [error, setError] = useState<string | null>(null);

  const updateCharacter = useUpdateCharacter();
  const { data: allCharacters = [] } = useCharacters({});

  const duplicateWarning = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    const duplicate = allCharacters.find(
      (c) =>
        c.id !== character.id &&
        c.categoryKey === categoryKey &&
        c.name.trim().toLowerCase() === trimmed
    );
    return duplicate ? `Another character named "${duplicate.name}" is already in this category.` : null;
  }, [allCharacters, name, categoryKey, character.id]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (images.length === 0) {
      setError('At least 1 image is required.');
      return;
    }
    try {
      setError(null);
      await updateCharacter.mutateAsync({
        id: character.id,
        body: { name: trimmedName, categoryKey, labelIds, images: images.map((url) => ({ url })) },
      });
      onClose();
    } catch {
      setError('Could not save changes. Please try again.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-card bg-bg-card border border-bg-hover p-6 flex flex-col gap-5"
      >
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
            Case Record #{character.id}
          </span>
          <h2 className="font-display text-2xl font-semibold text-fg mt-0.5">
            Edit Character File
          </h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">Character Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
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
            onChange={(e) => setCategoryKey(e.target.value as 'trans' | 'sluts' | 'twinks')}
            className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none"
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
          <LabelMultiSelect compact selectedIds={labelIds} onChange={setLabelIds} />
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

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-button bg-bg-muted px-4 py-2.5 font-medium text-fg-muted hover:bg-bg-hover hover:text-fg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateCharacter.isPending}
            className="flex-1 rounded-button bg-accent px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {updateCharacter.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
