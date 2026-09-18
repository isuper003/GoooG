import { useState } from 'react';
import type { QueueItem } from './RowByRowReviewer';

interface BatchInputSectionProps {
  onLoadQueue: (items: QueueItem[]) => void;
}

export default function BatchInputSection({ onLoadQueue }: BatchInputSectionProps) {
  const [inputText, setInputText] = useState('');
  const [defaultCategory, setDefaultCategory] = useState<'trans' | 'sluts' | 'twinks'>('sluts');
  const [error, setError] = useState<string | null>(null);

  function parseInput() {
    const raw = inputText.trim();
    if (!raw) {
      setError('Please paste text, links, or JSON to load characters.');
      return;
    }

    const items: QueueItem[] = [];

    // Try parsing as JSON first
    if (raw.startsWith('[') || raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        const array = Array.isArray(parsed) ? parsed : [parsed];

        array.forEach((obj, idx) => {
          if (!obj || typeof obj !== 'object') return;
          const name = String(obj.name || obj.title || `Character ${idx + 1}`).trim();
          let categoryKey: 'trans' | 'sluts' | 'twinks' = defaultCategory;
          const rawCat = String(obj.category || obj.categoryKey || '').toLowerCase();
          if (rawCat === 'trans') categoryKey = 'trans';
          else if (rawCat === 'sluts' || rawCat === 'sl') categoryKey = 'sluts';
          else if (rawCat === 'twinks') categoryKey = 'twinks';

          const imagesList: string[] = [];
          if (Array.isArray(obj.images)) {
            obj.images.forEach((img: unknown) => {
              if (typeof img === 'string' && img.trim()) imagesList.push(img.trim());
              else if (img && typeof img === 'object' && 'url' in img) imagesList.push(String((img as { url: string }).url).trim());
            });
          } else if (typeof obj.image === 'string' && obj.image.trim()) {
            imagesList.push(obj.image.trim());
          } else if (typeof obj.url === 'string' && obj.url.trim()) {
            imagesList.push(obj.url.trim());
          }

          let avatarUrl = '';
          if (typeof obj.avatar === 'string' && obj.avatar.trim()) {
            avatarUrl = obj.avatar.trim();
          } else if (typeof obj.avatarUrl === 'string' && obj.avatarUrl.trim()) {
            avatarUrl = obj.avatarUrl.trim();
          } else if (imagesList.length > 0) {
            avatarUrl = imagesList[0];
          }

          // Exclude avatarUrl from candidate gallery images if multiple images exist
          const candidateImages = imagesList.filter((u) => u !== avatarUrl);

          items.push({
            id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            name,
            avatarUrl,
            categoryKey,
            labelIds: [],
            availableImages: candidateImages.length > 0 ? candidateImages : (avatarUrl ? [avatarUrl] : []),
            selectedImages: candidateImages.slice(0, 6),
            status: 'pending',
          });
        });

        if (items.length > 0) {
          setError(null);
          onLoadQueue(items);
          return;
        }
      } catch {
        // Not valid JSON, proceed to line-by-line parser
      }
    }

    // Line-by-line parser
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    lines.forEach((line, idx) => {
      // Check if pipe-delimited: Name | Category | url1, url2 OR Name | url1, url2
      if (line.includes('|')) {
        const parts = line.split('|').map((p) => p.trim());
        let name = `Character ${idx + 1}`;
        let categoryKey: 'trans' | 'sluts' | 'twinks' = defaultCategory;
        let urlsPart = '';

        if (parts.length >= 3) {
          name = parts[0] || name;
          const rawCat = parts[1].toLowerCase();
          if (rawCat === 'trans') categoryKey = 'trans';
          else if (rawCat === 'sluts' || rawCat === 'sl') categoryKey = 'sluts';
          else if (rawCat === 'twinks') categoryKey = 'twinks';
          urlsPart = parts.slice(2).join('|');
        } else {
          name = parts[0] || name;
          urlsPart = parts[1] || '';
        }

        const urls = urlsPart
          .split(/[\s,]+/)
          .map((u) => u.trim())
          .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

        const avatarUrl = urls[0] || '';
        const galleryCandidateImages = urls.filter((u) => u !== avatarUrl);

        items.push({
          id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          name,
          avatarUrl,
          categoryKey,
          labelIds: [],
          availableImages: galleryCandidateImages.length > 0 ? galleryCandidateImages : (avatarUrl ? [avatarUrl] : []),
          selectedImages: galleryCandidateImages.slice(0, 6),
          status: 'pending',
        });
      } else if (line.startsWith('http://') || line.startsWith('https://')) {
        // Pure image link: infer name from filename or URL
        try {
          const u = new URL(line);
          const pathname = u.pathname;
          const fileName = pathname.substring(pathname.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, '');
          const cleanName = fileName.replace(/[-_]+/g, ' ').trim() || `Character ${idx + 1}`;

          items.push({
            id: `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            name: cleanName,
            avatarUrl: line,
            categoryKey: defaultCategory,
            labelIds: [],
            availableImages: [line],
            selectedImages: [line],
            status: 'pending',
          });
        } catch {
          // Invalid URL
        }
      }
    });

    if (items.length === 0) {
      setError('Could not extract characters from input. Check format or examples below.');
      return;
    }

    setError(null);
    onLoadQueue(items);
  }

  function loadSample(type: 'json' | 'pipe' | 'urls') {
    if (type === 'json') {
      setInputText(
        JSON.stringify(
          [
            {
              name: 'Sample Model A',
              category: 'sluts',
              images: [
                'https://picsum.photos/id/1025/600/600',
                'https://picsum.photos/id/1026/600/600',
              ],
            },
            {
              name: 'Sample Model B',
              category: 'trans',
              images: [
                'https://picsum.photos/id/1027/600/600',
              ],
            },
            {
              name: 'Sample Model C',
              category: 'twinks',
              images: [
                'https://picsum.photos/id/1028/600/600',
              ],
            },
          ],
          null,
          2
        )
      );
    } else if (type === 'pipe') {
      setInputText(
        `Alex Rivera | sluts | https://picsum.photos/id/1031/600/600, https://picsum.photos/id/1032/600/600\n` +
        `Jordan Lee | trans | https://picsum.photos/id/1033/600/600\n` +
        `Taylor Cruz | twinks | https://picsum.photos/id/1035/600/600`
      );
    } else {
      setInputText(
        `https://picsum.photos/id/1040/600/600\n` +
        `https://picsum.photos/id/1041/600/600\n` +
        `https://picsum.photos/id/1042/600/600`
      );
    }
  }

  return (
    <div className="rounded-card border border-bg-hover bg-bg-card p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-fg">Batch Importer & Queue Reviewer</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Paste multiple characters, image URLs, or JSON to review them row-by-row with candidate image trays.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-fg-dim">Default Category:</span>
          <select
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value as 'trans' | 'sluts' | 'twinks')}
            className="rounded-button border border-bg-hover bg-bg-muted px-2.5 py-1 text-xs font-semibold text-fg"
          >
            <option value="trans">Trans</option>
            <option value="sluts">Sluts</option>
            <option value="twinks">Twinks</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          rows={7}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Paste your data here...\n\nFormats supported:\n1. Name | Category | ImageURL1, ImageURL2\n2. JSON: [{"name": "...", "category": "sluts", "images": ["url1", "url2"]}]\n3. List of Direct Image URLs`}
          className="w-full rounded-button border border-bg-hover bg-bg-muted p-3 font-mono text-xs text-fg placeholder:text-fg-dim focus:border-category-trans focus:outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-fg-dim">Load sample:</span>
            <button
              type="button"
              onClick={() => loadSample('pipe')}
              className="text-category-trans hover:underline"
            >
              Text (Name | Category | URLs)
            </button>
            <span className="text-fg-dim">&bull;</span>
            <button
              type="button"
              onClick={() => loadSample('json')}
              className="text-category-trans hover:underline"
            >
              JSON Array
            </button>
            <span className="text-fg-dim">&bull;</span>
            <button
              type="button"
              onClick={() => loadSample('urls')}
              className="text-category-trans hover:underline"
            >
              URL List
            </button>
          </div>

          <button
            type="button"
            onClick={parseInput}
            className="rounded-button bg-category-trans hover:opacity-90 px-4 py-2 text-xs font-bold text-white shadow-sm transition-opacity"
          >
            Load into Review Queue &rarr;
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-button bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
