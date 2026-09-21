const HOST = 'www.data18.com';
const ORIGIN = `https://${HOST}`;
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_CONCURRENT_REQUESTS = 4;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 200;

export class Data18Error extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 429 | 502 | 504 = 502
  ) {
    super(message);
    this.name = 'Data18Error';
  }
}

const BASE_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  // Data18 answers with its "adults only" interstitial (HTTP 403) unless these are present.
  Cookie: 'data_user_navigation=1; data_user_captcha=1;',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: `${ORIGIN}/`,
};

// ---------------------------------------------------------------------------
// Path validation (prevents SSRF through the `path` query parameters)
// ---------------------------------------------------------------------------

// Only entity pages are reachable through the generic `path` parameter.
const ENTITY_PATH_RE = /^\/(?:name|studios|sites|networks|series)\/[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9._-]+){0,3}$/i;

/**
 * Turns user input (a Data18 URL or a site path) into a safe same-site path.
 * Returns null for anything that is not a plain entity page on data18.com.
 */
export function normalizeEntityPath(input: string): string | null {
  const raw = input.trim();
  let path = raw;

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//')) {
    let url: URL;
    try {
      url = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    } catch {
      return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.hostname !== 'data18.com' && url.hostname !== HOST) return null;
    if (url.username || url.password || (url.port && url.port !== '443' && url.port !== '80')) return null;
    path = url.pathname;
  } else {
    path = raw.split(/[?#]/)[0];
  }

  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/+$/, '');
  if (path.includes('..') || path.includes('//') || path.includes('%')) return null;
  return ENTITY_PATH_RE.test(path) ? path : null;
}

export function isValidSceneId(id: string): boolean {
  return /^\d{1,10}$/.test(id);
}

export function isValidMovieSlug(slug: string): boolean {
  return /^\d{1,10}(?:-[a-z0-9-]{1,200})?$/i.test(slug);
}

// ---------------------------------------------------------------------------
// Concurrency limiting + caching
// ---------------------------------------------------------------------------

let active = 0;
const waiters: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiters.shift()?.();
  }
}

const memoryCache = new Map<string, { expires: number; value: string }>();
const inflight = new Map<string, Promise<string>>();

function cacheGet(key: string): string | undefined {
  const hit = memoryCache.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: string, ttlMs: number): void {
  if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { expires: Date.now() + ttlMs, value });
}

// The Workers Cache API survives isolate restarts and is shared per data centre.
function edgeCache(): Cache | undefined {
  try {
    return typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined;
  } catch {
    return undefined;
  }
}

async function edgeGet(key: string): Promise<string | undefined> {
  try {
    const res = await edgeCache()?.match(new Request(`https://data18-cache.invalid/${encodeURIComponent(key)}`));
    return res ? await res.text() : undefined;
  } catch {
    return undefined;
  }
}

async function edgeSet(key: string, value: string, ttlMs: number): Promise<void> {
  try {
    await edgeCache()?.put(
      new Request(`https://data18-cache.invalid/${encodeURIComponent(key)}`),
      new Response(value, { headers: { 'Cache-Control': `public, max-age=${Math.floor(ttlMs / 1000)}` } })
    );
  } catch {
    // Cache is best-effort.
  }
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Detects the interstitial / bot-check pages that come back with a 200 status. */
function assertRealPage(html: string, url: string): void {
  const isGate =
    /<title>[^<]*ADULTS ONLY/i.test(html) ||
    /<title>\s*Just a moment/i.test(html) ||
    /cf-browser-verification|challenge-platform/i.test(html.slice(0, 4000));
  if (isGate && html.length < 20_000) {
    throw new Data18Error(`Data18 returned an access-gate page for ${url}`, 502);
  }
}

function statusToError(status: number, url: string): Data18Error {
  if (status === 404) return new Data18Error('Not found on Data18', 404);
  if (status === 429) return new Data18Error('Data18 is rate limiting requests, try again shortly', 429);
  return new Data18Error(`Data18 responded with HTTP ${status} for ${url}`, 502);
}

async function fetchOnce(url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw statusToError(res.status, url);
  return await res.text();
}

const dohCache = new Map<string, { ip: string; expires: number }>();

/** Resolves the host over DNS-over-HTTPS when the local resolver blocks it (Node dev only). */
async function resolveHost(host: string): Promise<string | null> {
  const override = typeof process !== 'undefined' ? process.env?.DATA18_FALLBACK_IP : undefined;
  if (override) return override;

  const cached = dohCache.get(host);
  if (cached && cached.expires > Date.now()) return cached.ip;

  try {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { Answer?: { type: number; data: string }[] };
    const ip = body.Answer?.find((a) => a.type === 1 && /^\d+\.\d+\.\d+\.\d+$/.test(a.data))?.data;
    if (ip) dohCache.set(host, { ip, expires: Date.now() + 10 * 60_000 });
    return ip ?? null;
  } catch {
    return null;
  }
}

async function nodeFallbackFetch(url: string, headers: Record<string, string>): Promise<string> {
  const ip = await resolveHost(HOST);
  if (!ip) throw new Data18Error('Could not reach Data18 (DNS lookup failed)', 502);

  // Dynamic import keeps `node:https` out of the Cloudflare Workers bundle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeHttps: any = await (Function('return import("node:https")')() as Promise<any>);
  const parsed = new URL(url);

  return new Promise<string>((resolve, reject) => {
    const req = nodeHttps.request(
      {
        host: ip,
        servername: HOST,
        path: parsed.pathname + parsed.search,
        headers: { ...headers, Host: HOST },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res: any) => {
        const status: number = res.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          res.resume();
          reject(statusToError(status, url));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.on('data', (chunk: any) => {
          data += chunk;
          if (data.length > MAX_BODY_BYTES) req.destroy(new Data18Error('Response too large', 502));
        });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Data18Error('Request timed out', 504)));
    req.end();
  });
}

async function fetchWithFallbacks(url: string, headers: Record<string, string>): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const html = await fetchOnce(url, headers);
      assertRealPage(html, url);
      return html;
    } catch (err) {
      lastError = err;
      // Definitive answers from Data18 (404, 429, gate page) are not retried.
      if (err instanceof Data18Error && err.status !== 502) throw err;
      if (err instanceof Data18Error && /access-gate/.test(err.message)) throw err;
      if (attempt === 0) await sleep(400);
    }
  }

  const isHttpAnswer = lastError instanceof Data18Error && /HTTP \d+/.test(lastError.message);
  if (!isHttpAnswer && typeof process !== 'undefined' && process.versions?.node) {
    try {
      const html = await nodeFallbackFetch(url, headers);
      assertRealPage(html, url);
      return html;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError instanceof Data18Error) throw lastError;
  const timedOut = lastError instanceof Error && /timeout|aborted/i.test(`${lastError.name} ${lastError.message}`);
  throw new Data18Error(timedOut ? 'Data18 request timed out' : 'Failed to fetch from Data18', timedOut ? 504 : 502);
}

export interface FetchOptions {
  /** How long a successful response may be served from cache. */
  ttlMs?: number;
}

/**
 * Fetches a Data18 page (path starting with `/`), with a timeout, limited concurrency,
 * de-duplication of identical in-flight requests and a two-level cache.
 */
export async function fetchData18Html(path: string, options: FetchOptions = {}): Promise<string> {
  if (!path.startsWith('/')) throw new Data18Error('Invalid Data18 path', 400);
  const ttlMs = options.ttlMs ?? 5 * 60_000;
  const url = `${ORIGIN}${path}`;

  const cached = cacheGet(url);
  if (cached !== undefined) return cached;

  const pending = inflight.get(url);
  if (pending) return pending;

  const isAjax = path.startsWith('/sys/');
  const headers = isAjax
    ? { ...BASE_HEADERS, 'X-Requested-With': 'XMLHttpRequest' }
    : { ...BASE_HEADERS };

  const promise = (async () => {
    const edge = await edgeGet(url);
    if (edge !== undefined) {
      cacheSet(url, edge, ttlMs);
      return edge;
    }
    const html = await withSlot(() => fetchWithFallbacks(url, headers));
    cacheSet(url, html, ttlMs);
    void edgeSet(url, html, ttlMs);
    return html;
  })().finally(() => inflight.delete(url));

  inflight.set(url, promise);
  return promise;
}

/** Cache-Control value for JSON responses that are derived from a cached page. */
export function cacheControl(ttlMs: number): string {
  return `public, max-age=${Math.floor(ttlMs / 1000)}`;
}
