export interface ScrapedWatchVideo {
  id: string;
  siteId: string;
  siteName: string;
  siteDomain: string;
  badgeColor: string;
  title: string;
  url: string;
  thumbUrl: string;
  duration?: string;
}

export interface SiteScrapeStatus {
  siteId: string;
  siteName: string;
  siteDomain: string;
  badgeColor: string;
  count: number;
  status: 'success' | 'empty' | 'error' | 'timeout';
  error?: string;
  directSearchUrl: string;
}

export interface WatchScrapeResponse {
  query: string;
  videos: ScrapedWatchVideo[];
  siteStatuses: SiteScrapeStatus[];
  totalFound: number;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const FETCH_HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function cleanHtmlText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUrl(url: string, base: string): string {
  try {
    const trimmed = url.trim();
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return new URL(trimmed, base).href;
  } catch {
    return url;
  }
}

// 1. Porneec Parser
export function parsePorneec(html: string): ScrapedWatchVideo[] {
  const results: ScrapedWatchVideo[] = [];
  const articleRegex = /<article\b[^>]*class=["'][^"']*video-preview-item[^"']*["'][\s\S]*?<\/article>/gi;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(html)) !== null && results.length < 3) {
    const block = match[0];

    const linkMatch = block.match(/<a\b[^>]*href=["']([^"']+)["']/i);
    if (!linkMatch) continue;
    const url = normalizeUrl(linkMatch[1], 'https://porneec.com');

    const titleMatch =
      block.match(/title=["']([^"']+)["']/i) ||
      block.match(/<span\s+class=["']title["']>([^<]+)<\/span>/i);
    const title = cleanHtmlText(titleMatch ? titleMatch[1] : 'Video');

    const thumbMatch =
      block.match(/data-main-thumb=["']([^"']+)["']/i) ||
      block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
    const thumbUrl = thumbMatch ? normalizeUrl(thumbMatch[1], 'https://porneec.com') : '';

    const durationMatch = block.match(/<span\s+class=["']duration["']>([^<]+)<\/span>/i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    results.push({
      id: `porneec-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
      siteId: 'porneec',
      siteName: 'Porneec',
      siteDomain: 'porneec.com',
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      title,
      url,
      thumbUrl,
      duration,
    });
  }

  return results;
}

// 2. YourDailyPornVideos Parser
export function parseYourDailyPornVideos(html: string): ScrapedWatchVideo[] {
  const results: ScrapedWatchVideo[] = [];
  const blocks = html.split(/(?=<div\b[^>]*class=["'][^"']*td_module_wrap)/i);

  for (const block of blocks) {
    if (results.length >= 3) break;
    if (!block.includes('td_module_wrap')) continue;

    const linkMatch =
      block.match(/<h3\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*<a\b[^>]*href=["']([^"']+)["']/i) ||
      block.match(/<a\b[^>]*href=["'](https:\/\/yourdailypornvideos\.ws\/[^"']+)["']/i);
    if (!linkMatch) continue;
    const url = normalizeUrl(linkMatch[1], 'https://yourdailypornvideos.ws');
    if (url === 'https://yourdailypornvideos.ws/' || url.includes('/page/')) continue;

    const titleMatch =
      block.match(/<h3\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*<a[^>]*title=["']([^"']+)["']/i) ||
      block.match(/<h3\b[^>]*class=["'][^"']*entry-title[^"']*["'][^>]*>\s*<a[^>]*>([^<]+)<\/a>/i) ||
      block.match(/title=["']([^"']+)["']/i);
    const title = cleanHtmlText(titleMatch ? titleMatch[1] : 'Video');

    const thumbMatch =
      block.match(/<img\b[^>]*?(?:data-img-url|data-src|src)=["']([^"']+)["']/i);
    const thumbUrl = thumbMatch ? normalizeUrl(thumbMatch[1], 'https://yourdailypornvideos.ws') : '';

    const durationMatch = block.match(/(?:duration|time)[^>]*>([^<]+)<\//i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    results.push({
      id: `yourdailypornvideos-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
      siteId: 'yourdailypornvideos',
      siteName: 'YourDailyPornVideos',
      siteDomain: 'yourdailypornvideos.ws',
      badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
      title,
      url,
      thumbUrl,
      duration,
    });
  }

  return results;
}

// 3. FullPorner Parser
export function parseFullPorner(html: string): ScrapedWatchVideo[] {
  const results: ScrapedWatchVideo[] = [];
  const blocks = html.split(/(?=<div\b[^>]*class=["'][^"']*video-card)/i);

  for (const block of blocks) {
    if (results.length >= 3) break;
    if (!block.includes('video-card')) continue;

    const linkMatch = block.match(/<a\b[^>]*href=["'](\/watch\/[^"']+|https?:\/\/[^"']*\/watch\/[^"']+)["']/i);
    if (!linkMatch) continue;
    const url = normalizeUrl(linkMatch[1], 'https://fullporner.com');

    const titleMatch =
      block.match(/<div\b[^>]*class=["'][^"']*video-title[^"']*["'][^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/i) ||
      block.match(/<a\b[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)<\/a>/i) ||
      block.match(/alt=["']([^"']+)["']/i);
    const title = cleanHtmlText(titleMatch ? titleMatch[1] : 'FullPorner Video');

    const thumbMatch =
      block.match(/data-src=["']([^"']+)["']/i) ||
      block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
    const thumbUrl = thumbMatch ? normalizeUrl(thumbMatch[1], 'https://fullporner.com') : '';

    const durationMatch = block.match(/(?:<span|<div)\b[^>]*class=["'][^"']*(?:time|duration)[^"']*["'][^>]*>([^<]+)<\//i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    results.push({
      id: `fullporner-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
      siteId: 'fullporner',
      siteName: 'FullPorner',
      siteDomain: 'fullporner.com',
      badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      title,
      url,
      thumbUrl,
      duration,
    });
  }

  return results;
}

// 4. TrendyPorn Parser
export function parseTrendyPorn(html: string): ScrapedWatchVideo[] {
  const results: ScrapedWatchVideo[] = [];
  const blockRegex = /<a\b[^>]*href=["'](https?:\/\/www\.trendyporn\.com\/video\/[^"']+|(?:\/video\/[^"']+))["'][\s\S]*?<\/a>/gi;
  const seenUrls = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null && results.length < 3) {
    const block = match[0];
    const url = normalizeUrl(match[1], 'https://www.trendyporn.com');
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const titleMatch =
      block.match(/title=["']([^"']+)["']/i) ||
      block.match(/alt=["']([^"']+)["']/i);
    const title = cleanHtmlText(titleMatch ? titleMatch[1] : 'TrendyPorn Video');

    const thumbMatch =
      block.match(/data-original=["']([^"']+)["']/i) ||
      block.match(/data-src=["']([^"']+)["']/i) ||
      block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
    const thumbUrl = thumbMatch ? normalizeUrl(thumbMatch[1], 'https://www.trendyporn.com') : '';

    const durationMatch = block.match(/<span\b[^>]*class=["'][^"']*duration[^"']*["']>([^<]+)<\/span>/i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    results.push({
      id: `trendyporn-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
      siteId: 'trendyporn',
      siteName: 'TrendyPorn',
      siteDomain: 'trendyporn.com',
      badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      title,
      url,
      thumbUrl,
      duration,
    });
  }

  return results;
}

// 5. Porn4Days Parser
export function parsePorn4Days(html: string): ScrapedWatchVideo[] {
  const results: ScrapedWatchVideo[] = [];
  const cardRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/a>/gi;
  const seenUrls = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null && results.length < 3) {
    const block = match[0];
    const rawHref = match[1];
    if (!rawHref || rawHref.includes('theporndude') || rawHref.includes('gotpd') || rawHref === '/') continue;

    const url = normalizeUrl(rawHref, 'https://porn4days.pw');
    if (seenUrls.has(url) || url === 'https://porn4days.pw' || url === 'https://porn4days.pw/') continue;
    seenUrls.add(url);

    const titleMatch =
      block.match(/title=["']([^"']+)["']/i) ||
      block.match(/alt=["']([^"']+)["']/i);
    const title = cleanHtmlText(titleMatch ? titleMatch[1] : 'Porn4Days Video');
    if (title.toLowerCase().includes('watch porn videos online') || title.length < 3) continue;

    const thumbMatch =
      block.match(/data-src=["']([^"']+)["']/i) ||
      block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
    const thumbUrl = thumbMatch ? normalizeUrl(thumbMatch[1], 'https://porn4days.pw') : '';

    const durationMatch = block.match(/(?:duration|time)[^>]*>([^<]+)<\//i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    results.push({
      id: `porn4days-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
      siteId: 'porn4days',
      siteName: 'Porn4Days',
      siteDomain: 'porn4days.pw',
      badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
      title,
      url,
      thumbUrl,
      duration,
    });
  }

  return results;
}

// 6. XMoviesForYou Parser
export function parseXMoviesForYou(html: string): ScrapedWatchVideo[] {
  const results: ScrapedWatchVideo[] = [];
  const cardRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*group flex flex-col[^"']*["'][\s\S]*?<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = cardRegex.exec(html)) !== null && results.length < 3) {
    const block = match[0];
    const rawHref = match[1];
    const url = normalizeUrl(rawHref, 'https://xmoviesforyou.com');

    const titleMatch =
      block.match(/<h3\b[^>]*title=["']([^"']+)["']/i) ||
      block.match(/<h3\b[^>]*>([^<]+)<\/h3>/i) ||
      block.match(/alt=["']([^"']+)["']/i);
    const title = cleanHtmlText(titleMatch ? titleMatch[1] : 'XMoviesForYou Movie');

    const thumbMatch = block.match(/<img\b[^>]*src=["']([^"']+)["']/i);
    const thumbUrl = thumbMatch ? normalizeUrl(thumbMatch[1], 'https://xmoviesforyou.com') : '';

    const durationMatch =
      block.match(/(?:bottom-2 right-2|duration|time)[^>]*>([^<]+)<\//i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    results.push({
      id: `xmoviesforyou-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
      siteId: 'xmoviesforyou',
      siteName: 'XMoviesForYou',
      siteDomain: 'xmoviesforyou.com',
      badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
      title,
      url,
      thumbUrl,
      duration,
    });
  }

  return results;
}

// 7. SxyPrn Parser
export function parseSxyPrn(html: string): ScrapedWatchVideo[] {
  const results: ScrapedWatchVideo[] = [];
  const blocks = html.split(/(?=<div\b[^>]*class=['"]post_el_small['"])/i);

  for (const block of blocks) {
    if (results.length >= 3) break;
    if (!block.includes('post_el_small')) continue;

    const linkMatch = block.match(/<a\b[^>]*href=['"](\/post\/[^'"]+\.html[^'"]*)['"]/i);
    if (!linkMatch) continue;
    const url = normalizeUrl(linkMatch[1], 'https://sxyprn.com');

    const titleMatch =
      block.match(/<div\b[^>]*class=['"]post_text['"][^>]*>([\s\S]*?)<\/div>/i) ||
      block.match(/<a\b[^>]*>([^<]+)<\/a>/i);
    const title = cleanHtmlText(titleMatch ? titleMatch[1] : 'SxyPrn Video');

    const thumbMatch =
      block.match(/data-src=['"]([^'"]+)['"]/i) ||
      block.match(/<img\b[^>]*src=['"]([^'"]+)['"]/i);
    const thumbUrl = thumbMatch ? normalizeUrl(thumbMatch[1], 'https://sxyprn.com') : '';

    const durationMatch = block.match(/(?:duration_small|duration)[^>]*>([^<]+)<\//i);
    const duration = durationMatch ? durationMatch[1].trim() : undefined;

    results.push({
      id: `sxyprn-${results.length}-${Math.random().toString(36).slice(2, 6)}`,
      siteId: 'sxyprn',
      siteName: 'SxyPrn',
      siteDomain: 'sxyprn.com',
      badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
      title,
      url,
      thumbUrl,
      duration,
    });
  }

  return results;
}

export interface ScraperTarget {
  id: string;
  name: string;
  domain: string;
  badgeColor: string;
  buildSearchUrl: (q: string) => string;
  parser: (html: string) => ScrapedWatchVideo[];
}

export function slugifySxyprn(query: string): string {
  const cleaned = query
    .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, ' ')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'video';
}

export const SCRAPER_TARGETS: ScraperTarget[] = [
  {
    id: 'porneec',
    name: 'Porneec',
    domain: 'porneec.com',
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    buildSearchUrl: (q) => `https://porneec.com/?s=${encodeURIComponent(q)}`,
    parser: parsePorneec,
  },
  {
    id: 'yourdailypornvideos',
    name: 'YourDailyPornVideos',
    domain: 'yourdailypornvideos.ws',
    badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    buildSearchUrl: (q) => `https://yourdailypornvideos.ws/?s=${encodeURIComponent(q)}`,
    parser: parseYourDailyPornVideos,
  },
  {
    id: 'fullporner',
    name: 'FullPorner',
    domain: 'fullporner.com',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    buildSearchUrl: (q) => `https://fullporner.com/search?q=${encodeURIComponent(q)}`,
    parser: parseFullPorner,
  },
  {
    id: 'trendyporn',
    name: 'TrendyPorn',
    domain: 'trendyporn.com',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
    buildSearchUrl: (q) => `https://www.trendyporn.com/searchgate.php?search=${encodeURIComponent(q)}`,
    parser: parseTrendyPorn,
  },
  {
    id: 'porn4days',
    name: 'Porn4Days',
    domain: 'porn4days.pw',
    badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    buildSearchUrl: (q) => `https://porn4days.pw/search/?s=${encodeURIComponent(q)}`,
    parser: parsePorn4Days,
  },
  {
    id: 'xmoviesforyou',
    name: 'XMoviesForYou',
    domain: 'xmoviesforyou.com',
    badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    buildSearchUrl: (q) => `https://xmoviesforyou.com/search?q=${encodeURIComponent(q)}`,
    parser: parseXMoviesForYou,
  },
  {
    id: 'sxyprn',
    name: 'SxyPrn',
    domain: 'sxyprn.com',
    badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    buildSearchUrl: (q) => `https://sxyprn.com/${encodeURIComponent(slugifySxyprn(q))}.html`,
    parser: parseSxyPrn,
  },
];

export async function scrapeSingleSite(
  target: ScraperTarget,
  query: string,
  timeoutMs = 6000
): Promise<{ videos: ScrapedWatchVideo[]; status: SiteScrapeStatus }> {
  const searchUrl = target.buildSearchUrl(query);
  const statusBase: Omit<SiteScrapeStatus, 'count' | 'status' | 'error'> = {
    siteId: target.id,
    siteName: target.name,
    siteDomain: target.domain,
    badgeColor: target.badgeColor,
    directSearchUrl: searchUrl,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(searchUrl, {
      headers: FETCH_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return {
        videos: [],
        status: {
          ...statusBase,
          count: 0,
          status: 'error',
          error: `HTTP ${response.status}`,
        },
      };
    }

    const html = await response.text();
    const videos = target.parser(html);

    return {
      videos,
      status: {
        ...statusBase,
        count: videos.length,
        status: videos.length > 0 ? 'success' : 'empty',
      },
    };
  } catch (err: unknown) {
    const isTimeout =
      err instanceof Error &&
      (err.name === 'AbortError' || err.message.toLowerCase().includes('timeout'));

    return {
      videos: [],
      status: {
        ...statusBase,
        count: 0,
        status: isTimeout ? 'timeout' : 'error',
        error: err instanceof Error ? err.message : 'Fetch error',
      },
    };
  }
}

export async function scrapeAllWatchSites(
  query: string,
  timeoutMs = 6000
): Promise<WatchScrapeResponse> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return {
      query: '',
      videos: [],
      siteStatuses: SCRAPER_TARGETS.map((t) => ({
        siteId: t.id,
        siteName: t.name,
        siteDomain: t.domain,
        badgeColor: t.badgeColor,
        count: 0,
        status: 'empty',
        directSearchUrl: t.buildSearchUrl(''),
      })),
      totalFound: 0,
    };
  }

  const tasks = SCRAPER_TARGETS.map((target) =>
    scrapeSingleSite(target, cleanQuery, timeoutMs)
  );

  const results = await Promise.allSettled(tasks);

  const allVideos: ScrapedWatchVideo[] = [];
  const siteStatuses: SiteScrapeStatus[] = [];

  for (let i = 0; i < SCRAPER_TARGETS.length; i++) {
    const target = SCRAPER_TARGETS[i];
    const outcome = results[i];

    if (outcome.status === 'fulfilled') {
      allVideos.push(...outcome.value.videos);
      siteStatuses.push(outcome.value.status);
    } else {
      siteStatuses.push({
        siteId: target.id,
        siteName: target.name,
        siteDomain: target.domain,
        badgeColor: target.badgeColor,
        count: 0,
        status: 'error',
        error: outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error',
        directSearchUrl: target.buildSearchUrl(cleanQuery),
      });
    }
  }

  return {
    query: cleanQuery,
    videos: allVideos,
    siteStatuses,
    totalFound: allVideos.length,
  };
}
