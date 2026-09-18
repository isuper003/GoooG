import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import type { CharacterDTO } from '../../shared/types';
import type { CharacterSort } from '../lib/apiClient';
import { useCharacters, useDeleteCharacter, useSetCharacterActive } from '../hooks/useCharacters';
import { useLabels } from '../hooks/useLabels';
import CharacterCard from '../components/gallery/CharacterCard';
import CharacterEditModal from '../components/gallery/CharacterEditModal';
import ImageLightbox from '../components/gallery/ImageLightbox';
import LabelManager from '../components/gallery/LabelManager';
import ConfirmDialog from '../components/ui/ConfirmDialog';

type CategoryFilter = 'trans' | 'sluts' | 'twinks' | undefined;

export default function GalleryPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>(undefined);
  const [labelFilter, setLabelFilter] = useState<number | undefined>(undefined);
  const [sort, setSort] = useState<CharacterSort>('newest');

  const [editingCharacter, setEditingCharacter] = useState<CharacterDTO | null>(null);
  const [viewingImagesFor, setViewingImagesFor] = useState<CharacterDTO | null>(null);
  const [deletingCharacter, setDeletingCharacter] = useState<CharacterDTO | null>(null);
  const [showLabelManager, setShowLabelManager] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: characters = [], isLoading } = useCharacters({
    category,
    label: labelFilter,
    search: debouncedSearch || undefined,
    sort,
  });
  const { data: labels = [] } = useLabels();
  const deleteCharacter = useDeleteCharacter();
  const setCharacterActive = useSetCharacterActive();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-fg">
            Gallery
          </h1>
          <p className="text-fg-muted mt-1 text-sm">
            Browse, inspect, and organize character case files.
          </p>
        </div>
        {!isLoading && (
          <span className="font-mono text-xs font-medium text-fg-dim border border-bg-hover bg-bg-card px-3 py-1 rounded-badge">
            {characters.length} {characters.length === 1 ? 'record' : 'records'} on file
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center bg-bg-card border border-bg-hover p-3 rounded-card shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by character name..."
          className="flex-1 min-w-[10rem] rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-accent focus:outline-none"
        />
        <select
          value={category ?? ''}
          onChange={(e) => setCategory((e.target.value || undefined) as CategoryFilter)}
          className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none"
        >
          <option value="">All categories</option>
          <option value="trans">Trans</option>
          <option value="sluts">Sluts</option>
          <option value="twinks">Twinks</option>
        </select>
        <select
          value={labelFilter ?? ''}
          onChange={(e) => setLabelFilter(e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none"
        >
          <option value="">All labels</option>
          {labels.map((label) => (
            <option key={label.id} value={label.id}>
              {label.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as CharacterSort)}
          className="rounded-button border border-bg-hover bg-bg-muted px-3 py-2 text-sm font-medium text-fg focus:border-accent focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="category">Category</option>
          <option value="most_correct">Most correct</option>
          <option value="least_correct">Least correct</option>
          <option value="weakest">Weakest first</option>
        </select>
        <button
          type="button"
          onClick={() => setShowLabelManager(true)}
          className="whitespace-nowrap rounded-button bg-bg-muted px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg border border-bg-hover"
        >
          🏷️ Manage labels
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-fg-dim font-mono text-sm">
          Searching archives...
        </div>
      ) : characters.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center border-2 border-dashed border-bg-hover rounded-card p-8">
          {debouncedSearch || category || labelFilter ? (
            <>
              <p className="font-display text-lg text-fg">No matching case files</p>
              <p className="text-sm text-fg-muted">Try adjusting or clearing your search filters.</p>
            </>
          ) : (
            <>
              <p className="font-display text-xl text-fg">No character records on file</p>
              <p className="text-sm text-fg-muted max-w-sm">
                Add characters via the Web Crawler or by name to begin building the archive.
              </p>
              <Link
                to="/import"
                className="mt-2 rounded-button bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
              >
                Go to Importer
              </Link>
            </>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={() => setEditingCharacter(character)}
              onViewImages={() => setViewingImagesFor(character)}
              onDelete={() => setDeletingCharacter(character)}
              onToggleActive={() =>
                setCharacterActive.mutate({ id: character.id, isActive: !character.isActive })
              }
              isTogglingActive={
                setCharacterActive.isPending && setCharacterActive.variables?.id === character.id
              }
            />
          ))}
        </motion.div>
      )}

      {editingCharacter ? (
        <CharacterEditModal character={editingCharacter} onClose={() => setEditingCharacter(null)} />
      ) : null}

      {viewingImagesFor ? (
        <ImageLightbox
          images={viewingImagesFor.images.map((img) => img.url)}
          characterName={viewingImagesFor.name}
          onClose={() => setViewingImagesFor(null)}
        />
      ) : null}

      {showLabelManager ? <LabelManager onClose={() => setShowLabelManager(false)} /> : null}

      {deletingCharacter ? (
        <ConfirmDialog
          title="Delete character?"
          message={`This permanently deletes "${deletingCharacter.name}" and its play history.`}
          onCancel={() => setDeletingCharacter(null)}
          onConfirm={async () => {
            await deleteCharacter.mutateAsync(deletingCharacter.id);
            setDeletingCharacter(null);
          }}
        />
      ) : null}
    </div>
  );
}
