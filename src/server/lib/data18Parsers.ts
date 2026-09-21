import type {
  Data18Scene,
  Data18Movie,
  Data18SearchResult,
  Data18EntityDetail,
  Data18EntityStats,
  Data18Named,
  Data18SceneDetail,
  Data18MovieDetail,
  Data18Tag,
  Data18CastMember,
  Data18StudioRef,
} from '../../shared/data18Types';

const ORIGIN = 'https://www.data18.com';
const CDN = 'https://cdn.dt18.com';

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
  '&apos;': "'",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(?:nbsp|amp|lt|gt|quot|apos|#0?39);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

export function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function parseCount(s: string | undefined | null): number | undefined {
  if (!s) return undefined;
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function isPlaceholderImage(url: string): boolean {
  return /pixel\.jpg|no_prev|blank|1px/i.test(url);
}

/** Real image URL of an <img> tag: Data18 lazy-loads with `data-src` behind a pixel `src`. */
function imgTagSrc(tag: string): string {
  const dataSrc = tag.match(/data-src="([^"]+)"/i)?.[1];
  if (dataSrc && !isPlaceholderImage(dataSrc)) return dataSrc;
  const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
  if (src && !isPlaceholderImage(src)) return src;
  return '';
}

/** First real image in an HTML chunk. */
function firstImage(html: string, preferPattern?: RegExp): string {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  const urls = tags.map(imgTagSrc).filter(Boolean);
  if (preferPattern) {
    const preferred = urls.find((u) => preferPattern.test(u));
    if (preferred) return preferred;
  }
  return urls[0] ?? '';
}

function performerAvatar(slug: string): string {
  return `${CDN}/images/names/med/${slug}.jpg`;
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractCast(html: string): Data18CastMember[] {
  const cast: Data18CastMember[] = [];
  const seen = new Set<string>();
  const re = /<a href="https:\/\/www\.data18\.com\/name\/([^"\/?#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(re)) {
    const slug = m[1];
    const name = stripTags(m[2]);
    if (!name || name.startsWith('[') || /^all (scenes|movies)/i.test(name) || seen.has(slug)) continue;
    seen.add(slug);
    cast.push({ slug, name, url: `${ORIGIN}/name/${slug}` });
  }
  return cast;
}

function extractStudio(html: string): Data18StudioRef | null {
  const m = html.match(
    /<a href="https:\/\/www\.data18\.com\/(studios|sites|networks)\/([^"\/?#]+)"[^>]*>([\s\S]*?)<\/a>/i
  );
  if (!m) return null;
  return { slug: m[2], name: stripTags(m[3]), url: `${ORIGIN}/${m[1]}/${m[2]}` };
}

function firstNonEmpty(...values: (string | undefined | null)[]): string | null {
  for (const v of values) {
    const t = v?.trim();
    if (t) return t;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Listing pages (latest scenes / movies, entity pages)
// ---------------------------------------------------------------------------

export function parseTotalFound(html: string, kind: 'Scenes' | 'Movies'): number | undefined {
  const m = html.match(new RegExp(`<b>\\s*([\\d,]+)\\s+${kind}\\s*</b>`, 'i'));
  return parseCount(m?.[1]);
}

export function parseScenesFromData18(html: string): Data18Scene[] {
  const scenes: Data18Scene[] = [];
  const seen = new Set<string>();
  const chunks = html.split(/<div id="item\d+"/i);

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const linkMatch = chunk.match(/href="(https:\/\/www\.data18\.com\/scenes\/(\d+)(?:-[^"#?]*)?)[#"]/i);
    if (!linkMatch) continue;
    const id = linkMatch[2];
    if (seen.has(id)) continue;
    seen.add(id);
    const url = linkMatch[1];

    const imageUrl = firstImage(chunk, /\/media\/t\//);

    const titleRaw =
      chunk.match(/class="gen12 bold"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ??
      chunk.match(/<a[^>]+title="([^"]+)"[^>]*>\s*<img/i)?.[1];
    const title = titleRaw ? stripTags(titleRaw) || `Scene #${id}` : `Scene #${id}`;

    const date = firstNonEmpty(
      chunk.match(/<span class="gensmall"><b>#\d+<\/b><\/span>\s*([^<\n]+)/i)?.[1],
      chunk.match(/([A-Za-z]{3,9}\.?\s+\d{1,2},\s+\d{4})/)?.[1],
      chunk.match(/(\d{4}-\d{2}-\d{2})/)?.[1]
    );

    const photosCount = (chunk.match(/title="(\d+)\s+pictures/i) || chunk.match(/(\d+)\s+pictures/i))?.[1];

    const cast = extractCast(chunk).filter((c) => !c.slug.includes('studios-'));
    const studio = extractStudio(chunk);

    scenes.push({ id, title, url, imageUrl, date, cast, studio, photosCount });
  }

  return scenes;
}

function movieSlugFromUrl(url: string): { id: string; slug: string } | null {
  const m = url.match(/\/movies\/((\d+)(?:-[^\/?#"]*)?)/i);
  return m ? { id: m[2], slug: m[1] } : null;
}

export function parseMoviesFromData18(html: string): Data18Movie[] {
  const movies: Data18Movie[] = [];
  const seen = new Set<string>();
  const chunks = html.split(/<div id="mitem\d+"/i);

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const linkMatch = chunk.match(/href="(https:\/\/www\.data18\.com\/movies\/\d+[^"#]*)/i);
    if (!linkMatch) continue;
    const url = linkMatch[1];
    const ids = movieSlugFromUrl(url);
    if (!ids || seen.has(ids.id)) continue;
    seen.add(ids.id);

    const coverUrl = firstImage(chunk, /\/covers\//);

    const imgAlt = chunk.match(/<img[^>]+alt="([^"]+)"/i)?.[1];
    const titleRaw = imgAlt || chunk.match(/title="([^"]+)"/i)?.[1];
    const title = titleRaw ? stripTags(titleRaw) || `Movie #${ids.id}` : `Movie #${ids.id}`;

    const date = firstNonEmpty(
      chunk.match(/<span class="gensmall"><b>#\d+<\/b><\/span>\s*([^<\n]+)/i)?.[1],
      chunk.match(/(\d{4}\/\d{2}|\d{4}-\d{2}-\d{2})/)?.[1]
    );

    const photosCount = (chunk.match(/title="(\d+)\s+pictures/i) || chunk.match(/(\d+)\s+pictures/i))?.[1];
    const studio = extractStudio(chunk);

    movies.push({ id: ids.id, slug: ids.slug, title, url, coverUrl, date, studio, photosCount });
  }

  return movies;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export function parseLiveSearchResults(
  html: string,
  searchType: 'performer' | 'studio' | 'series' | 'movie' | 'scene'
): Data18SearchResult[] {
  const results: Data18SearchResult[] = [];
  const cardRegex = /<a id="pslink\d+" href="([^"]+)"[^>]*title="([^"]+)">([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = cardRegex.exec(html)) !== null) {
    const url = m[1];
    const title = decodeEntities(m[2].trim());
    const cardContent = m[3];

    const avatarUrl = firstImage(cardContent) || undefined;
    const scenesMatch = cardContent.match(/(\d+)\s+Scenes/i);
    const moviesMatch = cardContent.match(/(\d+)\s+Movies/i);
    const dateMatch = cardContent.match(/Last Update:<\/span>\s*<span[^>]*>([^<]+)<\/span>/i);

    const pathSegments = url.split('/').filter(Boolean);
    const slug = pathSegments[pathSegments.length - 1] || '';

    let itemType = searchType;
    if (url.includes('/name/')) itemType = 'performer';
    else if (url.includes('/studios/') || url.includes('/sites/')) itemType = 'studio';
    else if (url.includes('/series/') || url.includes('movie-series')) itemType = 'series';
    else if (url.includes('/movies/')) itemType = 'movie';
    else if (url.includes('/scenes/')) itemType = 'scene';

    results.push({
      title,
      url,
      slug,
      type: itemType,
      avatarUrl,
      scenesCount: scenesMatch ? scenesMatch[1] : undefined,
      moviesCount: moviesMatch ? moviesMatch[1] : undefined,
      lastUpdate: dateMatch ? dateMatch[1].trim() : undefined,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Entity pages (performer / studio / site / network / series)
// ---------------------------------------------------------------------------

export function parseEntityStats(html: string): Data18EntityStats {
  const stats: Data18EntityStats = {};
  // Sidebar rows look like `<b>Scenes</b> - 898 </div>` or `Movie <b>Directors</b> - 22 </div>`.
  const re = /<b>([A-Za-z ]+)<\/b>\s*-\s*([\d,]+)\s*<\/div>/g;
  for (const m of html.matchAll(re)) {
    const key = m[1].trim().toLowerCase();
    const n = parseCount(m[2]);
    if (n === undefined) continue;
    if (key === 'scenes') stats.scenes ??= n;
    else if (key === 'movies') stats.movies ??= n;
    else if (key === 'virtual reality') stats.vr ??= n;
    else if (key === 'directors') stats.directors ??= n;
    else if (key === 'pairings' || key === 'pornstars') stats.pairings ??= n;
    else if (key === 'studios') stats.studios ??= n;
    else if (key === 'tags') stats.tags ??= n;
  }
  return stats;
}

export function parseTotalPages(html: string): number {
  let max = 1;
  const manual = html.match(/class="spagemanual"[^>]*\smax="(\d+)"/i);
  if (manual) max = Math.max(max, parseInt(manual[1], 10));
  for (const m of html.matchAll(/id="spage(\d+)"/g)) max = Math.max(max, parseInt(m[1], 10));
  return max;
}

/** `/sys/load/pages/...` path an entity page loads its filter panel from. */
export function extractLoadPagesPath(html: string): string | null {
  return html.match(/\.load\("(\/sys\/load\/pages\/[^"]+)"\)/)?.[1] ?? null;
}

/**
 * Builds the paging endpoint straight from the load-panel path, e.g.
 * `/sys/load/pages/2/1/0/cory-chase/null/1/0` -> `t=2&b=1&o=0&html=cory-chase`. This is the
 * same template the site's own script uses, without downloading the (large) filter panel.
 */
export function deriveEntityPageTemplate(loadPath: string): string | null {
  const m = loadPath.match(/^\/sys\/load\/pages\/(\d+)\/(\d+)\/(\d+)\/([a-z0-9._-]+)\//i);
  return m ? `/sys/page.php?t=${m[1]}&b=${m[2]}&o=${m[3]}&html=${m[4]}&html2=&total=&doquery=1` : null;
}

/**
 * The paging endpoint (minus the `spage`/`dopage` params) an entity page uses for
 * "next page" — it is embedded in the JS of the panel returned by extractLoadPagesPath.
 */
export function extractPageTemplate(loadHtml: string): string | null {
  const m = loadHtml.match(/\.load\("(\/sys\/page\.php\?[^"]*?)&spage="\s*\+\s*gospage/);
  return m ? m[1] : null;
}

function cleanEntityName(raw: string, slug: string): string {
  const cleaned = stripTags(raw)
    .replace(/\s*\|\s*DATA18.*$/i, '')
    .replace(/\s+(?:Studio|Site|Network|Series)\s+Database\s*&\s*Store$/i, '')
    .replace(/\s+(?:Porn\s+)?(?:Videos|Movies|Scenes)$/i, '')
    .trim();
  return cleaned || titleFromSlug(slug);
}

export function parseEntityDetailFromHtml(
  html: string,
  pathOrUrl: string,
  page = 1,
  tab: 'scenes' | 'movies' = 'scenes'
): Data18EntityDetail {
  const path = pathOrUrl.replace(/^https?:\/\/(?:www\.)?data18\.com/, '');
  const pathSegments = path.split('/').filter(Boolean);
  const isSeries = path.includes('movie-series') || path.startsWith('/series/');
  const slug = (isSeries ? pathSegments[pathSegments.length - 1] : pathSegments[1]) ?? '';

  let type: Data18EntityDetail['type'] = 'performer';
  if (path.includes('movie-series') || path.startsWith('/series/')) type = 'series';
  else if (path.startsWith('/studios/')) type = 'studio';
  else if (path.startsWith('/sites/')) type = 'site';
  else if (path.startsWith('/networks/')) type = 'network';

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const titleTag = html.match(/<title>([^<]+)/i)?.[1];
  const name = cleanEntityName(h1 ?? titleTag ?? '', slug);

  let avatarUrl = '';
  if (type === 'performer') {
    avatarUrl = `${CDN}/images/names/big/${slug}.jpg`;
  } else {
    avatarUrl =
      html.match(/https:\/\/cdn\.dt18\.com\/images\/(?:logos|studios|sites)\/[^"'\s]+/i)?.[0] ?? '';
  }

  const scenes = parseScenesFromData18(html);
  const movies = parseMoviesFromData18(html);
  const stats = parseEntityStats(html);

  return {
    name,
    slug,
    path,
    type,
    avatarUrl,
    scenesCount: stats.scenes ?? parseTotalFound(html, 'Scenes') ?? scenes.length,
    moviesCount: stats.movies ?? parseTotalFound(html, 'Movies') ?? movies.length,
    stats,
    tab,
    page,
    totalPages: parseTotalPages(html),
    scenes,
    movies,
  };
}

// ---------------------------------------------------------------------------
// Performer sub-pages (studios / pairings / tags)
// ---------------------------------------------------------------------------

export function parsePerformerPairings(html: string): Data18Named[] {
  const out: Data18Named[] = [];
  const re =
    /<a href="https:\/\/www\.data18\.com\/names\/pairings\/[^"]+"[^>]*>\s*<img[^>]*alt="([^"]*)"[\s\S]*?<a href="https:\/\/www\.data18\.com\/name\/([^"\/?#]+)"[\s\S]*?<b>\s*([\d,]+)\s+Scenes?\s*<\/b>/gi;
  for (const m of html.matchAll(re)) {
    const slug = m[2];
    out.push({
      name: decodeEntities(m[1]),
      slug,
      url: `${ORIGIN}/name/${slug}`,
      imageUrl: performerAvatar(slug),
      scenes: parseCount(m[3]),
    });
  }
  return out;
}

export function parsePerformerStudios(html: string): Data18Named[] {
  const out: Data18Named[] = [];
  const re =
    /#\d+\s*-\s*<b>([^<]+)<\/b>\s*----\s*(?:<button[^>]*?\/studios-([^'"]+)['"][^>]*>)?\s*(\d+)\s+[Ss]cenes?/g;
  for (const m of html.matchAll(re)) {
    let slug = m[2];
    if (!slug) {
      // Anchor-wrapped rows carry the slug in the preceding href.
      const before = html.slice(Math.max(0, (m.index ?? 0) - 400), m.index);
      const hrefs = [...before.matchAll(/\/studios-([a-z0-9-]+)"/g)];
      slug = hrefs.length ? hrefs[hrefs.length - 1][1] : '';
    }
    if (!slug) continue;
    out.push({
      name: decodeEntities(m[1]),
      slug,
      url: `${ORIGIN}/studios/${slug}`,
      scenes: parseCount(m[3]),
    });
  }
  return out;
}

export function parsePerformerTags(html: string): Data18Named[] {
  const out: Data18Named[] = [];
  const re = /<p class="listtag"[^>]*>\s*#\d+\s*-\s*\d+\s*-\s*([^<]+?)\s*----\s*(\d+)\s+scenes?\s*-\s*(\d+)\s+movies?\s*<\/p>/gi;
  for (const m of html.matchAll(re)) {
    out.push({
      name: decodeEntities(m[1].trim()),
      slug: m[1].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      url: '',
      scenes: parseCount(m[2]),
      movies: parseCount(m[3]),
    });
  }
  return out;
}

export function topBy(items: Data18Named[], limit: number): Data18Named[] {
  return [...items].sort((a, b) => (b.scenes ?? 0) - (a.scenes ?? 0)).slice(0, limit);
}

// ---------------------------------------------------------------------------
// Scene / movie detail pages
// ---------------------------------------------------------------------------

function extractTags(html: string): Data18Tag[] {
  const start = html.search(/<b>Categories:<\/b>/i);
  if (start < 0) return [];
  const rest = html.slice(start);
  const end = rest.search(/<\/div>|<\/p>/i);
  const block = end > 0 ? rest.slice(0, end) : rest.slice(0, 3000);

  const tags: Data18Tag[] = [];
  const seen = new Set<string>();
  let category: string | undefined;
  const re = /<span class="gensmall">([^<]+?):?<\/span>|<a href="https:\/\/www\.data18\.com\/tags\/([^"\/?#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of block.matchAll(re)) {
    if (m[1]) {
      category = stripTags(m[1]).replace(/:$/, '');
      continue;
    }
    const slug = m[2];
    const name = stripTags(m[3]);
    if (!slug || !name || seen.has(slug)) continue;
    seen.add(slug);
    tags.push({ slug, name, category });
  }
  return tags;
}

function extractDescription(html: string): string | null {
  const m = html.match(/<b>Description<\/b>\s*-\s*([\s\S]*?)<\/div>/i);
  if (!m) return null;
  const text = stripTags(m[1].replace(/<a[^>]*>\s*Show more\s*<\/a>/gi, ''))
    .replace(/\s*Show more\s*$/i, '')
    // Linked names leave a gap before the punctuation that follows them.
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s+'s(?=\s|$)/g, "'s");
  return text || null;
}

function photosFromMeta(html: string): number | undefined {
  const desc = html.match(/<meta name="description" content="([^"]*)"/i)?.[1];
  return parseCount(desc?.match(/(\d[\d,]*)\s+photos/i)?.[1]);
}

function withAvatars(cast: Data18CastMember[]): (Data18CastMember & { avatarUrl: string })[] {
  return cast.map((c) => ({ ...c, avatarUrl: performerAvatar(c.slug) }));
}

function detailTitle(html: string, fallback: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const fromH1 = h1 ? stripTags(h1) : '';
  if (fromH1) return fromH1;
  const t = html.match(/<title>([^<]+)/i)?.[1];
  return t ? stripTags(t).replace(/\s*\(\d{4}\)\s*Porn\s+(?:Scene|Movie)\s*\|.*$/i, '') || fallback : fallback;
}

export function parseSceneDetail(html: string, id: string): Data18SceneDetail {
  const infoStart = html.indexOf('Porn Scene Information');
  const info = infoStart >= 0 ? html.slice(infoStart) : html;

  const imageUrl =
    html.match(/https:\/\/cdn\.dt18\.com\/media\/scenes\/[^"'\s]+/i)?.[0] ??
    html.match(/https:\/\/cdn\.dt18\.com\/media\/t\/\d+\/scenes\/[^"'\s]+/i)?.[0] ??
    '';
  const thumbUrl = html.match(/https:\/\/cdn\.dt18\.com\/media\/t\/\d+\/scenes\/[^"'\s]+/i)?.[0] ?? imageUrl;

  const releaseDate = firstNonEmpty(
    info.match(/<b>Release date<\/b>\s*:\s*<a[^>]*><b>([^<]+)<\/b>/i)?.[1]
  );
  const duration = firstNonEmpty(info.match(/Duration:\s*<b>([^<]+)<\/b>/i)?.[1]);

  // Studio: only the information block, not the site header/menu.
  const studioBlock = info.match(/<b>(?:Studio|Site|Network):?<\/b>\s*:?[\s\S]{0,600}/i)?.[0] ?? '';
  const studio = extractStudio(studioBlock);

  const serieMatch = info.match(
    /<b>Serie:?<\/b>\s*:?\s*<a href="(https:\/\/www\.data18\.com\/studios\/[^"]*movie-series-([^"\/?#]+))"/i
  );
  const series = serieMatch ? { name: titleFromSlug(serieMatch[2]), url: serieMatch[1] } : null;

  let movie: Data18SceneDetail['movie'] = null;
  const movieMatch = info.match(
    /<b>Movie:?<\/b>\s*:?\s*<a href="(https:\/\/www\.data18\.com\/movies\/(\d+)(-[^"#]*)?)"[^>]*>([\s\S]*?)<\/a>/i
  );
  if (movieMatch) {
    const sceneNumber = info.match(/<b>Scene #(\d+)<\/b>\s*of\s*(\d+)/i);
    movie = {
      id: movieMatch[2],
      slug: `${movieMatch[2]}${movieMatch[3] ?? ''}`,
      title: stripTags(movieMatch[4]),
      url: movieMatch[1],
      sceneNumber: sceneNumber ? `${sceneNumber[1]} / ${sceneNumber[2]}` : undefined,
    };
  }

  const castStart = info.search(/Pornstars \/ Cast/i);
  const castEnd = info.search(/Galleries:|Move to Right/i);
  const castHtml =
    castStart >= 0 ? info.slice(castStart, castEnd > castStart ? castEnd : undefined) : '';
  const cast = withAvatars(extractCast(castHtml));

  const siblingScenes: Data18SceneDetail['siblingScenes'] = [];
  const zoneStart = html.indexOf('relatedmovie_zone');
  const zone = zoneStart >= 0 ? html.slice(zoneStart) : '';
  // `(?:(?!<\/a>)[\s\S])*?` keeps each match inside a single anchor.
  const sibRe =
    /<a href="https:\/\/www\.data18\.com\/scenes\/(\d+)(?:-[^"#?]*)?"[^>]*title="([^"]*)">(?:(?!<\/a>)[\s\S])*?<b>(Scene \d+)<\/b>(?:(?!<\/a>)[\s\S])*?<img[^>]*src="([^"]+)"/gi;
  for (const m of zone.matchAll(sibRe)) {
    siblingScenes.push({
      id: m[1],
      title: decodeEntities(m[2]),
      url: `${ORIGIN}/scenes/${m[1]}`,
      imageUrl: m[4],
      label: m[3],
    });
  }

  return {
    id,
    title: detailTitle(html, `Scene #${id}`),
    url: `${ORIGIN}/scenes/${id}`,
    imageUrl,
    thumbUrl,
    releaseDate,
    duration,
    description: extractDescription(html),
    photosCount: photosFromMeta(html),
    studio,
    series,
    movie,
    cast,
    tags: extractTags(info),
    siblingScenes,
  };
}

export function parseMovieDetail(html: string, slug: string): Data18MovieDetail {
  const id = slug.match(/^(\d+)/)?.[1] ?? slug;
  const infoStart = html.indexOf('Porn Movie Information');
  const info = infoStart >= 0 ? html.slice(infoStart) : html;

  const coverUrl =
    html.match(/https:\/\/cdn\.dt18\.com\/covers\/\d+\/\d+\/[^"'\s]+/i)?.[0] ??
    html.match(/https:\/\/cdn\.dt18\.com\/media\/posters\/[^"'\s]+/i)?.[0] ??
    '';
  const backCoverUrl = html.match(/https:\/\/cdn\.dt18\.com\/covers\/\d+\/back\/[^"'\s]+/i)?.[0];
  const posterUrl = html.match(/https:\/\/cdn\.dt18\.com\/media\/posters\/(?!nav)[^"'\s]+/i)?.[0];

  const year = info.match(/Prod\. Year:\s*<b>(\d{4})<\/b>/i)?.[1] ?? null;
  const releaseDate = firstNonEmpty(info.match(/Release date:\s*([^<]+)</i)?.[1]);
  const duration = firstNonEmpty(info.match(/<b>Length<\/b>\s*:\s*([^<\[]+)/i)?.[1]);
  const scenesCount = parseCount(info.match(/(\d+)\s+Scenes?<\/div>/i)?.[1]);

  const studioBlock = info.match(/<b>Studio:?<\/b>\s*:?[\s\S]{0,600}/i)?.[0] ?? '';
  const studio = extractStudio(studioBlock);

  const directors: Data18CastMember[] = [];
  const dirBlocks = info.matchAll(/<b>Directors?:<\/b>\s*<a href="https:\/\/www\.data18\.com\/name\/([^"\/?#]+)"[^>]*>([\s\S]*?)<\/a>/gi);
  for (const m of dirBlocks) {
    directors.push({ slug: m[1], name: stripTags(m[2]), url: `${ORIGIN}/name/${m[1]}` });
  }

  const castStart = info.search(/Pornstars \/ Cast of/i);
  const castEndRel = castStart >= 0 ? info.slice(castStart).search(/Movie SCENES|id="divscenes"/i) : -1;
  const castHtml =
    castStart >= 0 ? info.slice(castStart, castEndRel > 0 ? castStart + castEndRel : undefined) : '';
  const cast = withAvatars(extractCast(castHtml));

  const scenes: Data18MovieDetail['scenes'] = [];
  const sceneRe =
    /<a href="https:\/\/www\.data18\.com\/scenes\/(\d+)(?:-[^"#?]*)?"[^>]*>\s*<img[^>]*>[\s\S]*?<b>Scene #(\d+)<\/b>[\s\S]*?<p style="margin-top: 4px;">([^<]*)<\/p>/gi;
  for (const m of html.matchAll(sceneRe)) {
    const imgTag = m[0].match(/<img\b[^>]*>/i)?.[0] ?? '';
    scenes.push({
      id: m[1],
      title: `Scene #${m[2]}`,
      url: `${ORIGIN}/scenes/${m[1]}`,
      imageUrl: imgTagSrc(imgTag),
      cast: decodeEntities(m[3])
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  return {
    id,
    slug,
    title: detailTitle(html, `Movie #${id}`),
    url: `${ORIGIN}/movies/${slug}`,
    coverUrl,
    backCoverUrl,
    posterUrl,
    releaseDate,
    year,
    duration,
    description: extractDescription(html),
    photosCount: photosFromMeta(html),
    scenesCount: scenesCount ?? (scenes.length || undefined),
    studio,
    directors,
    cast,
    tags: extractTags(info),
    scenes,
  };
}
