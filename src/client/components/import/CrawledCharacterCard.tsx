import type { CharacterDTO } from '../../../shared/types';
import LabelMultiSelect from '../shared/LabelMultiSelect';
import BottomImageTray from './BottomImageTray';
import { toProxiedImageUrl } from '../../lib/imageUrl';
import type { GalleryCard } from '../../../shared/galleryTypes';

export interface CrawlerQueueItem {
  id: string;
  name: string;
  avatarUrl?: string;
  categoryKey: 'trans' | 'sluts' | 'twinks';
  labelIds: number[];
  availableImages: string[];
  /** Galleries the crawled covers came from (absent for characters that already exist). */
  galleries?: GalleryCard[];
  selectedImages: string[];
  status: 'pending' | 'imported' | 'failed';
  error?: string;
  isSelected: boolean;
}

interface CrawledCharacterCardProps {
  item: CrawlerQueueItem;
  duplicate?: CharacterDTO;
  onUpdate: (updates: Partial<CrawlerQueueItem>) => void;
}

export default function CrawledCharacterCard({ item, duplicate, onUpdate }: CrawledCharacterCardProps) {
  function toggleSelectedImage(url: string) {
    if (item.selectedImages.includes(url)) {
      onUpdate({ selectedImages: item.selectedImages.filter((u) => u !== url) });
    } else {
      if (item.selectedImages.length >= 6) return;
      onUpdate({ selectedImages: [...item.selectedImages, url] });
    }
  }

  function setPrimaryImage(url: string) {
    const filtered = item.selectedImages.filter((u) => u !== url);
    onUpdate({ selectedImages: [url, ...filtered] });
  }

  function addAvailableImage(url: string) {
    if (item.availableImages.includes(url)) return;
    const newAvail = [...item.availableImages, url];
    const newSelected = item.selectedImages.length < 6 ? [...item.selectedImages, url] : item.selectedImages;
    onUpdate({ availableImages: newAvail, selectedImages: newSelected });
  }

  function removeCandidateImage(url: string) {
    onUpdate({
      availableImages: item.availableImages.filter((u) => u !== url),
      selectedImages: item.selectedImages.filter((u) => u !== url),
    });
  }

  return (
    <div
      className={`relative flex flex-col gap-3.5 p-4 rounded-card border shadow-sm transition-all ${
        item.isSelected
          ? 'border-bg-hover bg-bg-card hover:border-accent/50'
          : 'border-bg-hover/50 bg-bg-card/50 opacity-60 hover:opacity-90'
      }`}
    >
      {/* Card Header Row: Checkbox, Profile Avatar, Name, Category Badge, Compact Labels Picker, and Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bg-muted/70 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Checkbox per character */}
          <label
            className="flex items-center cursor-pointer p-1"
            title={item.isSelected ? 'Deselect character' : 'Select character'}
          >
            <input
              type="checkbox"
              checked={item.isSelected}
              onChange={(e) => onUpdate({ isSelected: e.target.checked })}
              className="w-5 h-5 rounded border-2 border-bg-hover accent-accent cursor-pointer transition-transform hover:scale-110"
            />
          </label>

          {/* Avatar aligned with name */}
          <div className="aspect-square w-14 h-14 rounded-card overflow-hidden border-2 border-bg-hover bg-bg-muted flex items-center justify-center shrink-0 shadow-sm">
            {item.avatarUrl ? (
              <img
                src={toProxiedImageUrl(item.avatarUrl)}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.3';
                }}
              />
            ) : (
              <span className="text-2xl opacity-50">👤</span>
            )}
          </div>

          {/* Name & Category Badge & Duplicate Warning */}
          <div className="flex flex-col justify-center gap-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-base sm:text-lg font-bold text-fg truncate" title={item.name}>
                {item.name}
              </h4>
              <span
                className={`rounded-badge px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  item.categoryKey === 'trans'
                    ? 'bg-category-trans/20 text-category-trans border border-category-trans/30'
                    : item.categoryKey === 'sluts'
                    ? 'bg-category-sluts/20 text-category-sluts border border-category-sluts/30'
                    : 'bg-category-twinks/20 text-category-twinks border border-category-twinks/30'
                }`}
              >
                {item.categoryKey}
              </span>
            </div>
            {duplicate ? (
              <span className="text-[11px] text-amber-400">⚠️ Exists in {duplicate.categoryKey}</span>
            ) : null}
          </div>
        </div>

        {/* Label Selector (compact tag-picker, no scrollbar) & Status */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-dim hidden sm:inline">
              Labels:
            </span>
            <LabelMultiSelect
              compact
              selectedIds={item.labelIds}
              onChange={(ids) => onUpdate({ labelIds: ids })}
            />
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5">
            {item.status === 'imported' && (
              <span className="rounded-badge bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                ✓ Saved
              </span>
            )}
            {item.status === 'failed' && (
              <span className="rounded-badge bg-rose-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                ✗ Failed
              </span>
            )}
            {item.status === 'pending' && item.selectedImages.length === 0 && (
              <span className="rounded-badge bg-amber-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-md">
                ⚠ No images
              </span>
            )}
          </div>
        </div>
      </div>

      {item.error && <span className="text-xs text-rose-400 px-1">{item.error}</span>}

      {/* Horizontal album strip — browse and pick from every photo found for this character */}
      <BottomImageTray
        availableImages={item.availableImages}
        selectedImages={item.selectedImages}
        onToggleImage={toggleSelectedImage}
        onSetPrimary={setPrimaryImage}
        onAddImage={addAvailableImage}
        onRemoveCandidate={removeCandidateImage}
        showAddUrl={false}
        galleries={item.galleries}
      />
    </div>
  );
}
