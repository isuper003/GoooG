// ---------------------------------------------------------------------------
// Category Crawler Sources Configuration
// ---------------------------------------------------------------------------
// Paste your target website URL for each category below.
// Use {page} as a placeholder for the page number (e.g. /page/{page} or ?p={page})
// ---------------------------------------------------------------------------

export interface CrawlerSourceConfig {
  trans: string;
  sluts: string;
  twinks: string;
}

export const DEFAULT_CATEGORY_SOURCE_URLS: CrawlerSourceConfig = {
  // 1. Variable for Trans category
  trans: 'https://www.pornpics.com/pornstars/shemale/?page={page}',

  // 2. Variable for Sluts category
  sluts: 'https://www.pornpics.com/pornstars/?page={page}',

  // 3. Variable for Twinks category
  twinks: 'https://www.pornpics.com/pornstars/gay/?page={page}',
};
