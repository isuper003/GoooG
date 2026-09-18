import type { QueueItem } from '../components/import/RowByRowReviewer';

export type ImportCategory = 'trans' | 'sluts' | 'twinks';

function normalizeCategory(raw: string, fallback: ImportCategory): ImportCategory {
  const lower = raw.toLowerCase();
  if (lower === 'trans') return 'trans';
  if (lower === 'sluts' || lower === 'sl') return 'sluts';
  if (lower === 'twinks') return 'twinks';
  return fallback;
}

function makeId(idx: number): string {
  return `item-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`;
}

function parseJsonInput(raw: string, defaultCategory: ImportCategory): QueueItem[] | null {
  if (!(raw.startsWith('[') || raw.startsWith('{'))) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const array = Array.isArray(parsed) ? parsed : [parsed];
  const items: QueueItem[] = [];

  array.forEach((obj, idx) => {
    if (!obj || typeof obj !== 'object') return;
    const record = obj as Record<string, unknown>;
    const name = String(record.name || record.title || `Character ${idx + 1}`).trim();
    const rawCat = String(record.category || record.categoryKey || '').toLowerCase();
    const categoryKey = normalizeCategory(rawCat, defaultCategory);

    const imagesList: string[] = [];
    if (Array.isArray(record.images)) {
      record.images.forEach((img: unknown) => {
        if (typeof img === 'string' && img.trim()) imagesList.push(img.trim());
        else if (img && typeof img === 'object' && 'url' in img) {
          imagesList.push(String((img as { url: string }).url).trim());
        }
      });
    } else if (typeof record.image === 'string' && record.image.trim()) {
      imagesList.push(record.image.trim());
    } else if (typeof record.url === 'string' && record.url.trim()) {
      imagesList.push(record.url.trim());
    }

    let avatarUrl = '';
    if (typeof record.avatar === 'string' && record.avatar.trim()) {
      avatarUrl = record.avatar.trim();
    } else if (typeof record.avatarUrl === 'string' && record.avatarUrl.trim()) {
      avatarUrl = record.avatarUrl.trim();
    } else if (imagesList.length > 0) {
      avatarUrl = imagesList[0];
    }

    // Exclude avatarUrl from candidate gallery images if multiple images exist
    const candidateImages = imagesList.filter((u) => u !== avatarUrl);

    items.push({
      id: makeId(idx),
      name,
      avatarUrl,
      categoryKey,
      labelIds: [],
      availableImages: candidateImages.length > 0 ? candidateImages : avatarUrl ? [avatarUrl] : [],
      selectedImages: candidateImages.slice(0, 6),
      status: 'pending',
    });
  });

  return items.length > 0 ? items : null;
}

function parseLineByLineInput(raw: string, defaultCategory: ImportCategory): QueueItem[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: QueueItem[] = [];

  lines.forEach((line, idx) => {
    // Pipe-delimited: "Name | Category | url1, url2" OR "Name | url1, url2"
    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim());
      let name = `Character ${idx + 1}`;
      let categoryKey: ImportCategory = defaultCategory;
      let urlsPart = '';

      if (parts.length >= 3) {
        name = parts[0] || name;
        categoryKey = normalizeCategory(parts[1], defaultCategory);
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
        id: makeId(idx),
        name,
        avatarUrl,
        categoryKey,
        labelIds: [],
        availableImages:
          galleryCandidateImages.length > 0 ? galleryCandidateImages : avatarUrl ? [avatarUrl] : [],
        selectedImages: galleryCandidateImages.slice(0, 6),
        status: 'pending',
      });
      return;
    }

    // Pure image link: infer name from filename or URL
    if (line.startsWith('http://') || line.startsWith('https://')) {
      try {
        const u = new URL(line);
        const pathname = u.pathname;
        const fileName = pathname.substring(pathname.lastIndexOf('/') + 1).replace(/\.[^/.]+$/, '');
        const cleanName = fileName.replace(/[-_]+/g, ' ').trim() || `Character ${idx + 1}`;

        items.push({
          id: makeId(idx),
          name: cleanName,
          avatarUrl: line,
          categoryKey: defaultCategory,
          labelIds: [],
          availableImages: [line],
          selectedImages: [line],
          status: 'pending',
        });
      } catch {
        // Invalid URL, skip this line
      }
    }
  });

  return items;
}

// Parses pasted text into review-queue items, trying JSON first, then a
// line-by-line format (pipe-delimited rows or bare image URLs).
// Returns an empty array when nothing could be extracted.
export function parseBatchInput(rawText: string, defaultCategory: ImportCategory): QueueItem[] {
  const raw = rawText.trim();
  if (!raw) return [];

  const jsonItems = parseJsonInput(raw, defaultCategory);
  if (jsonItems) return jsonItems;

  return parseLineByLineInput(raw, defaultCategory);
}
