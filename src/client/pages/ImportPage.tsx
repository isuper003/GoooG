import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError } from '../lib/apiClient';
import { useCharacters, useCreateCharacter } from '../hooks/useCharacters';
import LabelMultiSelect from '../components/shared/LabelMultiSelect';
import ImageUrlListEditor from '../components/shared/ImageUrlListEditor';
import CrawlerSection from '../components/import/CrawlerSection';
import CrawlByNameSection from '../components/import/CrawlByNameSection';
import BackupRestoreSection from '../components/import/BackupRestoreSection';

const CATEGORY_OPTIONS: { value: 'trans' | 'sluts' | 'twinks'; label: string }[] = [
  { value: 'trans', label: 'Trans' },
  { value: 'sluts', label: 'Sluts' },
  { value: 'twinks', label: 'Twinks' },
];

export default function ImportPage() {
  const [params, setParams] = useSearchParams();
  const initialMode = (params.get('mode') as 'crawler' | 'byName' | 'manual' | 'backup') || 'crawler';
  const [importMode, setImportMode] = useState<'crawler' | 'byName' | 'manual' | 'backup'>(
    ['crawler', 'byName', 'manual', 'backup'].includes(initialMode) ? initialMode : 'crawler'
  );

  function handleModeChange(mode: 'crawler' | 'byName' | 'manual' | 'backup') {
    setImportMode(mode);
    setParams(mode === 'crawler' ? {} : { mode });
  }

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
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message || `Could not create this character (${err.status}).`
          : err instanceof Error
          ? err.message
          : 'Could not create this character. Please try again.';
      setManualError(msg);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Modes */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-semibold">
            Curation Studio
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight mt-0.5">
            Photo Studio &amp; Importer
          </h1>
          <p className="text-white/50 mt-1 text-xs">
            Ingest candidates via high-speed web crawler, query by name, or manually curate facial flashcards.
          </p>
        </div>

        {/* Mode Buttons */}
        <div className="flex items-center rounded-xl bg-white/[0.04] border border-white/10 p-1 flex-wrap gap-1">
          <button
            type="button"
            onClick={() => handleModeChange('crawler')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              importMode === 'crawler'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            🌐 Web Crawler
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('byName')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              importMode === 'byName'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            🔎 By Name
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('manual')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              importMode === 'manual'
                ? 'bg-white text-black shadow-sm'
                : 'text-white/50 hover:text-white'
            }`}
          >
            ✍ Manual Add
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('backup')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              importMode === 'backup'
                ? 'bg-cyan-400 text-black shadow-sm font-bold'
                : 'text-cyan-400/70 hover:text-cyan-300'
            }`}
          >
            📦 Full Backup &amp; Restore
          </button>
        </div>
      </div>

      {/* MODE 1: Web Crawler */}
      {importMode === 'crawler' ? <CrawlerSection /> : null}

      {/* MODE 2: Crawl by Name */}
      {importMode === 'byName' ? <CrawlByNameSection /> : null}

      {/* MODE 3: Backup and Restore */}
      {importMode === 'backup' ? <BackupRestoreSection /> : null}

      {/* MODE 3: Single Manual Form */}
      {importMode === 'manual' ? (
        <div className="max-w-xl hairline-card rounded-3xl border border-white/10 bg-[#090d14] p-6 sm:p-8 flex flex-col gap-5 shadow-2xl">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
              Manual Ingestion Protocol
            </span>
            <h2 className="font-display text-2xl font-bold text-white mt-0.5">
              Add Character File
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-white/50">
              Character Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Performer Name"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none transition-colors"
            />
            {duplicateWarning ? (
              <span className="text-xs text-amber-400 font-mono">{duplicateWarning}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-white/50">
              Category
            </label>
            <select
              value={categoryKey}
              onChange={(e) => setCategoryKey(e.target.value as 'trans' | 'sluts' | 'twinks')}
              className="rounded-xl border border-white/10 bg-[#090d14] px-3.5 py-2.5 text-sm font-medium text-white focus:border-cyan-400 focus:outline-none transition-colors"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} Deck
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-white/50">
              Labels
            </label>
            <LabelMultiSelect compact selectedIds={labelIds} onChange={setLabelIds} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-white/50">
              Images (1&ndash;6 URLs)
            </label>
            <ImageUrlListEditor value={images} onChange={setImages} />
          </div>

          {manualError ? (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2 text-xs text-rose-300 font-mono">
              {manualError}
            </div>
          ) : null}
          {manualSuccess ? (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs text-emerald-300 font-mono">
              {manualSuccess}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={createCharacter.isPending}
            className="w-full py-3 rounded-xl bg-cyan-400 hover:bg-white text-black font-semibold text-xs transition-colors shadow-lg shadow-cyan-400/20 disabled:opacity-50 cursor-pointer mt-2"
          >
            {createCharacter.isPending ? 'Saving Character...' : 'Save to Gallery →'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
