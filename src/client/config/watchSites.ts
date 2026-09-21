export interface WatchSite {
  id: string;
  name: string;
  domain: string;
  badgeColor: string;
  buildSearchUrl: (query: string) => string;
}

/**
 * Normalizes a query into a slug matching sxyprn.com's internal `makeValidKey` logic.
 */
export function slugifySxyprn(query: string): string {
  const cleaned = query
    .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, ' ')
    .trim()
    .replace(/\s+/g, '-');
  return cleaned || 'video';
}

/**
 * The 7 configured streaming and search platforms requested by the user.
 */
export const WATCH_SITES: WatchSite[] = [
  {
    id: 'porneec',
    name: 'Porneec',
    domain: 'porneec.com',
    badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20',
    buildSearchUrl: (query: string) =>
      `https://porneec.com/?s=${encodeURIComponent(query.trim())}`,
  },
  {
    id: 'yourdailypornvideos',
    name: 'YourDailyPornVideos',
    domain: 'yourdailypornvideos.ws',
    badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20',
    buildSearchUrl: (query: string) =>
      `https://yourdailypornvideos.ws/?s=${encodeURIComponent(query.trim())}`,
  },
  {
    id: 'fullporner',
    name: 'FullPorner',
    domain: 'fullporner.com',
    badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20',
    buildSearchUrl: (query: string) =>
      `https://fullporner.com/search?q=${encodeURIComponent(query.trim())}`,
  },
  {
    id: 'trendyporn',
    name: 'TrendyPorn',
    domain: 'trendyporn.com',
    badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20',
    buildSearchUrl: (query: string) =>
      `https://www.trendyporn.com/searchgate.php?search=${encodeURIComponent(query.trim())}`,
  },
  {
    id: 'porn4days',
    name: 'Porn4Days',
    domain: 'porn4days.pw',
    badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20',
    buildSearchUrl: (query: string) =>
      `https://porn4days.pw/search/?s=${encodeURIComponent(query.trim())}`,
  },
  {
    id: 'xmoviesforyou',
    name: 'XMoviesForYou',
    domain: 'xmoviesforyou.com',
    badgeColor: 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20',
    buildSearchUrl: (query: string) =>
      `https://xmoviesforyou.com/search?q=${encodeURIComponent(query.trim())}`,
  },
  {
    id: 'sxyprn',
    name: 'SxyPrn',
    domain: 'sxyprn.com',
    badgeColor: 'text-orange-400 border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20',
    buildSearchUrl: (query: string) =>
      `https://sxyprn.com/${encodeURIComponent(slugifySxyprn(query))}.html`,
  },
];

/**
 * Cleans a scene or movie title by stripping leading scene counters like "Scene 1 - "
 * if useful, while preserving meaningful titles.
 */
export function cleanSearchTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/^scene\s+\d+\s*[-:–—]\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
