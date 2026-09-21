import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearMemoryCache } from '../lib/data18Fetch';
import { countNewScenes, data18FavoritesRouter } from './data18Favorites';

interface Row {
  id: number;
  path: string;
  kind: string;
  slug: string;
  name: string;
  last_seen_scene_id: string | null;
  created_at: string;
}

/** In-memory stand-in for the D1 statements the favorites routes issue. */
function fakeDb() {
  const rows: Row[] = [];
  let nextId = 1;

  function run(sql: string, args: unknown[]) {
    if (sql.startsWith('INSERT OR IGNORE')) {
      const [path, kind, slug, name, last] = args as [string, string, string, string, string | null];
      if (!rows.some((r) => r.path === path)) {
        rows.push({
          id: nextId++,
          path,
          kind,
          slug,
          name,
          last_seen_scene_id: last,
          created_at: `2026-01-01T00:00:0${rows.length}.000Z`,
        });
      }
    } else if (sql.startsWith('DELETE')) {
      const index = rows.findIndex((r) => r.path === args[0]);
      if (index >= 0) rows.splice(index, 1);
    } else if (sql.startsWith('UPDATE')) {
      const row = rows.find((r) => r.path === args[1]);
      if (row) row.last_seen_scene_id = args[0] as string;
    }
    return {};
  }

  function statement(sql: string, args: unknown[] = []) {
    return {
      bind: (...bound: unknown[]) => statement(sql, bound),
      first: async () => {
        if (sql.includes('COUNT(*)')) return { n: rows.length };
        if (sql.includes('WHERE path = ?')) return rows.find((r) => r.path === args[0]) ?? null;
        return null;
      },
      all: async () => {
        const sorted = [...rows].sort((a, b) => b.id - a.id);
        const limit = sql.includes('LIMIT ?') ? (args[0] as number) : sorted.length;
        return { results: sorted.slice(0, limit) };
      },
      run: async () => run(sql, args),
      // Exposed for db.batch().
      exec: () => run(sql, args),
    };
  }

  const db = {
    prepare: (sql: string) => statement(sql),
    batch: async (statements: { exec: () => unknown }[]) => statements.map((s) => s.exec()),
  } as unknown as D1Database;

  return { db, rows };
}

const entityHtml = (name: string, sceneIds: string[]) => `
  <html><head><title>${name} Videos | DATA18</title></head><body><h1>${name}</h1>
  ${sceneIds
    .map(
      (id) => `<div id="item${id}">
        <a href="https://www.data18.com/scenes/${id}"><img src="https://cdn.dt18.com/media/t/3/scenes/1/0/${id}.jpg" /></a>
        <a href="https://www.data18.com/scenes/${id}" class="gen12 bold">Scene ${id}</a>
      </div>`
    )
    .join('')}
  </body></html>`;

describe('countNewScenes', () => {
  const scenes = [{ id: '5' }, { id: '4' }, { id: '3' }];

  it('counts the scenes listed before the last seen one', () => {
    expect(countNewScenes(scenes, '4')).toBe(1);
    expect(countNewScenes(scenes, '5')).toBe(0);
  });

  it('treats everything as new when the last seen scene is no longer listed', () => {
    expect(countNewScenes(scenes, '99')).toBe(3);
  });

  it('has no baseline without a last seen scene', () => {
    expect(countNewScenes(scenes, null)).toBe(0);
  });
});

describe('data18 favorites routes', () => {
  beforeEach(() => clearMemoryCache());
  afterEach(() => vi.unstubAllGlobals());

  const jsonInit = (method: string, body: unknown) => ({
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  it('answers 503 without a database', async () => {
    expect((await data18FavoritesRouter.request('/favorites')).status).toBe(503);
    expect((await data18FavoritesRouter.request('/feed')).status).toBe(503);
  });

  it('adds a favorite using the entity page for its name, type and baseline scene', async () => {
    const { db, rows } = fakeDb();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(entityHtml('Fav Performer One', ['30', '20', '10']))));

    const res = await data18FavoritesRouter.request(
      '/favorites',
      jsonInit('POST', { path: 'https://www.data18.com/name/fav-performer-one' }),
      { DB: db }
    );
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      path: '/name/fav-performer-one',
      kind: 'performer',
      slug: 'fav-performer-one',
      name: 'Fav Performer One',
      lastSeenSceneId: '30',
    });
    expect(rows).toHaveLength(1);

    // Adding again is idempotent and does not need Data18 any more.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('should not be called', { status: 500 })));
    const again = await data18FavoritesRouter.request(
      '/favorites',
      jsonInit('POST', { path: '/name/fav-performer-one' }),
      { DB: db }
    );
    expect(again.status).toBe(200);
    expect(rows).toHaveLength(1);
  });

  it('rejects paths outside Data18 entity pages without fetching', async () => {
    const { db } = fakeDb();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    for (const bad of ['https://evil.example/name/x', '/sys/page.php?t=1', '/name/../x']) {
      const res = await data18FavoritesRouter.request('/favorites', jsonInit('POST', { path: bad }), { DB: db });
      expect(res.status, bad).toBe(400);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lists and removes favorites', async () => {
    const { db, rows } = fakeDb();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(entityHtml('Fav Performer Two', ['9']))));
    await data18FavoritesRouter.request('/favorites', jsonInit('POST', { path: '/name/fav-performer-two' }), {
      DB: db,
    });

    const list = (await (await data18FavoritesRouter.request('/favorites', {}, { DB: db })).json()) as {
      favorites: { path: string }[];
    };
    expect(list.favorites.map((f) => f.path)).toEqual(['/name/fav-performer-two']);

    const del = await data18FavoritesRouter.request(
      '/favorites?path=' + encodeURIComponent('/name/fav-performer-two'),
      { method: 'DELETE' },
      { DB: db }
    );
    expect(del.status).toBe(200);
    expect(rows).toHaveLength(0);
  });

  it('builds a feed with new counts and marks scenes as seen', async () => {
    const { db, rows } = fakeDb();
    // Followed when the newest scene was 20; two newer scenes have appeared since.
    vi.stubGlobal('fetch', vi.fn(async () => new Response(entityHtml('Fav Performer Three', ['40', '30', '20', '10']))));
    rows.push({
      id: 100,
      path: '/name/fav-performer-three',
      kind: 'performer',
      slug: 'fav-performer-three',
      name: 'Fav Performer Three',
      last_seen_scene_id: '20',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const feed = (await (await data18FavoritesRouter.request('/feed', {}, { DB: db })).json()) as {
      totalFavorites: number;
      items: { newCount: number; newestSceneId: string; scenes: { id: string }[]; error?: string }[];
    };
    expect(feed.totalFavorites).toBe(1);
    expect(feed.items[0].newCount).toBe(2);
    expect(feed.items[0].newestSceneId).toBe('40');
    expect(feed.items[0].scenes.map((s) => s.id)).toEqual(['40', '30', '20', '10']);

    const seen = await data18FavoritesRouter.request(
      '/favorites/seen',
      jsonInit('POST', { items: [{ path: '/name/fav-performer-three', sceneId: '40' }] }),
      { DB: db }
    );
    expect(seen.status).toBe(200);
    expect(rows[0].last_seen_scene_id).toBe('40');
  });

  it('reports a favorite whose page fails instead of failing the whole feed', async () => {
    const { db, rows } = fakeDb();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));
    rows.push({
      id: 1,
      path: '/name/fav-performer-gone',
      kind: 'performer',
      slug: 'fav-performer-gone',
      name: 'Gone',
      last_seen_scene_id: '1',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    const feed = (await (await data18FavoritesRouter.request('/feed', {}, { DB: db })).json()) as {
      items: { error?: string; scenes: unknown[] }[];
    };
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].error).toBeTruthy();
    expect(feed.items[0].scenes).toEqual([]);
  });

  it('validates the seen payload', async () => {
    const { db } = fakeDb();
    const res = await data18FavoritesRouter.request(
      '/favorites/seen',
      jsonInit('POST', { items: [{ path: '/name/x', sceneId: 'not-a-number' }] }),
      { DB: db }
    );
    expect(res.status).toBe(400);
  });
});
