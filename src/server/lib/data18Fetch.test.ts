import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearMemoryCache, fetchData18Html, Data18Error } from './data18Fetch';

interface Row {
  body: string;
  expires_at: number;
}

/** Minimal in-memory stand-in for the parts of D1 the cache uses. */
function fakeDb(initial: Record<string, Row> = {}, options: { failing?: boolean } = {}) {
  const rows = new Map<string, Row>(Object.entries(initial));
  const stats = { selects: 0, inserts: 0 };
  const db = {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            first: async () => {
              if (options.failing) throw new Error('D1 unavailable');
              stats.selects++;
              return rows.get(args[0] as string) ?? null;
            },
            run: async () => {
              if (options.failing) throw new Error('D1 unavailable');
              if (sql.startsWith('INSERT')) {
                stats.inserts++;
                rows.set(args[0] as string, { body: args[1] as string, expires_at: args[2] as number });
              }
              return {};
            },
          };
        },
      };
    },
  } as unknown as D1Database;
  return { db, rows, stats };
}

const PAGE = '<html><head><title>Cory Chase Videos | DATA18</title></head><body>' + 'x'.repeat(200) + '</body></html>';
const urlOf = (path: string) => `https://www.data18.com${path}`;

describe('fetchData18Html persistent cache', () => {
  beforeEach(() => clearMemoryCache());
  afterEach(() => vi.unstubAllGlobals());

  it('stores a fetched page in D1 and serves it after the memory cache is gone', async () => {
    const { db, rows } = fakeDb();
    const fetchMock = vi.fn(async () => new Response(PAGE));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchData18Html('/name/persist-one', { ttlMs: 60_000, db })).toBe(PAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const stored = rows.get(urlOf('/name/persist-one'));
    expect(stored?.body).toBe(PAGE);
    expect(stored!.expires_at).toBeGreaterThan(Date.now());

    // A restarted Worker has an empty memory cache but the same database.
    clearMemoryCache();
    expect(await fetchData18Html('/name/persist-one', { ttlMs: 60_000, db })).toBe(PAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('ignores an expired row while Data18 is healthy and refreshes it', async () => {
    const key = urlOf('/name/persist-refresh');
    const { db, rows } = fakeDb({ [key]: { body: 'old page', expires_at: Date.now() - 1000 } });
    const fetchMock = vi.fn(async () => new Response(PAGE));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchData18Html('/name/persist-refresh', { ttlMs: 60_000, db })).toBe(PAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(rows.get(key)?.body).toBe(PAGE);
  });

  it('serves the expired copy when Data18 is failing', async () => {
    const key = urlOf('/name/persist-stale');
    const { db } = fakeDb({ [key]: { body: 'stale page', expires_at: Date.now() - 60_000 } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));

    expect(await fetchData18Html('/name/persist-stale', { ttlMs: 60_000, db })).toBe('stale page');
  });

  it('does not serve stale data for a page that no longer exists', async () => {
    const key = urlOf('/name/persist-gone');
    const { db } = fakeDb({ [key]: { body: 'stale page', expires_at: Date.now() - 60_000 } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 404 })));

    await expect(fetchData18Html('/name/persist-gone', { ttlMs: 60_000, db })).rejects.toMatchObject({
      status: 404,
    });
  });

  it('does not serve a row older than the stale grace period', async () => {
    const key = urlOf('/name/persist-ancient');
    const { db } = fakeDb({ [key]: { body: 'ancient', expires_at: Date.now() - 25 * 60 * 60_000 } });
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));

    await expect(fetchData18Html('/name/persist-ancient', { ttlMs: 60_000, db })).rejects.toBeInstanceOf(
      Data18Error
    );
  });

  it('does not store oversized pages', async () => {
    const { db, stats } = fakeDb();
    const huge = '<html>' + 'y'.repeat(950_000) + '</html>';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(huge)));

    expect(await fetchData18Html('/name/persist-huge', { ttlMs: 60_000, db })).toBe(huge);
    expect(stats.inserts).toBe(0);
  });

  it('keeps working when the database itself fails', async () => {
    const { db } = fakeDb({}, { failing: true });
    vi.stubGlobal('fetch', vi.fn(async () => new Response(PAGE)));

    expect(await fetchData18Html('/name/persist-broken-db', { ttlMs: 60_000, db })).toBe(PAGE);
  });

  it('still works without a database binding', async () => {
    const fetchMock = vi.fn(async () => new Response(PAGE));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchData18Html('/name/persist-no-db', { ttlMs: 60_000 })).toBe(PAGE);
    expect(await fetchData18Html('/name/persist-no-db', { ttlMs: 60_000 })).toBe(PAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
