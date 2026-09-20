import { Hono } from 'hono';
import type { AppEnv } from '../app';

export const proxyRouter = new Hono<AppEnv>();

const PROXY_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// GET /api/image-proxy?url=...
proxyRouter.get('/', async (c) => {
  const targetUrl = c.req.query('url');
  if (!targetUrl) {
    return c.text('Missing url parameter', 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return c.text('Invalid URL protocol', 400);
    }
  } catch {
    return c.text('Invalid URL', 400);
  }

  const headers = {
    ...PROXY_HEADERS,
    Referer: `${parsed.origin}/`,
  };

  try {
    let upstreamRes = await fetch(targetUrl, { headers });

    // Fallback: If 404 and the path has /1280/, try the /460/ thumbnail variant
    if (!upstreamRes.ok && targetUrl.includes('/1280/')) {
      const fallbackUrl = targetUrl.replace('/1280/', '/460/');
      const fallbackRes = await fetch(fallbackUrl, { headers });
      if (fallbackRes.ok) {
        upstreamRes = fallbackRes;
      }
    }

    if (!upstreamRes.ok) {
      return c.text(`Upstream image error (${upstreamRes.status})`, upstreamRes.status as 400);
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';

    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error fetching image';
    return c.text(`Proxy failed: ${message}`, 502);
  }
});
