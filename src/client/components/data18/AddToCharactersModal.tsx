import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { GalleryCard } from '../../../shared/galleryTypes';
import { useCharacters, useCreateCharacter } from '../../hooks/useCharacters';
import { usePornPicsSearch } from '../../hooks/useData18';
import { ApiError } from '../../lib/apiClient';
import BottomImageTray from '../import/BottomImageTray';

type CategoryKey = 'trans' | 'sluts' | 'twinks';

const CATEGORY_OPTIONS: { value: CategoryKey; label: string }[] = [
  { value: 'trans', label: 'Trans' },
  { value: 'sluts', label: 'Sluts' },
  { value: 'twinks', label: 'Twinks' },
];

const MAX_IMAGES = 6;

interface AddToCharactersModalProps {
  /** Performer name as shown on Data18. */
  name: string;
  onClose: () => void;
}

/** Creates a character from a Data18 performer, with photos looked up on PornPics. */
export default function AddToCharactersModal({ name: initialName, onClose }: AddToCharactersModalProps) {
  const [name, setName] = useState(initialName);
  const [searchName, setSearchName] = useState(initialName);
  const [categoryKey, setCategoryKey] = useState<CategoryKey>('sluts');
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [galleries, setGalleries] = useState<GalleryCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState<string | null>(null);

  const search = usePornPicsSearch(searchName, true);
  const { data: allCharacters = [] } = useCharacters({});
  const createCharacter = useCreateCharacter();

  // Every finished lookup replaces the candidate list and pre-selects the first photos.
  useEffect(() => {
    if (!search.data) return;
    setCandidates(search.data.images);
    setSelected(search.data.images.slice(0, MAX_IMAGES));
    setGalleries(search.data.galleries);
  }, [search.data]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmedName = name.trim();
  const duplicate = useMemo(
    () =>
      trimmedName
        ? allCharacters.find(
            (c) => c.categoryKey === categoryKey && c.name.trim().toLowerCase() === trimmedName.toLowerCase()
          )
        : undefined,
    [allCharacters, categoryKey, trimmedName]
  );

  function toggleImage(url: string) {
    setError(null);
    setSelected((current) => {
      if (current.includes(url)) return current.filter((u) => u !== url);
      return current.length >= MAX_IMAGES ? current : [...current, url];
    });
  }

  function setPrimary(url: string) {
    setSelected((current) => [url, ...current.filter((u) => u !== url)]);
  }

  function addImage(url: string) {
    setCandidates((current) => (current.includes(url) ? current : [...current, url]));
    setSelected((current) =>
      current.includes(url) || current.length >= MAX_IMAGES ? current : [...current, url]
    );
  }

  function removeCandidate(url: string) {
    setCandidates((current) => current.filter((u) => u !== url));
    setSelected((current) => current.filter((u) => u !== url));
  }

  async function handleSave() {
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (duplicate) {
      setError(`"${duplicate.name}" already exists in this category.`);
      return;
    }
    if (selected.length === 0) {
      setError('Pick at least 1 photo.');
      return;
    }
    try {
      setError(null);
      await createCharacter.mutateAsync({
        name: trimmedName,
        categoryKey,
        images: selected.map((url) => ({ url })),
      });
      setSavedName(trimmedName);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? `Could not save (${err.status}): ${err.message}`
          : 'Could not save the character. Please try again.'
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-10"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-card bg-bg-card border border-bg-hover p-6 flex flex-col gap-5 shadow-2xl"
      >
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-accent">
            From Data18
          </span>
          <h2 className="font-display text-2xl font-semibold text-fg mt-0.5">Add to characters</h2>
        </div>

        {savedName ? (
          <div className="flex flex-col items-start gap-3 rounded-button border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-300">
              <b>{savedName}</b> was added to the gallery with {selected.length} photo
              {selected.length === 1 ? '' : 's'}.
            </p>
            <div className="flex gap-2">
              <Link
                to="/gallery"
                className="rounded-button bg-accent px-3 py-1.5 text-xs font-bold text-black hover:opacity-90"
              >
                Open gallery
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-button bg-bg-muted px-3 py-1.5 text-xs font-semibold text-fg hover:bg-bg-hover cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
                  Character name
                </label>
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && trimmedName.length >= 2) setSearchName(trimmedName);
                    }}
                    className="min-w-0 flex-1 rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={search.isFetching || trimmedName.length < 2}
                    onClick={() => setSearchName(trimmedName)}
                    className="shrink-0 rounded-button bg-bg-hover px-3 py-2 text-xs font-medium text-fg hover:bg-bg-muted disabled:opacity-50 cursor-pointer"
                  >
                    Search photos
                  </button>
                </div>
                {duplicate ? (
                  <span className="text-xs text-amber-400">
                    "{duplicate.name}" already exists in this category.
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">Category</label>
                <select
                  value={categoryKey}
                  onChange={(e) => setCategoryKey(e.target.value as CategoryKey)}
                  className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {search.isFetching ? (
              <p className="text-xs font-mono text-fg-dim animate-pulse">Looking up photos on PornPics…</p>
            ) : search.error ? (
              <p className="text-xs text-rose-400">
                {search.error instanceof Error ? search.error.message : 'Photo lookup failed'}
              </p>
            ) : search.data && search.data.images.length === 0 && candidates.length === 0 ? (
              <p className="text-xs text-amber-400">
                No photos found for "{searchName}". Try another spelling and search again.
              </p>
            ) : null}

            <BottomImageTray
              availableImages={candidates}
              selectedImages={selected}
              onToggleImage={toggleImage}
              onSetPrimary={setPrimary}
              onAddImage={addImage}
              onRemoveCandidate={removeCandidate}
              showAddUrl
              galleries={galleries}
            />

            {error ? <p className="text-xs text-rose-400">{error}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-button bg-bg-muted px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg hover:bg-bg-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={createCharacter.isPending || !!duplicate || selected.length === 0 || !trimmedName}
                className="rounded-button bg-accent px-4 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {createCharacter.isPending ? 'Saving…' : 'Add character'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
