import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../app';

export const crawlerRouter = new Hono<AppEnv>();

const crawlerFetchSchema = z.object({
  url: z.string().url('A valid URL is required'),
  categoryKey: z.enum(['trans', 'sluts', 'twinks']).default('sluts'),
});

export interface ExtractedItem {
  name: string;
  avatarUrl: string; // Profile image
  categoryKey: 'trans' | 'sluts' | 'twinks';
  availableImages: string[]; // Gallery images, excluding profile avatar
}

// Helper to make relative URL absolute
function toAbsoluteUrl(urlStr: string, baseUrl: string): string | null {
  try {
    const trimmed = urlStr.trim();
    if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('javascript:')) {
      return null;
    }
    return new URL(trimmed, baseUrl).href;
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

// Parse HTML string into character items with profile avatar and gallery candidate images
function parseHtmlContent(
  html: string,
  baseUrl: string,
  categoryKey: 'trans' | 'sluts' | 'twinks'
): ExtractedItem[] {
  const itemsMap = new Map<string, { avatarUrl: string; galleryImages: Set<string> }>();

  // Pattern 1: Match <a> or <div> card blocks containing an image and text/alt/title
  // Look for cards/links: <a href="..." ...> ... <img ...> ... (name/title) </a>
  const cardRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null) {
    const innerHtml = match[2];
    if (!innerHtml) continue;

    // Check if innerHtml has an <img> tag
    const imgMatches = [
      ...innerHtml.matchAll(
        /<img\s+[^>]*(?:src|data-src|data-original|data-lazy|data-thumb)=["']([^"']+)["'][^>]*>/gi
      ),
    ];

    if (imgMatches.length === 0) continue;

    // Try to extract name from alt, title, or text inside the anchor
    let foundName = '';

    // 1. From img alt or title
    for (const imgMatch of imgMatches) {
      const fullImgTag = imgMatch[0];
      const altMatch = fullImgTag.match(/alt=["']([^"']+)["']/i);
      const titleMatch = fullImgTag.match(/title=["']([^"']+)["']/i);
      if (altMatch && altMatch[1]?.trim()) {
        foundName = altMatch[1].trim();
        break;
      }
      if (titleMatch && titleMatch[1]?.trim()) {
        foundName = titleMatch[1].trim();
        break;
      }
    }

    // 2. From text nodes inside the anchor (e.g. <span>Name</span>)
    if (!foundName) {
      const textOnly = innerHtml.replace(/<[^>]+>/g, ' ').trim();
      if (textOnly && textOnly.length >= 2 && textOnly.length <= 60) {
        foundName = textOnly;
      }
    }

    // Clean the extracted name
    foundName = cleanName(foundName);
    if (!foundName || foundName.length < 2) continue;

    // Collect all valid image URLs from this card
    const urls: string[] = [];
    for (const imgMatch of imgMatches) {
      const fullTag = imgMatch[0];
      const srcAttr =
        fullTag.match(/(?:data-original|data-src|data-lazy|data-thumb|src)=["']([^"']+)["']/i);
      if (srcAttr && srcAttr[1]) {
        const absUrl = toAbsoluteUrl(srcAttr[1], baseUrl);
        if (absUrl && (absUrl.startsWith('http://') || absUrl.startsWith('https://'))) {
          urls.push(absUrl);
        }
      }
    }

    if (urls.length > 0) {
      const current = itemsMap.get(foundName) || {
        avatarUrl: urls[0],
        galleryImages: new Set<string>(),
      };
      if (!current.avatarUrl && urls[0]) {
        current.avatarUrl = urls[0];
      }
      // Add other images to galleryImages set
      urls.forEach((u) => {
        if (u !== current.avatarUrl) {
          current.galleryImages.add(u);
        }
      });
      itemsMap.set(foundName, current);
    }
  }

  // Pattern 2: Fallback if Pattern 1 found fewer than 2 items - scan all <img> tags with alt text
  if (itemsMap.size < 2) {
    const standaloneImgRegex =
      /<img\s+[^>]*(?:alt|title)=["']([^"']+)["'][^>]*(?:data-original|data-src|data-lazy|data-thumb|src)=["']([^"']+)["'][^>]*>/gi;
    let imgMatch: RegExpExecArray | null;

    while ((imgMatch = standaloneImgRegex.exec(html)) !== null) {
      const rawName = cleanName(imgMatch[1] || '');
      const rawUrl = imgMatch[2];
      if (!rawName || rawName.length < 2 || !rawUrl) continue;

      const absUrl = toAbsoluteUrl(rawUrl, baseUrl);
      if (absUrl) {
        const current = itemsMap.get(rawName) || {
          avatarUrl: absUrl,
          galleryImages: new Set<string>(),
        };
        if (!current.avatarUrl) {
          current.avatarUrl = absUrl;
        } else if (absUrl !== current.avatarUrl) {
          current.galleryImages.add(absUrl);
        }
        itemsMap.set(rawName, current);
      }
    }
  }

  const result: ExtractedItem[] = [];
  for (const [name, entry] of itemsMap.entries()) {
    // Exclude profile avatar from availableImages list
    const galleryList = Array.from(entry.galleryImages).filter((u) => u !== entry.avatarUrl);

    result.push({
      name,
      avatarUrl: entry.avatarUrl,
      categoryKey,
      availableImages: galleryList,
    });
  }

  return result;
}

// POST /api/crawler/fetch
crawlerRouter.post('/fetch', zValidator('json', crawlerFetchSchema), async (c) => {
  const { url, categoryKey } = c.req.valid('json');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return c.json(
        {
          error: `Failed to fetch target URL (Status: ${response.status} ${response.statusText})`,
        },
        502
      );
    }

    const html = await response.text();
    const items = parseHtmlContent(html, url, categoryKey);

    return c.json({
      url,
      categoryKey,
      totalFound: items.length,
      items,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    return c.json({ error: `Could not crawl URL: ${message}` }, 500);
  }
});
