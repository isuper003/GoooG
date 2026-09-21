import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../app';
import { queryAll, queryOne, queryAllChunked } from '../db';

export const crawlerRouter = new Hono<AppEnv>();

const crawlerFetchSchema = z.object({
  url: z.string().url('A valid URL is required'),
  categoryKey: z.enum(['trans', 'sluts', 'twinks']).default('sluts'),
});

const crawlerFetchByNameSchema = z.object({
  names: z.array(z.string().trim().min(1)).min(1).max(40),
  categoryKey: z.enum(['trans', 'sluts', 'twinks']).default('sluts'),
});

export interface ExtractedItem {
  name: string;
  avatarUrl: string; // Profile image
  categoryKey: 'trans' | 'sluts' | 'twinks';
  availableImages: string[]; // Gallery images, excluding profile avatar
}

interface ProfileLink {
  name: string;
  profileUrl: string;
}

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// A listing page only links to each character's own profile page and shows one
// preview thumbnail — the real photo album lives on that profile page. Cap how
// many profile pages we follow per crawl to stay well under the Workers
// subrequest limit and keep one crawl action fast.
const MAX_PROFILES_PER_CRAWL = 40;
const PROFILE_FETCH_CONCURRENCY = 6;
const MAX_GALLERY_IMAGES = 30;

// Every performer's profile lives at this same path regardless of category —
// /pornstars/{slug}/ — so a name lookup can go straight there without first
// crawling a listing page.
const PROFILE_BASE_URL = 'https://www.pornpics.com/pornstars/';

// Converts a display name into this site's URL slug convention, e.g.
// "Angela White" -> "angela-white".
export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Some gallery CDNs (e.g. pornpics.com's cdni.pornpics.com) serve a small
// thumbnail by default at a "/460/" size segment in the path, with a much
// larger "/1280/" version available at the same path otherwise. Swap it in
// so crawled characters get full-resolution images instead of thumbnails.
export function upgradeImageResolution(url: string): string {
  return url.replace(/\/460\//, '/1280/');
}

// Site logos and third-party badges (e.g. a "Login with Google" icon) are
// almost always vector graphics or explicitly sized as tiny icons in markup,
// while real gallery photos are raster images with no such small fixed size.
// This tells them apart from genuine character photos before they leak in as
// bogus "characters" named after the site or the login button.
function isLikelyLogoOrIcon(fullImgTag: string, resolvedUrl: string): boolean {
  if (/\.svg(?:[?#]|$)/i.test(resolvedUrl)) return true;

  const widthMatch = fullImgTag.match(/\bwidth=["']?(\d+)/i);
  const heightMatch = fullImgTag.match(/\bheight=["']?(\d+)/i);
  if (widthMatch && heightMatch) {
    const w = parseInt(widthMatch[1], 10);
    const h = parseInt(heightMatch[1], 10);
    if (w > 0 && h > 0 && w <= 100 && h <= 100) return true;
  }

  return false;
}

// Helper to make a possibly-relative URL absolute (and upgrade its resolution)
function toAbsoluteUrl(urlStr: string, baseUrl: string): string | null {
  try {
    const trimmed = urlStr.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
      return null;
    }
    return upgradeImageResolution(new URL(trimmed, baseUrl).href);
  } catch {
    return null;
  }
}

// Clean character name from HTML text or alt
function cleanName(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/\s*\(\d+\)\s*$/g, '') // strip trailing count like (24)
    .replace(/\s*-\s*\d+\s*(pics|photos|images)?$/i, '') // strip photo counts
    .replace(/[\n\r\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function getAttr(tag: string, attr: string): string | null {
  const m = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, 'i'));
  return m ? m[1] : null;
}

// Picks the real photo URL out of an <img> tag, skipping lazy-load
// placeholders (a 1x1 pixel or "blank" gif in `src` while the actual image
// sits in a data-* attribute).
function bestImageSrc(imgTag: string): string | null {
  const candidates = [
    getAttr(imgTag, 'data-original'),
    getAttr(imgTag, 'data-src'),
    getAttr(imgTag, 'data-lazy'),
    getAttr(imgTag, 'data-thumb'),
    getAttr(imgTag, 'src'),
  ];
  for (const candidate of candidates) {
    if (candidate && !candidate.includes('1px') && !candidate.includes('blank')) {
      return candidate;
    }
  }
  return null;
}

// Stage 1: a listing/category page links to each character's own profile page
// via an <a href><img></a> card. We only need the name and that profile link
// here — the actual gallery is fetched separately from the profile page.
export function extractProfileLinks(html: string, baseUrl: string): ProfileLink[] {
  const cardRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  const seen = new Map<string, ProfileLink>();
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null) {
    const openTagAttrs = match[1];
    const innerHtml = match[2];
    if (!innerHtml) continue;

    const hrefRaw = getAttr(openTagAttrs, 'href');
    if (!hrefRaw) continue;

    const imgMatches = [...innerHtml.matchAll(/<img\s+[^>]+>/gi)];
    if (imgMatches.length === 0) continue;

    // Skip cards whose only image is a logo/icon (nav/login buttons etc.) —
    // no point spending a subrequest "visiting the profile" of a login button.
    const hasRealImage = imgMatches.some((imgMatch) => {
      const src = bestImageSrc(imgMatch[0]);
      if (!src) return false;
      const abs = toAbsoluteUrl(src, baseUrl);
      return !!abs && (abs.startsWith('http://') || abs.startsWith('https://')) && !isLikelyLogoOrIcon(imgMatch[0], abs);
    });
    if (!hasRealImage) continue;

    let foundName = getAttr(openTagAttrs, 'title') || '';

    if (!foundName) {
      for (const imgMatch of imgMatches) {
        const altMatch = imgMatch[0].match(/alt=["']([^"']+)["']/i);
        if (altMatch && altMatch[1]?.trim()) {
          foundName = altMatch[1].trim();
          break;
        }
      }
    }

    if (!foundName) {
      const textOnly = innerHtml.replace(/<[^>]+>/g, ' ').trim();
      if (textOnly && textOnly.length >= 2 && textOnly.length <= 60) {
        foundName = textOnly;
      }
    }

    foundName = cleanName(foundName);
    if (!foundName || foundName.length < 2) continue;

    const profileUrl = toAbsoluteUrl(hrefRaw, baseUrl);
    if (!profileUrl || !(profileUrl.startsWith('http://') || profileUrl.startsWith('https://'))) continue;

    if (!seen.has(profileUrl)) {
      seen.set(profileUrl, { name: foundName, profileUrl });
    }
  }

  return Array.from(seen.values());
}

// Stage 2: pull the real portrait and the full photo album off one
// character's own profile page.
export function extractProfileGallery(
  html: string,
  baseUrl: string
): { avatarUrl: string; images: string[] } {
  let avatarUrl = '';

  // Prefer a schema.org Person/ProfilePage JSON-LD block's "image" field — a
  // generic, site-independent signal for a profile page's main portrait,
  // rather than hard-coding one site's CSS class names.
  const ldJsonBlocks = [
    ...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  for (const block of ldJsonBlocks) {
    try {
      const parsed: unknown = JSON.parse(block[1]);
      if (!parsed || typeof parsed !== 'object') continue;
      const record = parsed as Record<string, unknown>;
      const mainEntity =
        record.mainEntity && typeof record.mainEntity === 'object'
          ? (record.mainEntity as Record<string, unknown>)
          : null;
      const candidate =
        (typeof record.image === 'string' && record.image) ||
        (mainEntity && typeof mainEntity.image === 'string' && mainEntity.image) ||
        '';
      if (candidate) {
        const abs = toAbsoluteUrl(candidate, baseUrl);
        if (abs) {
          avatarUrl = abs;
          break;
        }
      }
    } catch {
      // Malformed JSON-LD block — try the next one, if any.
    }
  }

  // Every <a href><img></a> card on the profile page is a gallery thumbnail.
  const images: string[] = [];
  const seen = new Set<string>();
  const cardRegex = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null && images.length < MAX_GALLERY_IMAGES) {
    const imgMatches = [...match[1].matchAll(/<img\s+[^>]+>/gi)];
    for (const imgMatch of imgMatches) {
      const src = bestImageSrc(imgMatch[0]);
      if (!src) continue;
      const abs = toAbsoluteUrl(src, baseUrl);
      if (!abs || !(abs.startsWith('http://') || abs.startsWith('https://'))) continue;
      if (isLikelyLogoOrIcon(imgMatch[0], abs)) continue;
      if (abs === avatarUrl || seen.has(abs)) continue;
      seen.add(abs);
      images.push(abs);
      if (images.length >= MAX_GALLERY_IMAGES) break;
    }
  }

  return { avatarUrl, images };
}

// Fetches one character's own profile page and extracts their avatar +
// gallery. Never throws — a missing/unreachable profile just comes back with
// no images, which the review UI already surfaces as "needs images added".
async function fetchProfile(
  name: string,
  profileUrl: string,
  categoryKey: 'trans' | 'sluts' | 'twinks'
): Promise<ExtractedItem> {
  try {
    const profileRes = await fetch(profileUrl, { headers: FETCH_HEADERS });
    if (!profileRes.ok) {
      return { name, avatarUrl: '', categoryKey, availableImages: [] };
    }
    const profileHtml = await profileRes.text();
    const { avatarUrl, images } = extractProfileGallery(profileHtml, profileUrl);
    return { name, avatarUrl, categoryKey, availableImages: images };
  } catch {
    return { name, avatarUrl: '', categoryKey, availableImages: [] };
  }
}

async function fetchProfilesInBatches(
  links: ProfileLink[],
  categoryKey: 'trans' | 'sluts' | 'twinks'
): Promise<ExtractedItem[]> {
  const items: ExtractedItem[] = [];
  for (let i = 0; i < links.length; i += PROFILE_FETCH_CONCURRENCY) {
    const chunk = links.slice(i, i + PROFILE_FETCH_CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map((link) => fetchProfile(link.name, link.profileUrl, categoryKey))
    );
    items.push(...chunkResults);
  }
  return items;
}

export interface ExistingCharacterData {
  id: number;
  name: string;
  avatarUrl: string;
  images: string[];
}

export async function getExistingCharactersForCategory(
  db: D1Database | undefined,
  categoryKey: string
): Promise<Map<string, ExistingCharacterData>> {
  const map = new Map<string, ExistingCharacterData>();
  if (!db) return map;

  try {
    const categoryRow = await queryOne<{ id: number }>(
      db,
      'SELECT id FROM categories WHERE key = ?',
      categoryKey
    );
    if (!categoryRow) return map;

    const existingRows = await queryAll<{ id: number; name: string }>(
      db,
      'SELECT id, name FROM characters WHERE category_id = ?',
      categoryRow.id
    );
    if (existingRows.length === 0) return map;

    const charIds = existingRows.map((r) => r.id);
    const imageRows = await queryAllChunked<{
      character_id: number;
      url: string;
      position: number;
    }>(
      db,
      (placeholders) =>
        `SELECT character_id, url, position FROM character_images WHERE character_id IN (${placeholders}) ORDER BY position ASC, id ASC`,
      charIds
    );

    const imagesByCharId = new Map<number, string[]>();
    for (const img of imageRows) {
      const list = imagesByCharId.get(img.character_id) || [];
      list.push(img.url);
      imagesByCharId.set(img.character_id, list);
    }

    for (const char of existingRows) {
      const imgs = imagesByCharId.get(char.id) || [];
      map.set(char.name.trim().toLowerCase(), {
        id: char.id,
        name: char.name,
        avatarUrl: imgs[0] || '',
        images: imgs,
      });
    }
  } catch (err) {
    console.error('Error fetching existing characters in crawler:', err);
  }

  return map;
}

// POST /api/crawler/fetch
crawlerRouter.post('/fetch', zValidator('json', crawlerFetchSchema), async (c) => {
  const { url, categoryKey } = c.req.valid('json');

  let listingHtml: string;
  try {
    const response = await fetch(url, { headers: FETCH_HEADERS });
    if (!response.ok) {
      return c.json(
        { error: `Failed to fetch target URL (Status: ${response.status} ${response.statusText})` },
        502
      );
    }
    listingHtml = await response.text();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    return c.json({ error: `Could not crawl URL: ${message}` }, 500);
  }

  const profileLinks = extractProfileLinks(listingHtml, url).slice(0, MAX_PROFILES_PER_CRAWL);
  const existingMap = await getExistingCharactersForCategory(c.env?.DB, categoryKey);

  // Separate links that already exist from new links that need fetching from website
  const linksToFetch: ProfileLink[] = [];
  for (const link of profileLinks) {
    if (!existingMap.has(link.name.trim().toLowerCase())) {
      linksToFetch.push(link);
    }
  }

  // Fetch only non-duplicate profiles from the external website
  const fetchedItems = await fetchProfilesInBatches(linksToFetch, categoryKey);
  const fetchedMap = new Map<string, ExtractedItem>();
  for (const item of fetchedItems) {
    fetchedMap.set(item.name.trim().toLowerCase(), item);
  }

  // Assemble items in original listing order:
  // Duplicates use existing images from program; new characters use crawled images
  const items: ExtractedItem[] = profileLinks.map((link) => {
    const key = link.name.trim().toLowerCase();
    const existing = existingMap.get(key);
    if (existing) {
      return {
        name: link.name,
        avatarUrl: existing.avatarUrl,
        categoryKey,
        availableImages: existing.images,
      };
    }
    return (
      fetchedMap.get(key) || {
        name: link.name,
        avatarUrl: '',
        categoryKey,
        availableImages: [],
      }
    );
  });

  return c.json({
    url,
    categoryKey,
    totalFound: items.length,
    items,
  });
});

// POST /api/crawler/fetch-by-name
crawlerRouter.post('/fetch-by-name', zValidator('json', crawlerFetchByNameSchema), async (c) => {
  const { names, categoryKey } = c.req.valid('json');

  const existingMap = await getExistingCharactersForCategory(c.env?.DB, categoryKey);

  const linksToFetch: ProfileLink[] = [];
  for (const name of names) {
    if (!existingMap.has(name.trim().toLowerCase())) {
      linksToFetch.push({
        name,
        profileUrl: `${PROFILE_BASE_URL}${slugifyName(name)}/`,
      });
    }
  }

  const fetchedItems = await fetchProfilesInBatches(linksToFetch, categoryKey);
  const fetchedMap = new Map<string, ExtractedItem>();
  for (const item of fetchedItems) {
    fetchedMap.set(item.name.trim().toLowerCase(), item);
  }

  const items: ExtractedItem[] = names.map((name) => {
    const key = name.trim().toLowerCase();
    const existing = existingMap.get(key);
    if (existing) {
      return {
        name,
        avatarUrl: existing.avatarUrl,
        categoryKey,
        availableImages: existing.images,
      };
    }
    return (
      fetchedMap.get(key) || {
        name,
        avatarUrl: '',
        categoryKey,
        availableImages: [],
      }
    );
  });

  return c.json({
    categoryKey,
    totalFound: items.length,
    items,
  });
});
