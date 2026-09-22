import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { scrapeAllWatchSites } from '../lib/watchScraper';

export const watchRouter = new Hono<AppEnv>();

// GET /api/watch/search?q=...
watchRouter.get('/search', async (c) => {
  const query = c.req.query('q');

  if (!query || !query.trim()) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }

  try {
    const result = await scrapeAllWatchSites(query.trim());
    return c.json(result, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Scraping failed';
    return c.json({ error: message }, 500);
  }
});
