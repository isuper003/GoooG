import { useMemo, useState } from 'react';
import type { CharacterDTO } from '../../../shared/types';
import { useCharacters, useUpdateCharacter } from '../../hooks/useCharacters';
import { apiClient, ApiError } from '../../lib/apiClient';
import LabelMultiSelect from '../shared/LabelMultiSelect';
import ImageUrlListEditor from '../shared/ImageUrlListEditor';
import BottomImageTray from '../import/BottomImageTray';
import type { GalleryCard } from '../../../shared/galleryTypes';

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

  // Web crawler image extraction state
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState<string | null>(null);
  const [candidateImages, setCandidateImages] = useState<string[]>([]);
  const [galleries, setGalleries] = useState<GalleryCard[]>([]);
  const [showTray, setShowTray] = useState(false);

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

  async function handleCrawlWebImages() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setCrawlError('Character name is required to crawl images.');
      return;
    }
    setIsCrawling(true);
    setCrawlError(null);
    try {
      const response = await apiClient.crawlByNames([trimmedName], categoryKey, true);
      const foundItem = response.items?.[0];
      if (!foundItem || foundItem.availableImages.length === 0) {
        setCrawlError(`No web photos found for "${trimmedName}".`);
      } else {
        const combined = Array.from(new Set([...images, ...foundItem.availableImages]));
        setCandidateImages(combined);
        setGalleries(foundItem.galleries ?? []);
        setShowTray(true);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setCrawlError(`Crawl error (${err.status}): ${err.message}`);
      } else {
        setCrawlError(err instanceof Error ? err.message : 'Failed to crawl images from web.');
      }
    } finally {
      setIsCrawling(false);
    }
  }

  function toggleCandidateImage(url: string) {
    if (images.includes(url)) {
      if (images.length <= 1) {
        setError('At least 1 image is required.');
        return;
      }
      setError(null);
      setImages(images.filter((u) => u !== url));
    } else {
      if (images.length >= 6) return;
      setError(null);
      setImages([...images, url]);
    }
  }

  function setPrimaryCandidate(url: string) {
    const filtered = images.filter((u) => u !== url);
    setImages([url, ...filtered]);
  }

  function addCandidateImage(url: string) {
    if (!candidateImages.includes(url)) {
      setCandidateImages([...candidateImages, url]);
    }
    if (!images.includes(url) && images.length < 6) {
      setImages([...images, url]);
    }
  }

  function removeCandidateImage(url: string) {
    setCandidateImages(candidateImages.filter((u) => u !== url));
    setImages(images.filter((u) => u !== url));
  }

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
        className={`w-full transition-all duration-200 rounded-card bg-bg-card border border-bg-hover p-6 flex flex-col gap-5 shadow-2xl ${
          showTray && candidateImages.length > 0 ? 'max-w-3xl' : 'max-w-lg'
        }`}
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

        {/* Images section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-fg-dim">
              Images ({images.length}/6)
            </label>
            <div className="flex items-center gap-2">
              {candidateImages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowTray(!showTray)}
                  className="rounded-button bg-bg-muted hover:bg-bg-hover px-2.5 py-1 text-xs font-medium text-fg-muted hover:text-fg transition-colors"
                >
                  {showTray ? 'Hide Web Tray' : `Show Web Tray (${candidateImages.length})`}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleCrawlWebImages}
                disabled={isCrawling || !name.trim()}
                className="inline-flex items-center gap-1.5 rounded-button bg-accent/10 border border-accent/30 hover:bg-accent/20 px-3 py-1 text-xs font-bold text-accent transition-colors disabled:opacity-50"
              >
                {isCrawling ? (
                  <>
                    <span className="inline-block animate-spin">⟳</span>
                    <span>Fetching Web Images...</span>
                  </>
                ) : (
                  <>
                    <span>🌐 Crawl Images from Web</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {crawlError ? (
            <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
              {crawlError}
            </div>
          ) : null}

          <ImageUrlListEditor value={images} onChange={setImages} />

          {/* Web Candidates Tray */}
          {showTray && candidateImages.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                Web Gallery Candidates &mdash; click to select / deselect
              </span>
              <BottomImageTray
                availableImages={candidateImages}
                selectedImages={images}
                onToggleImage={toggleCandidateImage}
                onSetPrimary={setPrimaryCandidate}
                onAddImage={addCandidateImage}
                onRemoveCandidate={removeCandidateImage}
                showAddUrl={false}
                galleries={galleries}
              />
            </div>
          ) : null}
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
