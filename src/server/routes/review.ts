import { Hono } from 'hono';
import type { AppEnv } from '../app';
import type { ReviewQueuesDTO } from '../../shared/types';
import { dueIds, leechIds, quickMixIds } from '../queues';

export const reviewRouter = new Hono<AppEnv>();

// GET /api/review/queues
reviewRouter.get('/queues', async (c) => {
  const nowIso = new Date().toISOString();
  const [due, leech, quick] = await Promise.all([
    dueIds(c.env.DB, nowIso),
    leechIds(c.env.DB),
    quickMixIds(c.env.DB),
  ]);

  const dto: ReviewQueuesDTO = {
    due: {
      count: due.length,
      characterIds: due,
    },
    leech: {
      count: leech.length,
      characterIds: leech,
    },
    quick: {
      count: quick.length,
      characterIds: quick,
    },
  };

  return c.json(dto);
});
