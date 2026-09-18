import { useMemo, useState } from 'react';
import { useCharacters, useCreateCharacter } from '../hooks/useCharacters';
import LabelMultiSelect from '../components/shared/LabelMultiSelect';
import ImageUrlListEditor from '../components/shared/ImageUrlListEditor';
import CrawlerSection from '../components/import/CrawlerSection';
import CrawlByNameSection from '../components/import/CrawlByNameSection';

const CATEGORY_OPTIONS: { value: 'trans' | 'sluts' | 'twinks'; label: string }[] = [
  { value: 'trans', label: 'Trans' },
  { value: 'sluts', label: 'Sluts' },
  { value: 'twinks', label: 'Twinks' },
];

export default function ImportPage() {
  const [importMode, setImportMode] = useState<'crawler' | 'byName' | 'manual'>('crawler');

  // Single manual form state
  const [name, setName] = useState('');
  const [categoryKey, setCategoryKey] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

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

  function resetManualForm() {
    setName('');
    setLabelIds([]);
    setImages([]);
  }

  async function handleManualSubmit() {
    const trimmedName = name.trim();
    setManualSuccess(null);
    if (!trimmedName) {
      setManualError('Name is required.');
      return;
    }
    if (images.length === 0) {
      setManualError('At least 1 image URL is required.');
      return;
    }
    try {
      setManualError(null);
      const created = await createCharacter.mutateAsync({
        name: trimmedName,
        categoryKey,
        labelIds,
        images: images.map((url) => ({ url })),
      });
      setManualSuccess(`"${created.name}" was added successfully.`);
      resetManualForm();
    } catch {
      setManualError('Could not create this character. Please try again.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Modes */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-fg">Character Importer</h1>
          <p className="text-fg-muted mt-1 text-sm">
            Crawl target category pages, look characters up by name, or add a single character manually.
          </p>
        </div>

        {/* Mode Buttons */}
        <div className="flex items-center rounded-button bg-bg-card border border-bg-hover p-1">
          <button
            type="button"
            onClick={() => setImportMode('crawler')}
            className={`rounded-button px-3.5 py-1.5 text-xs font-semibold transition-all ${
              importMode === 'crawler'
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            🌐 Web Crawler
          </button>
          <button
            type="button"
            onClick={() => setImportMode('byName')}
            className={`rounded-button px-3.5 py-1.5 text-xs font-semibold transition-all ${
              importMode === 'byName'
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            🔎 By Name
          </button>
          <button
            type="button"
            onClick={() => setImportMode('manual')}
            className={`rounded-button px-3.5 py-1.5 text-xs font-semibold transition-all ${
              importMode === 'manual'
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            ✍ Single Manual Add
          </button>
        </div>
      </div>

      {/* MODE 1: Web Crawler */}
      {importMode === 'crawler' ? <CrawlerSection /> : null}

      {/* MODE 2: Crawl by Name */}
      {importMode === 'byName' ? <CrawlByNameSection /> : null}

      {/* MODE 3: Single Manual Form */}
      {importMode === 'manual' ? (
        <div className="max-w-xl rounded-card border border-bg-hover bg-bg-card p-6 flex flex-col gap-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-fg">
            Add a character manually
          </h2>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Character Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Character Name"
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
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Labels
            </label>
            <LabelMultiSelect compact selectedIds={labelIds} onChange={setLabelIds} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Images (1&ndash;6 URLs)
            </label>
            <ImageUrlListEditor value={images} onChange={setImages} />
          </div>

          {manualError ? (
            <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
              {manualError}
            </div>
          ) : null}
          {manualSuccess ? (
            <div className="rounded-button bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-sm text-emerald-300">
              {manualSuccess}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={createCharacter.isPending}
            className="rounded-button bg-accent px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {createCharacter.isPending ? 'Adding...' : 'Add character'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
