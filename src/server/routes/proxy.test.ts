import { describe, it, expect, vi, afterEach } from 'vitest';
import { proxyRouter } from './proxy';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('proxyRouter', () => {
  it('relays a real image response with a locked-down content type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('binary-image-bytes', { status: 200, headers: { 'content-type': 'image/jpeg' } }))
    );

    const res = await proxyRouter.request('/?url=' + encodeURIComponent('https://cdni.pornpics.com/1280/1/1/1.jpg'));

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('rejects upstream responses that are not images', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>not an image</html>', { status: 200, headers: { 'content-type': 'text/html' } }))
    );

    const res = await proxyRouter.request('/?url=' + encodeURIComponent('https://example.com/evil.html'));

    expect(res.status).toBe(400);
  });

  it('rejects image/svg+xml even though it matches the image/* prefix', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<svg onload="alert(1)"></svg>', { status: 200, headers: { 'content-type': 'image/svg+xml' } })
      )
    );

    const res = await proxyRouter.request('/?url=' + encodeURIComponent('https://example.com/evil.svg'));

    expect(res.status).toBe(400);
  });

  it('rejects non-http(s) protocols and missing/invalid URLs', async () => {
    const missing = await proxyRouter.request('/');
    expect(missing.status).toBe(400);

    const badProtocol = await proxyRouter.request('/?url=' + encodeURIComponent('file:///etc/passwd'));
    expect(badProtocol.status).toBe(400);

    const malformed = await proxyRouter.request('/?url=not-a-url');
    expect(malformed.status).toBe(400);
  });
});
