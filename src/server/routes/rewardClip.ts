import { Hono } from 'hono';
import type { AppEnv } from '../app';
import { fetchRandomRewardClip } from '../lib/rewardClipScraper';

export const rewardClipRouter = new Hono<AppEnv>();

// GET /api/reward-clip/random?q=...&exclude=...
rewardClipRouter.get('/random', async (c) => {
  const query = c.req.query('q');
  const exclude = c.req.query('exclude');

  if (!query || !query.trim()) {
    return c.json({ ok: false, error: 'Query parameter "q" is required' }, 400);
  }

  const result = await fetchRandomRewardClip(query.trim(), exclude?.trim());
  return c.json(result, result.ok ? 200 : 404);
});
