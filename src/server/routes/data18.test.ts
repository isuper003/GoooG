import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  data18Router,
  parseScenesFromData18,
  parseMoviesFromData18,
  parseLiveSearchResults,
  parseEntityDetailFromHtml,
  parseEntityStats,
  parseTotalFound,
  parseSceneDetail,
  parseMovieDetail,
  parsePerformerPairings,
  parsePerformerStudios,
  parsePerformerTags,
  deriveEntityPageTemplate,
  extractLoadPagesPath,
  extractPageTemplate,
  topBy,
} from './data18';
import { normalizeEntityPath, isValidMovieSlug, isValidSceneId } from '../lib/data18Fetch';
import {
  SCENE_HTML,
  MOVIE_HTML,
  ENTITY_HTML,
  LOAD_HTML,
  LOADPATH_HTML,
  PAIRINGS_HTML,
  TAGS_HTML,
  STUDIOS_HTML,
  HOME_HTML,
} from '../lib/__fixtures__/data18Fixtures';

describe('Data18 Parsers (synthetic markup)', () => {
  describe('parseScenesFromData18', () => {
    it('parses scene cells with id, title, image, date, cast, and studio', () => {
      const mockHtml = `
        <div id="item3137314">
          <span class="gensmall"><b>#518281</b></span> Sept 21, 2026
          <a href="https://www.data18.com/scenes/3137314#image1901" title="31 pictures">31</a>
          <a href="https://www.data18.com/scenes/3137314"><img src="https://cdn.dt18.com/media/t/3/scenes/3/6/137314.jpg" /></a>
          <a href="https://www.data18.com/scenes/3137314" class="gen12 bold">Scene 5 - Rough Love 8</a>
          <p>Cast: <a href="https://www.data18.com/name/alia-starr">Alia Starr</a></p>
          <p>Studio: <a href="https://www.data18.com/studios/evil-angel">Evil Angel</a></p>
        </div>
      `;

      const scenes = parseScenesFromData18(mockHtml);
      expect(scenes).toHaveLength(1);
      expect(scenes[0].id).toBe('3137314');
      expect(scenes[0].title).toBe('Scene 5 - Rough Love 8');
      expect(scenes[0].imageUrl).toBe('https://cdn.dt18.com/media/t/3/scenes/3/6/137314.jpg');
      expect(scenes[0].date).toBe('Sept 21, 2026');
      expect(scenes[0].cast).toEqual([
        { name: 'Alia Starr', slug: 'alia-starr', url: 'https://www.data18.com/name/alia-starr' },
      ]);
      expect(scenes[0].studio).toEqual({
        name: 'Evil Angel',
        slug: 'evil-angel',
        url: 'https://www.data18.com/studios/evil-angel',
      });
      expect(scenes[0].photosCount).toBe('31');
    });

    it('uses the lazy-loaded data-src instead of the pixel placeholder', () => {
      const html = `
        <div id="item1">
          <a href="https://www.data18.com/scenes/1"><img class="lazy" src="https://cdn.dt18.com/images/pixel.jpg" data-src="https://cdn.dt18.com/media/t/3/scenes/1/0/1.jpg" /></a>
          <a href="https://www.data18.com/scenes/1" class="gen12 bold">Lazy</a>
        </div>`;
      expect(parseScenesFromData18(html)[0].imageUrl).toBe('https://cdn.dt18.com/media/t/3/scenes/1/0/1.jpg');
    });

    it('parses scenes whose links carry a title slug after the id', () => {
      const html = `
        <div id="item3">
          <a href="https://www.data18.com/scenes/3137398-a-messy-detention#trailer" title="play scene trailer">t</a>
          <a href="https://www.data18.com/scenes/3137398-a-messy-detention#image1901" title="31 pictures/videostills">31</a>
          <a href="https://www.data18.com/scenes/3137398-a-messy-detention" title="A Messy Detention"><img class="yborder" src="https://cdn.dt18.com/media/t/3/scenes/3/6/137398.jpg" alt="A Messy Detention" /></a>
          <a href="https://www.data18.com/scenes/3137398-a-messy-detention" class="gen12 bold">A Messy Detention</a>
          <p>Cast: <a href="https://www.data18.com/name/coco-lovelock">Coco&nbsp;Lovelock</a></p>
          <p>Studio: <a href="https://www.data18.com/studios/pure-taboo">Pure Taboo</a></p>
        </div>`;
      const [scene] = parseScenesFromData18(html);
      expect(scene).toMatchObject({
        id: '3137398',
        url: 'https://www.data18.com/scenes/3137398-a-messy-detention',
        title: 'A Messy Detention',
        imageUrl: 'https://cdn.dt18.com/media/t/3/scenes/3/6/137398.jpg',
      });
      expect(scene.cast[0].slug).toBe('coco-lovelock');
    });

    it('does not return an empty string as the date', () => {
      const html = `
        <div id="item1">
          <span class="gensmall"><b>#5</b></span>
          <a href="https://www.data18.com/scenes/1" class="gen12 bold">No date here Oct 15, 2026</a>
        </div>`;
      expect(parseScenesFromData18(html)[0].date).toBe('Oct 15, 2026');
    });
  });

  describe('parseMoviesFromData18', () => {
    it('parses movie cells with id, slug, title, cover, studio, and date', () => {
      const mockHtml = `
        <div id="mitem1128696">
          <span class="gensmall"><b>#64666</b></span> 2026/12
          <a href="https://www.data18.com/movies/1128696-lesbian-love-stories-11#image1901" title="247 pictures">247</a>
          <a href="https://www.data18.com/movies/1128696-lesbian-love-stories-11"><img src="https://cdn.dt18.com/covers/2/6/1128696-lesbian-love-stories-11.jpg" alt="Lesbian Love Stories #11" /></a>
          <p><a href="https://www.data18.com/studios/girlfriends-films">Girlfriends Films</a></p>
        </div>
      `;

      const movies = parseMoviesFromData18(mockHtml);
      expect(movies).toHaveLength(1);
      expect(movies[0].id).toBe('1128696');
      expect(movies[0].slug).toBe('1128696-lesbian-love-stories-11');
      expect(movies[0].title).toBe('Lesbian Love Stories #11');
      expect(movies[0].coverUrl).toBe('https://cdn.dt18.com/covers/2/6/1128696-lesbian-love-stories-11.jpg');
      expect(movies[0].date).toBe('2026/12');
      expect(movies[0].studio?.slug).toBe('girlfriends-films');
      expect(movies[0].photosCount).toBe('247');
    });
  });

  describe('parseLiveSearchResults', () => {
    it('extracts search results from live search cards', () => {
      const mockHtml = `
        <a id="pslink1" href="https://www.data18.com/name/cory-chase" title="Cory Chase">
          <img src="https://cdn.dt18.com/images/names/med/cory-chase.jpg" />
          <span>Last Update:</span> <span>October 15, 2026</span>
          <p>898 Scenes, 169 Movies</p>
        </a>
      `;

      const results = parseLiveSearchResults(mockHtml, 'performer');
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: 'Cory Chase',
        slug: 'cory-chase',
        type: 'performer',
        avatarUrl: 'https://cdn.dt18.com/images/names/med/cory-chase.jpg',
        scenesCount: '898',
        moviesCount: '169',
        lastUpdate: 'October 15, 2026',
      });
    });
  });

  describe('parseEntityDetailFromHtml', () => {
    it('extracts entity details for a performer', () => {
      const mockHtml = `
        <html>
          <head><title>Cory Chase Videos | DATA18</title></head>
          <body>
            <h1>Cory Chase</h1>
            <div id="item1215967">
              <a href="https://www.data18.com/scenes/1215967"><img src="https://cdn.dt18.com/media/t/3/scenes/1/9/215967.jpg" /></a>
              <a href="https://www.data18.com/scenes/1215967" class="gen12 bold">Taboo Heat Scene</a>
            </div>
            <div id="mitem1213399">
              <a href="https://www.data18.com/movies/1213399-tanya-tate"><img src="https://cdn.dt18.com/covers/2/8/1213399.jpg" alt="Tanya Tate is Milfwoman" /></a>
            </div>
          </body>
        </html>
      `;

      const detail = parseEntityDetailFromHtml(mockHtml, '/name/cory-chase');
      expect(detail.name).toBe('Cory Chase');
      expect(detail.slug).toBe('cory-chase');
      expect(detail.path).toBe('/name/cory-chase');
      expect(detail.type).toBe('performer');
      expect(detail.avatarUrl).toBe('https://cdn.dt18.com/images/names/big/cory-chase.jpg');
      expect(detail.scenes).toHaveLength(1);
      expect(detail.movies).toHaveLength(1);
      expect(detail.totalPages).toBe(1);
    });

    it('uses the last path segment as slug for a series', () => {
      const detail = parseEntityDetailFromHtml('<h1>Rough Love</h1>', '/studios/evil-angel/movie-series-rough-love');
      expect(detail.type).toBe('series');
      expect(detail.slug).toBe('movie-series-rough-love');
    });
  });
});

describe('Data18 Parsers (real page snapshots)', () => {
  it('reads the total count from a listing header', () => {
    expect(parseTotalFound(HOME_HTML, 'Scenes')).toBe(518281);
    expect(parseTotalFound(HOME_HTML, 'Movies')).toBeUndefined();
  });

  it('parses an entity page with sidebar stats and paging', () => {
    const detail = parseEntityDetailFromHtml(ENTITY_HTML, '/name/cory-chase');
    expect(detail.name).toBe('Cory Chase');
    expect(detail.stats).toMatchObject({ scenes: 898, movies: 173, vr: 13, pairings: 345, studios: 135, tags: 97 });
    expect(detail.scenesCount).toBe(898);
    expect(detail.moviesCount).toBe(173);
    expect(detail.totalPages).toBe(30);
    expect(detail.scenes.length).toBeGreaterThan(0);
    for (const scene of detail.scenes) {
      expect(scene.imageUrl).toMatch(/^https:\/\/cdn\.dt18\.com\/media\/t\//);
    }
    expect(detail.scenes[0].date).toBeTruthy();
  });

  it('parses sidebar counters', () => {
    expect(parseEntityStats('<b>Scenes</b> - 18,502 </div><b>Movies</b> - 3,754 </div>')).toEqual({
      scenes: 18502,
      movies: 3754,
    });
  });

  it('finds the paging endpoint of an entity page', () => {
    expect(extractLoadPagesPath(LOADPATH_HTML)).toBe('/sys/load/pages/2/1/0/cory-chase/null/1/0');
    expect(extractPageTemplate(LOAD_HTML)).toBe(
      '/sys/page.php?t=2&b=1&o=0&html=cory-chase&html2=&total=&doquery=1'
    );
    expect(extractPageTemplate('<p>nothing</p>')).toBeNull();
    // Deriving the template from the load path gives the same endpoint as the panel's script.
    expect(deriveEntityPageTemplate('/sys/load/pages/2/1/0/cory-chase/null/1/0')).toBe(
      extractPageTemplate(LOAD_HTML)
    );
    expect(deriveEntityPageTemplate('/sys/load/other')).toBeNull();
  });

  it('parses a scene detail page', () => {
    const scene = parseSceneDetail(SCENE_HTML, '3137314');
    expect(scene.title).toBe('Alia Starr in Rough Love 8');
    expect(scene.imageUrl).toMatch(/\/media\/scenes\/.+137314/);
    expect(scene.releaseDate).toBe('September 21, 2026');
    expect(scene.duration).toBe('39:49');
    expect(scene.photosCount).toBe(31);
    expect(scene.studio).toMatchObject({ slug: 'evil-angel', name: 'Evil Angel' });
    expect(scene.series).toMatchObject({ name: 'Rough Love' });
    expect(scene.movie).toMatchObject({ id: '1213478', slug: '1213478-rough-love-8', sceneNumber: '5 / 5' });
    expect(scene.cast.map((c) => c.slug)).toEqual(['alia-starr', 'angelo-godshack']);
    expect(scene.cast[0].avatarUrl).toBe('https://cdn.dt18.com/images/names/med/alia-starr.jpg');
    expect(scene.tags.map((t) => t.slug)).toContain('creampie');
    expect(scene.tags.find((t) => t.slug === 'brunettes')?.category).toBe('Hair');
    expect(scene.siblingScenes.length).toBeGreaterThan(1);
    // The "previous scene" arrow must not be mistaken for a sibling entry.
    expect(scene.siblingScenes[0].label).toBe('Scene 1');
  });

  it('parses a movie detail page', () => {
    const movie = parseMovieDetail(MOVIE_HTML, '1213399-tanya-tate-is-milfwoman');
    expect(movie.id).toBe('1213399');
    expect(movie.title).toBe('Tanya Tate is Milfwoman');
    expect(movie.year).toBe('2026');
    expect(movie.duration).toBe('2 hours, 6 minutes');
    expect(movie.scenesCount).toBe(4);
    expect(movie.photosCount).toBe(127);
    expect(movie.studio).toMatchObject({ slug: 'elegant-angel' });
    expect(movie.directors.map((d) => d.slug)).toEqual(['claudia-ross']);
    expect(movie.coverUrl).toMatch(/\/covers\/\d+\/\d+\/1213399/);
    expect(movie.backCoverUrl).toMatch(/\/covers\/\d+\/back\//);
    expect(movie.description).toContain('All hail the Queen!');
    expect(movie.description).not.toMatch(/<|Show more/);
    expect(movie.description).toContain("Isiah Maxwell's legendary");
    expect(movie.description).not.toMatch(/\s[.,]/);
    expect(movie.cast.map((c) => c.slug)).toEqual(expect.arrayContaining(['tanya-tate', 'cory-chase']));
    expect(movie.scenes.length).toBeGreaterThanOrEqual(2);
    expect(movie.scenes[0]).toMatchObject({ id: '3137326', title: 'Scene #1' });
    expect(movie.scenes[0].imageUrl).toMatch(/\/media\/t\//);
    expect(movie.scenes[0].cast).toEqual(['Tanya Tate', 'Axel Haze']);
  });

  it('parses performer pairings, studios and tags', () => {
    const pairings = parsePerformerPairings(PAIRINGS_HTML);
    expect(pairings.length).toBeGreaterThan(0);
    expect(pairings[0]).toMatchObject({ slug: 'gigi-sweets', scenes: 17 });
    expect(pairings[0].imageUrl).toBe('https://cdn.dt18.com/images/names/med/gigi-sweets.jpg');

    const studios = parsePerformerStudios(STUDIOS_HTML);
    expect(studios.length).toBeGreaterThan(1);
    // The first row is a <button> row rather than an anchor row; both must parse.
    expect(studios[0]).toMatchObject({ name: 'A Girl Knows', slug: 'a-girl-knows', scenes: 1 });
    expect(studios[1]).toMatchObject({ name: 'A POV Story', slug: 'a-pov-story', scenes: 2 });

    const tags = parsePerformerTags(TAGS_HTML);
    expect(tags[0]).toMatchObject({ name: 'Anal', scenes: 233, movies: 24 });
    expect(topBy(tags, 1)[0].name).toBe('Anal');
  });
});

describe('normalizeEntityPath', () => {
  it('accepts entity paths and same-site URLs', () => {
    expect(normalizeEntityPath('/name/cory-chase')).toBe('/name/cory-chase');
    expect(normalizeEntityPath('name/cory-chase/')).toBe('/name/cory-chase');
    expect(normalizeEntityPath('https://www.data18.com/studios/evil-angel')).toBe('/studios/evil-angel');
    expect(normalizeEntityPath('https://data18.com/studios/evil-angel/movie-series-rough-love')).toBe(
      '/studios/evil-angel/movie-series-rough-love'
    );
    expect(normalizeEntityPath('/name/cory-chase?x=1#y')).toBe('/name/cory-chase');
  });

  it('rejects other hosts, other paths and traversal', () => {
    for (const bad of [
      'https://evil.example/name/x',
      'https://www.data18.com.evil.example/name/x',
      'https://user:pw@www.data18.com/name/x',
      'https://www.data18.com:8443/name/x',
      '//evil.example/name/x',
      'ftp://www.data18.com/name/x',
      'javascript:alert(1)',
      '/sys/page.php?t=1',
      '/scenes/123',
      '/name/../sys/contact',
      '/name/%2e%2e/x',
      '/name//x',
      '/name/',
      '',
    ]) {
      expect(normalizeEntityPath(bad), bad).toBeNull();
    }
  });

  it('validates scene ids and movie slugs', () => {
    expect(isValidSceneId('3137314')).toBe(true);
    expect(isValidSceneId('31a')).toBe(false);
    expect(isValidMovieSlug('1213399-tanya-tate-is-milfwoman')).toBe(true);
    expect(isValidMovieSlug('1213399')).toBe(true);
    expect(isValidMovieSlug('../x')).toBe(false);
    expect(isValidMovieSlug('abc')).toBe(false);
  });
});

describe('data18 routes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects entity paths that point outside data18 without fetching', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const res = await data18Router.request('/entity?path=' + encodeURIComponent('http://169.254.169.254/latest'));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects invalid scene and movie ids', async () => {
    expect((await data18Router.request('/scene/abc')).status).toBe(400);
    expect((await data18Router.request('/movie/..%2F..')).status).toBe(400);
  });

  it('serves an entity page from Data18 markup', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(ENTITY_HTML, { status: 200 }))
    );

    const res = await data18Router.request('/entity?path=/name/route-test-performer');
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toMatch(/max-age=\d+/);
    const body = (await res.json()) as { name: string; totalPages: number; scenesCount: number; tab: string };
    expect(body).toMatchObject({ name: 'Cory Chase', totalPages: 30, scenesCount: 898, tab: 'scenes' });
  });

  it('lists and pages the full movie tab of an entity', async () => {
    const movieItem = (n: number) => `
      <div id="mitem${n}">
        <a href="https://www.data18.com/movies/${1000 + n}-movie-${n}"><img src="https://cdn.dt18.com/covers/1/0/${1000 + n}.jpg" alt="Movie ${n}" /></a>
      </div>`;
    const moviesTab = `<h1>Movie Tab Performer</h1><input class="spagemanual" type="number" min="1" max="6">
      <script>$("#finalfilter").load("/sys/load/pages/2/3/0/movie-tab-performer/null/0/0");</script>
      ${movieItem(1)}${movieItem(2)}`;
    const nextPage = movieItem(31) + movieItem(32);
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.endsWith('/name/movie-tab-performer/movies')) return new Response(moviesTab);
      if (u.includes('/sys/page.php')) return new Response(nextPage);
      return new Response('unexpected ' + u, { status: 500 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = await data18Router.request('/entity?path=/name/movie-tab-performer&tab=movies');
    const firstBody = (await first.json()) as { tab: string; totalPages: number; scenes: unknown[]; movies: { id: string }[] };
    expect(firstBody).toMatchObject({ tab: 'movies', totalPages: 6, scenes: [] });
    expect(firstBody.movies.map((m) => m.id)).toEqual(['1001', '1002']);

    const second = await data18Router.request('/entity?path=/name/movie-tab-performer&tab=movies&page=2');
    const secondBody = (await second.json()) as { page: number; movies: { id: string }[] };
    expect(secondBody.page).toBe(2);
    expect(secondBody.movies.map((m) => m.id)).toEqual(['1031', '1032']);
    const pagingUrl = String(fetchMock.mock.calls.map((c) => String(c[0])).find((u) => u.includes('/sys/page.php')));
    expect(pagingUrl).toContain('t=2&b=3&o=0&html=movie-tab-performer');
    expect(pagingUrl).toContain('spage=2');
  });

  it('lists upcoming scenes with the total from the page header', async () => {
    const item = `<div id="item1"><a href="https://www.data18.com/scenes/555"><img src="https://cdn.dt18.com/media/t/3/scenes/1/0/555.jpg" /></a>
      <a href="https://www.data18.com/scenes/555" class="gen12 bold">Upcoming One</a></div>`;
    const fetchMock = vi.fn(async (_url: string | URL | Request) => new Response(`<b>84 Scenes</b>${item}`));
    vi.stubGlobal('fetch', fetchMock);

    const res = await data18Router.request('/upcoming?page=2');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { page: number; totalFound: number; scenes: { id: string }[] };
    expect(body).toMatchObject({ page: 2, totalFound: 84 });
    expect(body.scenes.map((s) => s.id)).toEqual(['555']);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('html=upcoming');
    expect(url).toContain('spage=2');
  });

  it('maps an upstream 404 to a 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 404 }))
    );
    const res = await data18Router.request('/scene/999999999');
    expect(res.status).toBe(404);
  });

  it('reports the access-gate page instead of parsing it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html><head><title>data18.com (+18) - ADULTS ONLY!</title></head></html>'))
    );
    const res = await data18Router.request('/scene/888888888');
    expect(res.status).toBe(502);
    expect(((await res.json()) as { error: string }).error).toMatch(/access-gate/);
  });

  it('returns the PornPics result for a performer name', async () => {
    const profile = `
      <html><body>
        <a href="/galleries/one/"><img src="https://cdni.pornpics.com/460/7/1/one.jpg" /></a>
        <a href="/galleries/two/"><img src="https://cdni.pornpics.com/460/7/2/two.jpg" /></a>
      </body></html>`;
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const res = new Response(profile, { status: 200 });
      Object.defineProperty(res, 'url', { value: String(url) });
      return res;
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await data18Router.request('/pornpics?name=' + encodeURIComponent('Cory Chase'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { source: string; pageUrl: string; images: string[] };
    expect(body.source).toBe('profile');
    expect(body.pageUrl).toBe('https://www.pornpics.com/pornstars/cory-chase/');
    expect(body.images).toEqual([
      'https://cdni.pornpics.com/1280/7/1/one.jpg',
      'https://cdni.pornpics.com/1280/7/2/two.jpg',
    ]);
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://www.pornpics.com/pornstars/cory-chase/');
  });

  it('falls back to the PornPics search when the performer page has no images', async () => {
    const results = '<a href="/galleries/x/"><img src="https://cdni.pornpics.com/460/9/x.jpg" /></a>';
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      const res = u.includes('/pornstars/') ? new Response('gone', { status: 404 }) : new Response(results);
      Object.defineProperty(res, 'url', { value: u });
      return res;
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await data18Router.request('/pornpics?name=' + encodeURIComponent('Some Name'));
    const body = (await res.json()) as { source: string; pageUrl: string; images: string[] };
    expect(body.source).toBe('search');
    expect(body.pageUrl).toBe('https://www.pornpics.com/?q=Some%20Name');
    expect(body.images).toHaveLength(1);
  });
});
