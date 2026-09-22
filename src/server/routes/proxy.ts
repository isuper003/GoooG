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

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    // This endpoint only ever serves images — without this check it would act as an
    // open relay for arbitrary content (HTML/JS) served under this app's own origin.
    if (!contentType.startsWith('image/')) {
      return c.text('Upstream response was not an image', 400);
    }
    // SVG is XML that can embed <script>; browsers execute it when the response is loaded
    // directly (e.g. an <iframe>/<object>, or a viewer navigating straight to this URL),
    // which would run under this app's own origin. Every real gallery image here is a
    // raster format (JPG/PNG/WEBP/AVIF), so SVG has no legitimate use through this proxy.
    if (contentType.startsWith('image/svg+xml')) {
      return c.text('SVG responses are not relayed by this proxy', 400);
    }

    return new Response(upstreamRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, immutable',
        'Access-Control-Allow-Origin': '*',
        // Defense in depth: never let the browser guess its way into treating this as HTML.
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Network error fetching image';
    return c.text(`Proxy failed: ${message}`, 502);
  }
});
