import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { data18WatchLaterRouter } from './data18WatchLater';
import type { AppEnv } from '../app';

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

function fakeDb() {
  const rows: WatchLaterRow[] = [];
  let nextId = 1;

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT INTO data18_watch_later')) {
      const [
        item_type,
        item_id,
        title,
        slug,
        url,
        image_url,
        release_date,
        duration,
        studio_name,
        studio_slug,
        cast_json,
        is_watched,
        notes,
        created_or_watched,
        watched_at_val,
      ] = args as [
        'scene' | 'movie',
        string,
        string,
        string | null,
        string,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
        string | null,
        string | null,
        string | null
      ];

      const existingIndex = rows.findIndex((r) => r.item_type === item_type && r.item_id === item_id);
      if (existingIndex >= 0) {
        rows[existingIndex] = {
          ...rows[existingIndex],
          title,
          slug,
          url,
          image_url,
          release_date,
          duration,
          studio_name,
          studio_slug,
          cast_json,
          is_watched,
        };
      } else {
        rows.push({
          id: nextId++,
          item_type,
          item_id,
          title,
          slug,
          url,
          image_url,
          release_date,
          duration,
          studio_name,
          studio_slug,
          cast_json,
          is_watched,
          notes,
          created_at: created_or_watched || new Date().toISOString(),
          watched_at: watched_at_val || (is_watched ? new Date().toISOString() : null),
        });
      }
    } else if (sql.startsWith('DELETE FROM data18_watch_later')) {
      if (sql.includes('WHERE id = ?')) {
        const id = args[0] as number;
        const idx = rows.findIndex((r) => r.id === id);
        if (idx >= 0) rows.splice(idx, 1);
      } else if (sql.includes('WHERE item_type = ? AND item_id = ?')) {
        const [type, id] = args as [string, string];
        const idx = rows.findIndex((r) => r.item_type === type && r.item_id === id);
        if (idx >= 0) rows.splice(idx, 1);
      } else {
        // Full table delete
        rows.length = 0;
      }
    } else if (sql.startsWith('UPDATE data18_watch_later')) {
      const id = args[args.length - 1] as number;
      const row = rows.find((r) => r.id === id);
      if (row) {
        if (sql.includes('is_watched = ?')) {
          row.is_watched = args[0] as number;
          row.watched_at = args[1] as string | null;
        }
        if (sql.includes('notes = ?')) {
          row.notes = args[0] as string | null;
        }
      }
    }
    return {};
  }

  function statement(sql: string, args: unknown[] = []) {
    return {
      bind: (...bound: unknown[]) => statement(sql, bound),
      first: async () => {
        if (sql.includes('WHERE item_type = ? AND item_id = ?')) {
          return rows.find((r) => r.item_type === args[0] && r.item_id === args[1]) ?? null;
        }
        if (sql.includes('WHERE id = ?')) {
          return rows.find((r) => r.id === args[0]) ?? null;
        }
        return null;
      },
      all: async () => {
        if (sql.includes('SELECT item_type, is_watched, COUNT(*)')) {
          const statsMap = new Map<string, { item_type: string; is_watched: number; count: number }>();
          for (const r of rows) {
            const key = `${r.item_type}:${r.is_watched}`;
            const cur = statsMap.get(key) || { item_type: r.item_type, is_watched: r.is_watched, count: 0 };
            cur.count++;
            statsMap.set(key, cur);
          }
          return { results: Array.from(statsMap.values()) };
        }
        let result = [...rows];
        if (sql.includes('is_watched = 0')) {
          result = result.filter((r) => r.is_watched === 0);
        } else if (sql.includes('is_watched = 1')) {
          result = result.filter((r) => r.is_watched === 1);
        }
        if (sql.includes('item_type = ?')) {
          result = result.filter((r) => r.item_type === args[0]);
        }
        return { results: result };
      },
      run: async () => run(sql, args),
      exec: () => run(sql, args),
    };
  }

  const db = {
    prepare: (sql: string) => statement(sql),
    batch: async (statements: { exec: () => unknown }[]) => statements.map((s) => s.exec()),
  } as unknown as D1Database;

  return { db, rows };
}

function makeApp(db: D1Database) {
  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    (c.env as { DB: D1Database }) = { DB: db };
    await next();
  });
  app.route('/api/data18', data18WatchLaterRouter);
  return app;
}

describe('data18WatchLaterRouter', () => {
  it('returns empty list and zeroed stats initially', async () => {
    const { db } = fakeDb();
    const app = makeApp(db);

    const res = await app.request('/api/data18/watch-later');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { items: unknown[]; stats: { total: number } };
    expect(body.items).toHaveLength(0);
    expect(body.stats.total).toBe(0);
  });

  it('adds an item to watch later via POST', async () => {
    const { db } = fakeDb();
    const app = makeApp(db);

    const res = await app.request('/api/data18/watch-later', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemType: 'scene',
        itemId: '12345',
        title: 'Cory Chase Scene',
        url: 'https://www.data18.com/scenes/12345',
        studio: { name: 'Evil Angel', slug: 'evil-angel' },
        cast: [{ name: 'Cory Chase', slug: 'cory-chase' }],
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: number;
      itemType: string;
      itemId: string;
      title: string;
      studio: { name: string };
      cast: { name: string }[];
    };
    expect(body.itemId).toBe('12345');
    expect(body.title).toBe('Cory Chase Scene');
    expect(body.studio.name).toBe('Evil Angel');
    expect(body.cast[0].name).toBe('Cory Chase');

    // Verify GET reflects the added item
    const getRes = await app.request('/api/data18/watch-later');
    const getBody = (await getRes.json()) as { items: unknown[]; stats: { total: number; scenes: number } };
    expect(getBody.items).toHaveLength(1);
    expect(getBody.stats.total).toBe(1);
    expect(getBody.stats.scenes).toBe(1);
  });

  it('updates watched status via PATCH', async () => {
    const { db, rows } = fakeDb();
    rows.push({
      id: 1,
      item_type: 'scene',
      item_id: '12345',
      title: 'Cory Chase Scene',
      slug: null,
      url: 'https://www.data18.com/scenes/12345',
      image_url: null,
      release_date: null,
      duration: null,
      studio_name: null,
      studio_slug: null,
      cast_json: null,
      is_watched: 0,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      watched_at: null,
    });

    const app = makeApp(db);

    const patchRes = await app.request('/api/data18/watch-later/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isWatched: true }),
    });

    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as { isWatched: boolean; watchedAt: string | null };
    expect(patched.isWatched).toBe(true);
    expect(patched.watchedAt).toBeTruthy();
  });

  it('deletes an item via DELETE', async () => {
    const { db, rows } = fakeDb();
    rows.push({
      id: 1,
      item_type: 'scene',
      item_id: '12345',
      title: 'Test',
      slug: null,
      url: 'https://www.data18.com/scenes/12345',
      image_url: null,
      release_date: null,
      duration: null,
      studio_name: null,
      studio_slug: null,
      cast_json: null,
      is_watched: 0,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      watched_at: null,
    });

    const app = makeApp(db);

    const delRes = await app.request('/api/data18/watch-later?id=1', {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);
    expect(rows).toHaveLength(0);
  });

  it('exports watch later data as JSON backup', async () => {
    const { db, rows } = fakeDb();
    rows.push({
      id: 1,
      item_type: 'movie',
      item_id: 'sample-movie',
      title: 'Sample Movie',
      slug: 'sample-movie',
      url: 'https://www.data18.com/movies/sample-movie',
      image_url: 'https://example.com/cover.jpg',
      release_date: '2026',
      duration: '90m',
      studio_name: 'Brazzers',
      studio_slug: 'brazzers',
      cast_json: JSON.stringify([{ name: 'Angela White', slug: 'angela-white' }]),
      is_watched: 1,
      notes: 'Must watch',
      created_at: '2026-01-01T00:00:00Z',
      watched_at: '2026-01-02T00:00:00Z',
    });

    const app = makeApp(db);

    const res = await app.request('/api/data18/watch-later/export');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename=');

    const backup = (await res.json()) as { version: number; totalCount: number; items: unknown[] };
    expect(backup.version).toBe(1);
    expect(backup.totalCount).toBe(1);
    expect(backup.items).toHaveLength(1);
  });

  it('imports watch later data in merge mode', async () => {
    const { db, rows } = fakeDb();
    const app = makeApp(db);

    const res = await app.request('/api/data18/watch-later/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'merge',
        items: [
          {
            itemType: 'scene',
            itemId: '999',
            title: 'Imported Scene',
            url: 'https://www.data18.com/scenes/999',
            isWatched: false,
          },
          {
            itemType: 'movie',
            itemId: 'imported-movie',
            title: 'Imported Movie',
            url: 'https://www.data18.com/movies/imported-movie',
            isWatched: true,
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; imported: number };
    expect(body.ok).toBe(true);
    expect(body.imported).toBe(2);
    expect(rows).toHaveLength(2);
  });
});
