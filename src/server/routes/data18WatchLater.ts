import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../app';
import { queryAll, queryOne } from '../db';
import type {
  Data18WatchLaterItem,
  Data18WatchLaterStats,
  Data18WatchLaterResponse,
  Data18WatchLaterBackup,
  Data18WatchLaterBackupItem,
} from '../../shared/data18Types';

export const data18WatchLaterRouter = new Hono<AppEnv>();

interface WatchLaterRow {
  id: number;
  item_type: 'scene' | 'movie';
  item_id: string;
  title: string;
  slug: string | null;
  url: string;
  image_url: string | null;
  release_date: string | null;
  duration: string | null;
  studio_name: string | null;
  studio_slug: string | null;
  cast_json: string | null;
  is_watched: number;
  notes: string | null;
  created_at: string;
  watched_at: string | null;
}

function toWatchLaterItem(row: WatchLaterRow): Data18WatchLaterItem {
  let cast: { name: string; slug: string }[] | undefined = undefined;
  if (row.cast_json) {
    try {
      cast = JSON.parse(row.cast_json);
    } catch {
      // ignore
    }
  }

  return {
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    title: row.title,
    slug: row.slug ?? undefined,
    url: row.url,
    imageUrl: row.image_url ?? undefined,
    releaseDate: row.release_date,
    duration: row.duration,
    studio: row.studio_name ? { name: row.studio_name, slug: row.studio_slug || '' } : null,
    cast,
    isWatched: Boolean(row.is_watched),
    notes: row.notes,
    createdAt: row.created_at,
    watchedAt: row.watched_at,
  };
}

function database(c: Context<AppEnv>): D1Database | null {
  return c.env?.DB ?? null;
}

const SELECT_WATCH_LATER = `
  SELECT id, item_type, item_id, title, slug, url, image_url, release_date,
         duration, studio_name, studio_slug, cast_json, is_watched, notes,
         created_at, watched_at
  FROM data18_watch_later
`;

// GET /api/data18/watch-later/export (Placed before parameterized GET routes)
data18WatchLaterRouter.get('/watch-later/export', async (c) => {
  const db = database(c);
  if (!db) return c.json({ error: 'Database unavailable' }, 503);

  const rows = await queryAll<WatchLaterRow>(db, `${SELECT_WATCH_LATER} ORDER BY created_at DESC, id DESC`);
  const items: Data18WatchLaterBackupItem[] = rows.map((r) => {
    const full = toWatchLaterItem(r);
    return {
      itemType: full.itemType,
      itemId: full.itemId,
      title: full.title,
      slug: full.slug,
      url: full.url,
      imageUrl: full.imageUrl,
      releaseDate: full.releaseDate,
      duration: full.duration,
      studio: full.studio,
      cast: full.cast,
      isWatched: full.isWatched,
      notes: full.notes,
      createdAt: full.createdAt,
      watchedAt: full.watchedAt,
    };
  });

  const today = new Date().toISOString().split('T')[0];
  const backup: Data18WatchLaterBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    totalCount: items.length,
    items,
  };

  c.header('Content-Disposition', `attachment; filename="data18-watch-later-${today}.json"`);
  return c.json(backup);
});

// GET /api/data18/watch-later
data18WatchLaterRouter.get(
  '/watch-later',
  zValidator(
    'query',
    z.object({
      filter: z.enum(['all', 'unwatched', 'watched']).optional().default('all'),
      type: z.enum(['all', 'scene', 'movie']).optional().default('all'),
      search: z.string().optional(),
    })
  ),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const { filter, type, search } = c.req.valid('query');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter === 'unwatched') {
      conditions.push('is_watched = 0');
    } else if (filter === 'watched') {
      conditions.push('is_watched = 1');
    }

    if (type !== 'all') {
      conditions.push('item_type = ?');
      params.push(type);
    }

    if (search && search.trim().length > 0) {
      conditions.push('(title LIKE ? OR studio_name LIKE ? OR cast_json LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `${SELECT_WATCH_LATER} ${whereClause} ORDER BY created_at DESC, id DESC`;

    const rows = await queryAll<WatchLaterRow>(db, query, ...params);

    // Compute stats
    const statsRows = await queryAll<{ item_type: string; is_watched: number; count: number }>(
      db,
      'SELECT item_type, is_watched, COUNT(*) as count FROM data18_watch_later GROUP BY item_type, is_watched'
    );

    let total = 0;
    let unwatched = 0;
    let watched = 0;
    let scenes = 0;
    let movies = 0;

    for (const r of statsRows) {
      const cnt = Number(r.count);
      total += cnt;
      if (r.is_watched === 1) watched += cnt;
      else unwatched += cnt;

      if (r.item_type === 'scene') scenes += cnt;
      else if (r.item_type === 'movie') movies += cnt;
    }

    const stats: Data18WatchLaterStats = {
      total,
      unwatched,
      watched,
      scenes,
      movies,
    };

    const response: Data18WatchLaterResponse = {
      items: rows.map(toWatchLaterItem),
      stats,
    };

    return c.json(response);
  }
);

const watchLaterItemSchema = z.object({
  itemType: z.enum(['scene', 'movie']),
  itemId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(500),
  slug: z.string().trim().max(300).optional(),
  url: z.string().trim().min(1).max(500),
  imageUrl: z.string().trim().max(500).optional(),
  releaseDate: z.string().trim().max(100).nullable().optional(),
  duration: z.string().trim().max(100).nullable().optional(),
  studio: z.object({ name: z.string(), slug: z.string() }).nullable().optional(),
  cast: z.array(z.object({ name: z.string(), slug: z.string() })).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  isWatched: z.boolean().optional(),
});

// POST /api/data18/watch-later
data18WatchLaterRouter.post(
  '/watch-later',
  zValidator('json', watchLaterItemSchema),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const body = c.req.valid('json');
    const castJson = body.cast ? JSON.stringify(body.cast) : null;
    const isWatchedNum = body.isWatched ? 1 : 0;
    const watchedAt = body.isWatched ? new Date().toISOString() : null;

    await db
      .prepare(
        `INSERT INTO data18_watch_later (
          item_type, item_id, title, slug, url, image_url, release_date,
          duration, studio_name, studio_slug, cast_json, is_watched, notes, watched_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(item_type, item_id) DO UPDATE SET
          title = excluded.title,
          slug = excluded.slug,
          url = excluded.url,
          image_url = excluded.image_url,
          release_date = excluded.release_date,
          duration = excluded.duration,
          studio_name = excluded.studio_name,
          studio_slug = excluded.studio_slug,
          cast_json = excluded.cast_json`
      )
      .bind(
        body.itemType,
        body.itemId,
        body.title,
        body.slug ?? null,
        body.url,
        body.imageUrl ?? null,
        body.releaseDate ?? null,
        body.duration ?? null,
        body.studio?.name ?? null,
        body.studio?.slug ?? null,
        castJson,
        isWatchedNum,
        body.notes ?? null,
        watchedAt
      )
      .run();

    const row = await queryOne<WatchLaterRow>(
      db,
      `${SELECT_WATCH_LATER} WHERE item_type = ? AND item_id = ?`,
      body.itemType,
      body.itemId
    );

    return c.json(toWatchLaterItem(row!), 201);
  }
);

// DELETE /api/data18/watch-later
data18WatchLaterRouter.delete(
  '/watch-later',
  zValidator(
    'query',
    z.object({
      id: z.coerce.number().optional(),
      itemType: z.enum(['scene', 'movie']).optional(),
      itemId: z.string().optional(),
    })
  ),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const { id, itemType, itemId } = c.req.valid('query');

    if (id) {
      await db.prepare('DELETE FROM data18_watch_later WHERE id = ?').bind(id).run();
      return c.json({ ok: true });
    }

    if (itemType && itemId) {
      await db
        .prepare('DELETE FROM data18_watch_later WHERE item_type = ? AND item_id = ?')
        .bind(itemType, itemId)
        .run();
      return c.json({ ok: true });
    }

    return c.json({ error: 'Provide either id or itemType and itemId' }, 400);
  }
);

// PATCH /api/data18/watch-later/:id
data18WatchLaterRouter.patch(
  '/watch-later/:id',
  zValidator('param', z.object({ id: z.coerce.number() })),
  zValidator(
    'json',
    z.object({
      isWatched: z.boolean().optional(),
      notes: z.string().trim().max(1000).nullable().optional(),
    })
  ),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const { id } = c.req.valid('param');
    const body = c.req.valid('json');

    const existing = await queryOne<WatchLaterRow>(db, `${SELECT_WATCH_LATER} WHERE id = ?`, id);
    if (!existing) return c.json({ error: 'Not found' }, 404);

    const updates: string[] = [];
    const params: unknown[] = [];

    if (body.isWatched !== undefined) {
      updates.push('is_watched = ?');
      params.push(body.isWatched ? 1 : 0);

      updates.push('watched_at = ?');
      params.push(body.isWatched ? new Date().toISOString() : null);
    }

    if (body.notes !== undefined) {
      updates.push('notes = ?');
      params.push(body.notes);
    }

    if (updates.length === 0) {
      return c.json(toWatchLaterItem(existing));
    }

    params.push(id);
    await db.prepare(`UPDATE data18_watch_later SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();

    const updated = await queryOne<WatchLaterRow>(db, `${SELECT_WATCH_LATER} WHERE id = ?`, id);
    return c.json(toWatchLaterItem(updated!));
  }
);

// POST /api/data18/watch-later/import
data18WatchLaterRouter.post(
  '/watch-later/import',
  zValidator(
    'json',
    z.object({
      mode: z.enum(['merge', 'replace']).default('merge'),
      items: z.array(
        z.object({
          itemType: z.enum(['scene', 'movie']),
          itemId: z.string().trim().min(1).max(200),
          title: z.string().trim().min(1).max(500),
          slug: z.string().trim().max(300).optional(),
          url: z.string().trim().min(1).max(500),
          imageUrl: z.string().trim().max(500).optional(),
          releaseDate: z.string().trim().max(100).nullable().optional(),
          duration: z.string().trim().max(100).nullable().optional(),
          studio: z.object({ name: z.string(), slug: z.string() }).nullable().optional(),
          cast: z.array(z.object({ name: z.string(), slug: z.string() })).optional(),
          isWatched: z.boolean().optional(),
          notes: z.string().trim().max(1000).nullable().optional(),
          createdAt: z.string().optional(),
          watchedAt: z.string().nullable().optional(),
        })
      ),
    })
  ),
  async (c) => {
    const db = database(c);
    if (!db) return c.json({ error: 'Database unavailable' }, 503);

    const { mode, items } = c.req.valid('json');

    if (mode === 'replace') {
      await db.prepare('DELETE FROM data18_watch_later').run();
    }

    let importedCount = 0;
    const stmts = items.map((item) => {
      const castJson = item.cast ? JSON.stringify(item.cast) : null;
      const isWatchedNum = item.isWatched ? 1 : 0;
      const createdAt = item.createdAt ?? new Date().toISOString();
      const watchedAt = item.watchedAt ?? (item.isWatched ? new Date().toISOString() : null);

      return db
        .prepare(
          `INSERT INTO data18_watch_later (
            item_type, item_id, title, slug, url, image_url, release_date,
            duration, studio_name, studio_slug, cast_json, is_watched, notes, created_at, watched_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(item_type, item_id) DO UPDATE SET
            title = excluded.title,
            slug = excluded.slug,
            url = excluded.url,
            image_url = excluded.image_url,
            release_date = excluded.release_date,
            duration = excluded.duration,
            studio_name = excluded.studio_name,
            studio_slug = excluded.studio_slug,
            cast_json = excluded.cast_json,
            is_watched = excluded.is_watched,
            notes = COALESCE(excluded.notes, data18_watch_later.notes)`
        )
        .bind(
          item.itemType,
          item.itemId,
          item.title,
          item.slug ?? null,
          item.url,
          item.imageUrl ?? null,
          item.releaseDate ?? null,
          item.duration ?? null,
          item.studio?.name ?? null,
          item.studio?.slug ?? null,
          castJson,
          isWatchedNum,
          item.notes ?? null,
          createdAt,
          watchedAt
        );
    });

    // Execute in batches of up to 50
    const BATCH_SIZE = 50;
    for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
      const batch = stmts.slice(i, i + BATCH_SIZE);
      await db.batch(batch);
      importedCount += batch.length;
    }

    return c.json({
      ok: true,
      imported: importedCount,
      mode,
    });
  }
);
