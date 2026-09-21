import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { AppEnv } from '../app';
import type {
  Data18SearchResult,
  Data18ScenesResponse,
  Data18MoviesResponse,
  Data18SearchResponse,
  Data18PerformerExtra,
  Data18PornPicsResult,
} from '../../shared/data18Types';
import {
  Data18Error,
  cacheControl,
  fetchData18Html,
  isValidMovieSlug,
  isValidSceneId,
  normalizeEntityPath,
} from '../lib/data18Fetch';
import {
  deriveEntityPageTemplate,
  extractLoadPagesPath,
  extractPageTemplate,
  parseEntityDetailFromHtml,
  parseLiveSearchResults,
  parseMovieDetail,
  parseMoviesFromData18,
  parsePerformerPairings,
  parsePerformerStudios,
  parsePerformerTags,
  parseSceneDetail,
  parseScenesFromData18,
  parseTotalFound,
  topBy,
} from '../lib/data18Parsers';
import { extractGalleryCards, extractProfileGallery, slugifyName } from './crawler';
import { data18FavoritesRouter } from './data18Favorites';

// Re-exported so the parsers can be unit-tested through this module.
export * from '../lib/data18Parsers';

export const data18Router = new Hono<AppEnv>();
data18Router.route('/', data18FavoritesRouter);

const TTL_LISTING = 5 * 60_000;
const TTL_ENTITY = 15 * 60_000;
const TTL_DETAIL = 60 * 60_000;
const TTL_SEARCH = 10 * 60_000;
const MAX_PAGE = 5000;

function fail(c: Context<AppEnv>, err: unknown, fallback: string) {
  if (err instanceof Data18Error) {
    return c.json({ error: err.message }, err.status);
  }
  const msg = err instanceof Error ? err.message : fallback;
  return c.json({ error: msg || fallback }, 502);
}

// All Data18 pages go through the shared fetch layer; when a D1 binding exists it also
// backs the cache so entries survive Worker restarts.
function getHtml(c: Context<AppEnv>, path: string, options: { ttlMs?: number } = {}) {
  return fetchData18Html(path, { ...options, db: c.env?.DB });
}

function cached(c: Context<AppEnv>, ttlMs: number) {
  c.header('Cache-Control', cacheControl(ttlMs));
}

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
});

// 1. GET /api/data18/scenes?page=1
data18Router.get('/scenes', zValidator('query', pageQuery), async (c) => {
  const { page } = c.req.valid('query');
  try {
    const html = await getHtml(
      c,
      `/sys/page.php?t=1&b=2&o=0&html=index&html2=&total=0&doquery=1&spage=${page}&dopage=1`,
      { ttlMs: TTL_LISTING }
    );
    const response: Data18ScenesResponse = {
      page,
      scenes: parseScenesFromData18(html),
      totalFound: parseTotalFound(html, 'Scenes'),
    };
    cached(c, TTL_LISTING);
    return c.json(response);
  } catch (err) {
    return fail(c, err, 'Failed to fetch scenes from Data18');
  }
});

// 2. GET /api/data18/movies?page=1
data18Router.get('/movies', zValidator('query', pageQuery), async (c) => {
  const { page } = c.req.valid('query');
  try {
    const html = await getHtml(
      c,
      `/sys/page.php?t=1&b=3&o=0&html=index&html2=&total=0&doquery=1&spage=${page}&dopage=1`,
      { ttlMs: TTL_LISTING }
    );
    const response: Data18MoviesResponse = {
      page,
      movies: parseMoviesFromData18(html),
      totalFound: parseTotalFound(html, 'Movies'),
    };
    cached(c, TTL_LISTING);
    return c.json(response);
  } catch (err) {
    return fail(c, err, 'Failed to fetch movies from Data18');
  }
});

// 2b. GET /api/data18/upcoming?page=1 — scenes announced for the coming days
data18Router.get('/upcoming', zValidator('query', pageQuery), async (c) => {
  const { page } = c.req.valid('query');
  try {
    const html = await getHtml(
      c,
      `/sys/page.php?t=1&b=2&o=0&html=upcoming&html2=&total=&doquery=1&spage=${page}&dopage=1`,
      { ttlMs: TTL_LISTING }
    );
    const response: Data18ScenesResponse = {
      page,
      scenes: parseScenesFromData18(html),
      totalFound: parseTotalFound(html, 'Scenes'),
    };
    cached(c, TTL_LISTING);
    return c.json(response);
  } catch (err) {
    return fail(c, err, 'Failed to fetch upcoming scenes from Data18');
  }
});

// 3. GET /api/data18/search?q=cory&type=performer
data18Router.get(
  '/search',
  zValidator(
    'query',
    z.object({
      q: z.string().trim().min(1).max(100),
      type: z.enum(['performer', 'studio', 'series', 'all']).default('all'),
    })
  ),
  async (c) => {
    const { q, type } = c.req.valid('query');
    const searchTypes = { performer: 3, studio: 2, series: 4 } as const;
    const search = async (kind: keyof typeof searchTypes) => {
      const k = encodeURIComponent(q);
      const html = await getHtml(
      c,
        `/sys/live.php?key=${k}&key2=${k}&keyfull=${k}&t=${searchTypes[kind]}&b=1&page=1`,
        { ttlMs: TTL_SEARCH }
      );
      return parseLiveSearchResults(html, kind);
    };

    try {
      let results: Data18SearchResult[] = [];
      if (type === 'all') {
        const settled = await Promise.allSettled([
          search('performer'),
          search('studio'),
          search('series'),
        ]);
        for (const r of settled) {
          if (r.status === 'fulfilled') results.push(...r.value);
        }
        // Every lookup failing is an error, not an empty result set.
        if (settled.every((r) => r.status === 'rejected')) {
          throw (settled[0] as PromiseRejectedResult).reason;
        }
      } else {
        results = await search(type);
      }

      const response: Data18SearchResponse = { query: q, type, results };
      cached(c, TTL_SEARCH);
      return c.json(response);
    } catch (err) {
      return fail(c, err, 'Search failed');
    }
  }
);

// 4. GET /api/data18/entity?path=/name/cory-chase&page=2
data18Router.get(
  '/entity',
  zValidator(
    'query',
    pageQuery.extend({
      path: z.string().trim().min(1).max(300),
      tab: z.enum(['scenes', 'movies']).default('scenes'),
    })
  ),
  async (c) => {
    const { path: rawPath, page, tab } = c.req.valid('query');
    const path = normalizeEntityPath(rawPath);
    if (!path) return c.json({ error: 'Invalid Data18 entity path' }, 400);
    // The full movie list lives on the entity's own /movies tab.
    const listPath = tab === 'movies' ? normalizeEntityPath(`${path}/movies`) : path;
    if (!listPath) return c.json({ error: 'This page has no movies tab' }, 404);

    try {
      const firstHtml = await getHtml(c, listPath, { ttlMs: TTL_ENTITY });
      const detail = parseEntityDetailFromHtml(firstHtml, path, page, tab);
      if (tab === 'movies') detail.scenes = [];

      if (page > 1) {
        if (page > detail.totalPages) {
          return c.json({ error: `Page ${page} is out of range (1-${detail.totalPages})` }, 404);
        }
        // Later pages come from the same ajax endpoint the site's own pager uses; its
        // exact parameters are embedded in the entity's filter panel.
        const loadPath = extractLoadPagesPath(firstHtml);
        let template = loadPath ? deriveEntityPageTemplate(loadPath) : null;
        if (!template && loadPath) {
          template = extractPageTemplate(await getHtml(c, loadPath, { ttlMs: TTL_ENTITY }));
        }
        if (!template) {
          return c.json({ error: 'Pagination is not available for this page' }, 404);
        }
        const pageHtml = await getHtml(c, `${template}&spage=${page}&dopage=1`, {
          ttlMs: TTL_ENTITY,
        });
        if (tab === 'movies') detail.movies = parseMoviesFromData18(pageHtml);
        else detail.scenes = parseScenesFromData18(pageHtml);
      }

      cached(c, TTL_ENTITY);
      return c.json(detail);
    } catch (err) {
      return fail(c, err, 'Failed to fetch entity from Data18');
    }
  }
);

// 5. GET /api/data18/performer-extra?slug=cory-chase — studios, most frequent co-stars and tags
data18Router.get(
  '/performer-extra',
  zValidator('query', z.object({ slug: z.string().trim().regex(/^[a-z0-9][a-z0-9._-]*$/i).max(100) })),
  async (c) => {
    const { slug } = c.req.valid('query');
    try {
      const get = (sub: string) => getHtml(c, `/name/${slug}/${sub}`, { ttlMs: TTL_ENTITY });
      const [studios, pairings, tags] = await Promise.allSettled([
        get('studios'),
        get('pairings'),
        get('tags'),
      ]);
      if (studios.status === 'rejected' && pairings.status === 'rejected' && tags.status === 'rejected') {
        throw studios.reason;
      }

      const response: Data18PerformerExtra = {
        slug,
        studios: studios.status === 'fulfilled' ? topBy(parsePerformerStudios(studios.value), 20) : [],
        pairings: pairings.status === 'fulfilled' ? topBy(parsePerformerPairings(pairings.value), 20) : [],
        tags: tags.status === 'fulfilled' ? topBy(parsePerformerTags(tags.value), 30) : [],
      };
      cached(c, TTL_ENTITY);
      return c.json(response);
    } catch (err) {
      return fail(c, err, 'Failed to fetch performer details from Data18');
    }
  }
);

// 6. GET /api/data18/scene/3137314
data18Router.get('/scene/:id', async (c) => {
  const id = c.req.param('id');
  if (!isValidSceneId(id)) return c.json({ error: 'Invalid scene id' }, 400);
  try {
    const html = await getHtml(c, `/scenes/${id}`, { ttlMs: TTL_DETAIL });
    cached(c, TTL_DETAIL);
    return c.json(parseSceneDetail(html, id));
  } catch (err) {
    return fail(c, err, 'Failed to fetch scene from Data18');
  }
});

// 7. GET /api/data18/movie/1213399-tanya-tate-is-milfwoman
data18Router.get('/movie/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (!isValidMovieSlug(slug)) return c.json({ error: 'Invalid movie id' }, 400);
  try {
    const html = await getHtml(c, `/movies/${slug}`, { ttlMs: TTL_DETAIL });
    cached(c, TTL_DETAIL);
    return c.json(parseMovieDetail(html, slug));
  } catch (err) {
    return fail(c, err, 'Failed to fetch movie from Data18');
  }
});

// ---------------------------------------------------------------------------
// PornPics lookup by performer name
// ---------------------------------------------------------------------------

const PORNPICS_ORIGIN = 'https://www.pornpics.com';
const PORNPICS_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchPornPicsPage(url: string): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: PORNPICS_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return { html: await res.text(), finalUrl: res.url || url };
  } catch {
    return null;
  }
}

// GET /api/data18/pornpics?name=Cory Chase
data18Router.get(
  '/pornpics',
  zValidator('query', z.object({ name: z.string().trim().min(2).max(80) })),
  async (c) => {
    const { name } = c.req.valid('query');
    const slug = slugifyName(name);
    if (!slug) return c.json({ error: 'Invalid performer name' }, 400);

    const profileUrl = `${PORNPICS_ORIGIN}/pornstars/${slug}/`;
    const searchUrl = `${PORNPICS_ORIGIN}/?q=${encodeURIComponent(name)}`;
    const result: Data18PornPicsResult = {
      name,
      source: 'none',
      pageUrl: searchUrl,
      searchUrl,
      avatarUrl: '',
      images: [],
      galleries: [],
    };

    // 1) The performer's own page. 2) The site search, which redirects to the page when
    // the name matches exactly and otherwise lists matching galleries.
    const attempts: { url: string; source: 'profile' | 'search' }[] = [
      { url: profileUrl, source: 'profile' },
      { url: searchUrl, source: 'search' },
    ];
    for (const attempt of attempts) {
      const page = await fetchPornPicsPage(attempt.url);
      if (!page) continue;
      const { avatarUrl, images } = extractProfileGallery(page.html, page.finalUrl);
      if (images.length === 0) continue;
      result.source = /\/pornstars\//.test(page.finalUrl) ? 'profile' : attempt.source;
      result.pageUrl = page.finalUrl;
      result.avatarUrl = avatarUrl;
      result.images = images;
      result.galleries = extractGalleryCards(page.html, page.finalUrl);
      break;
    }

    cached(c, TTL_ENTITY);
    return c.json(result);
  }
);
