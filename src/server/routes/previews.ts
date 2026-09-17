import { Hono } from 'hono';
import { queryAll } from '../db';
import type { HomePreviewsDTO } from '../../shared/types';
import type { AppEnv } from '../app';

export const previewsRouter = new Hono<AppEnv>();

// GET /api/home-previews
previewsRouter.get('/', async (c) => {
  const getCategoryUrls = async (categoryKey: string): Promise<string[]> => {
    const rows = await queryAll<{ url: string }>(
      c.env.DB,
      `SELECT ci.url
       FROM character_images ci
       JOIN characters c ON ci.character_id = c.id
       JOIN categories cat ON c.category_id = cat.id
       WHERE ci.position = 0 AND cat.key = ?
       ORDER BY RANDOM()
       LIMIT 8`,
      categoryKey
    );
    return rows.map((r) => r.url);
  };

  const getMixUrls = async (): Promise<string[]> => {
    const rows = await queryAll<{ url: string }>(
      c.env.DB,
      `SELECT ci.url
       FROM character_images ci
       JOIN characters c ON ci.character_id = c.id
       WHERE ci.position = 0
       ORDER BY RANDOM()
       LIMIT 8`
    );
    return rows.map((r) => r.url);
  };

  const [male, female, boys, mix] = await Promise.all([
    getCategoryUrls('male'),
    getCategoryUrls('female'),
    getCategoryUrls('boys'),
    getMixUrls(),
  ]);

  const response: HomePreviewsDTO = {
    male,
    female,
    boys,
    mix,
  };

  return c.json(response);
});
