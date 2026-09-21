import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../app';
import { queryAll, queryOne } from '../db';
import type {
  Data18Favorite,
  Data18FeedItem,
  Data18FeedResponse,
} from '../../shared/data18Types';
import { Data18Error, fetchData18Html, normalizeEntityPath } from '../lib/data18Fetch';
import { parseEntityDetailFromHtml } from '../lib/data18Parsers';

export const data18FavoritesRouter = new Hono<AppEnv>();

/** The feed loads at most this many favorites per request (upstream page fetches are costly). */
const FEED_FAVORITE_LIMIT = 20;
const FEED_SCENES_PER_ITEM = 8;
const MAX_SEEN_UPDATES = 50;
const TTL_FEED = 10 * 60_000;

interface FavoriteRow {
  id: number;
  path: string;
  kind: Data18Favorite['kind'];
  slug: string;
  name: string;
  last_seen_scene_id: string | null;
  created_at: string;
}

function toFavorite(row: FavoriteRow): Data18Favorite {
  return {
    id: row.id,
    path: row.path,
    kind: row.kind,
    slug: row.slug,
    name: row.name,
    lastSeenSceneId: row.last_seen_scene_id,
    createdAt: row.created_at,
  };
}

/** How many scenes (newest first) are newer than the last seen one. */
export function countNewScenes(scenes: { id: string }[], lastSeenId: string | null): number {
  if (!lastSeenId) return 0;
  const index = scenes.findIndex((scene) => scene.id === lastSeenId);
  // Not on the first page any more: everything listed is newer than what was seen.
  return index === -1 ? scenes.length : index;
}

function database(c: Context<AppEnv>): D1Database | null {
  return c.env?.DB ?? null;
}

const SELECT_FAVORITE = 'SELECT id, path, kind, slug, name, last_seen_scene_id, created_at FROM data18_favorites';

// GET /api/data18/favorites
data18FavoritesRouter.get('/favorites', async (c) => {
  const db = database(c);
  if (!db) return c.json({ error: 'Database unavailable' }, 503);
  const rows = await queryAll<FavoriteRow>(db, `${SELECT_FAVORITE} ORDER BY created_at DESC, id DESC`);
  return c.json({ favorites: rows.map(toFavorite) });
});

// POST /api/data18/favorites { path }
data18FavoritesRouter.post(
  '/favorites',
  zValidator('json', z.object({ path: z.string().trim().min(1).max(300) })),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const path = normalizeEntityPath(c.req.valid('json').path);
    if (!path) return c.json({ error: 'Invalid Data18 entity path' }, 400);

    const existing = await queryOne<FavoriteRow>(db, `${SELECT_FAVORITE} WHERE path = ?`, path);
    if (existing) return c.json(toFavorite(existing));

    try {
      // The entity page provides the display name and type, and the newest scene becomes the
      // baseline so only scenes that appear from now on count as "new".
      const html = await fetchData18Html(path, { ttlMs: TTL_FEED, db });
      const detail = parseEntityDetailFromHtml(html, path);
      await db
        .prepare(
          'INSERT OR IGNORE INTO data18_favorites (path, kind, slug, name, last_seen_scene_id) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(path, detail.type, detail.slug, detail.name, detail.scenes[0]?.id ?? null)
        .run();
      const row = await queryOne<FavoriteRow>(db, `${SELECT_FAVORITE} WHERE path = ?`, path);
      return c.json(toFavorite(row!), 201);
    } catch (err) {
      if (err instanceof Data18Error) return c.json({ error: err.message }, err.status);
      throw err;
    }
  }
);

// DELETE /api/data18/favorites?path=/name/cory-chase
data18FavoritesRouter.delete(
  '/favorites',
  zValidator('query', z.object({ path: z.string().trim().min(1).max(300) })),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const path = normalizeEntityPath(c.req.valid('query').path);
    if (!path) return c.json({ error: 'Invalid Data18 entity path' }, 400);

    await db.prepare('DELETE FROM data18_favorites WHERE path = ?').bind(path).run();
    return c.json({ ok: true });
  }
);

// POST /api/data18/favorites/seen { items: [{ path, sceneId }] } — moves the "seen" marker forward
data18FavoritesRouter.post(
  '/favorites/seen',
  zValidator(
    'json',
    z.object({
      items: z
        .array(z.object({ path: z.string().trim().min(1).max(300), sceneId: z.string().regex(/^\d{1,10}$/) }))
        .min(1)
        .max(MAX_SEEN_UPDATES),
    })
  ),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const updates: { path: string; sceneId: string }[] = [];
    for (const item of c.req.valid('json').items) {
      const path = normalizeEntityPath(item.path);
      if (!path) return c.json({ error: `Invalid Data18 entity path: ${item.path}` }, 400);
      updates.push({ path, sceneId: item.sceneId });
    }

    await db.batch(
      updates.map((u) =>
        db.prepare('UPDATE data18_favorites SET last_seen_scene_id = ? WHERE path = ?').bind(u.sceneId, u.path)
      )
    );
    return c.json({ ok: true, updated: updates.length });
  }
);

// GET /api/data18/feed — latest scenes of the followed performers/studios, with a "new" count
data18FavoritesRouter.get('/feed', async (c) => {
  const db = database(c);
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const total = await queryOne<{ n: number }>(db, 'SELECT COUNT(*) AS n FROM data18_favorites');
  const rows = await queryAll<FavoriteRow>(
    db,
    `${SELECT_FAVORITE} ORDER BY created_at DESC, id DESC LIMIT ?`,
    FEED_FAVORITE_LIMIT
  );

  const items = await Promise.all(
    rows.map(async (row): Promise<Data18FeedItem> => {
      const favorite = toFavorite(row);
      try {
        const html = await fetchData18Html(row.path, { ttlMs: TTL_FEED, db });
        const listed = parseEntityDetailFromHtml(html, row.path).scenes;
        return {
          favorite,
          scenes: listed.slice(0, FEED_SCENES_PER_ITEM),
          // Counted on the whole first page, not just the scenes that are displayed.
          newCount: countNewScenes(listed, row.last_seen_scene_id),
          newestSceneId: listed[0]?.id ?? null,
        };
      } catch (err) {
        return {
          favorite,
          scenes: [],
          newCount: 0,
          newestSceneId: null,
          error: err instanceof Error ? err.message : 'Failed to load from Data18',
        };
      }
    })
  );

  const response: Data18FeedResponse = { items, totalFavorites: total?.n ?? items.length };
  return c.json(response);
});
