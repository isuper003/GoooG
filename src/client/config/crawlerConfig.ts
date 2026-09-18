// ---------------------------------------------------------------------------
// Category Crawler Sources Configuration
// ---------------------------------------------------------------------------
// Paste your target website URL for each category below.
// Use {page} as a placeholder for the page number.
//
// pornpics.com paginates its pornstar listings with a path segment, not a
// query string — /pornstars/2/, not /pornstars/?page=2 (the latter is
// silently ignored and always serves page 1). /pornstars/1/ works fine too,
// so {page} can be used uniformly for every page including the first.
// ---------------------------------------------------------------------------

export interface CrawlerSourceConfig {
  trans: string;
  sluts: string;
  twinks: string;
}

export const DEFAULT_CATEGORY_SOURCE_URLS: CrawlerSourceConfig = {
  // 1. Variable for Trans category
  trans: 'https://www.pornpics.com/pornstars/shemale/{page}/',

  // 2. Variable for Sluts category
  sluts: 'https://www.pornpics.com/pornstars/{page}/',

  // 3. Variable for Twinks category
  twinks: 'https://www.pornpics.com/pornstars/gay/{page}/',
};
