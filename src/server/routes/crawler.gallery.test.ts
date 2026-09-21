import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  crawlerRouter,
  extractGalleryCards,
  extractGalleryImages,
  extractProfileGallery,
  normalizeGalleryUrl,
} from './crawler';

const PROFILE_HTML = `
  <html><body>
    <a href="https://www.pornpics.com/galleries/first-gallery-111/" title="First gallery">
      <img src="https://static.pornpics.com/style/img/1px.png" data-src="https://cdni.pornpics.com/460/1/1/111/111_001.jpg" alt="First gallery alt" />
    </a>
    <a href="/galleries/second-gallery-222/">
      <img src="https://cdni.pornpics.com/460/2/2/222/222_001.jpg" alt="Second gallery (24)" />
    </a>
    <a href="https://www.pornpics.com/galleries/first-gallery-111/">
      <img src="https://cdni.pornpics.com/460/1/1/111/111_001.jpg" alt="duplicate" />
    </a>
    <a href="https://www.pornpics.com/pornstars/someone/"><img src="https://cdni.pornpics.com/460/9/9/9.jpg" alt="not a gallery" /></a>
    <a href="https://evil.example/galleries/x-1/"><img src="https://cdni.pornpics.com/460/8/8/8.jpg" alt="other host" /></a>
    <a href="https://www.pornpics.com/galleries/logo-3/"><img src="/logo.svg" alt="logo" /></a>
  </body></html>`;

const GALLERY_HTML = `
  <html><head><title>Hot MILFs posing - PornPics.com</title></head><body>
    <ul class="wookmark-initialised" id="tiles">
      <li class='thumbwook'><a class='rel-link' href='https://cdni.pornpics.com/1280/7/863/74165845/74165845_002_4d0b.jpg' data-pswp-width='1280'><img src='https://static.pornpics.com/style/img/1px.png' data-src='https://cdni.pornpics.com/460/7/863/74165845/74165845_002_4d0b.jpg' alt='x' width='300' height='450' /></a></li>
      <li class='thumbwook'><a class='rel-link' href='https://cdni.pornpics.com/1280/7/863/74165845/74165845_008_db83.jpg'><img src='https://static.pornpics.com/style/img/1px.png' data-src='https://cdni.pornpics.com/460/7/863/74165845/74165845_008_db83.jpg' alt='x' /></a></li>
      <li class='thumbwook'><a class='rel-link' href='https://cdni.pornpics.com/1280/7/863/74165845/74165845_002_4d0b.jpg'></a></li>
    </ul>
  </body></html>`;

describe('normalizeGalleryUrl', () => {
  it('accepts pornpics gallery URLs and canonicalises them', () => {
    expect(normalizeGalleryUrl('https://www.pornpics.com/galleries/abc-123')).toBe(
      'https://www.pornpics.com/galleries/abc-123/'
    );
    expect(normalizeGalleryUrl('https://www.pornpics.com/galleries/abc-123/?x=1#y')).toBe(
      'https://www.pornpics.com/galleries/abc-123/'
    );
  });

  it('rejects other hosts, schemes, paths, ports and credentials', () => {
    for (const bad of [
      'http://www.pornpics.com/galleries/abc-123/',
      'https://pornpics.com/galleries/abc-123/',
      'https://www.pornpics.com.evil.example/galleries/abc-123/',
      'https://user:pw@www.pornpics.com/galleries/abc-123/',
      'https://www.pornpics.com:8443/galleries/abc-123/',
      'https://www.pornpics.com/pornstars/abc/',
      'https://www.pornpics.com/galleries/../admin/',
      'https://www.pornpics.com/galleries/ABC_123/',
      'https://www.pornpics.com/galleries/',
      'not a url',
      '',
    ]) {
      expect(normalizeGalleryUrl(bad), bad).toBeNull();
    }
  });
});

describe('extractGalleryCards', () => {
  it('returns one card per gallery with cover, canonical URL and title', () => {
    const cards = extractGalleryCards(PROFILE_HTML, 'https://www.pornpics.com/pornstars/someone/');
    expect(cards).toEqual([
      {
        cover: 'https://cdni.pornpics.com/1280/1/1/111/111_001.jpg',
        url: 'https://www.pornpics.com/galleries/first-gallery-111/',
        title: 'First gallery',
      },
      {
        cover: 'https://cdni.pornpics.com/1280/2/2/222/222_001.jpg',
        url: 'https://www.pornpics.com/galleries/second-gallery-222/',
        title: 'Second gallery',
      },
    ]);
  });

  it('leaves extractProfileGallery output unchanged', () => {
    const { images } = extractProfileGallery(PROFILE_HTML, 'https://www.pornpics.com/pornstars/someone/');
    expect(images).toContain('https://cdni.pornpics.com/1280/1/1/111/111_001.jpg');
    expect(images).toContain('https://cdni.pornpics.com/1280/2/2/222/222_001.jpg');
  });
});

describe('extractGalleryImages', () => {
  it('reads the full-size photo links and drops duplicates', () => {
    expect(extractGalleryImages(GALLERY_HTML, 'https://www.pornpics.com/galleries/x-1/')).toEqual([
      'https://cdni.pornpics.com/1280/7/863/74165845/74165845_002_4d0b.jpg',
      'https://cdni.pornpics.com/1280/7/863/74165845/74165845_008_db83.jpg',
    ]);
  });

  it('falls back to the upgraded thumbnails when there are no rel-link anchors', () => {
    const html = `<li class='thumbwook'><img src='x.png' data-src='https://cdni.pornpics.com/460/1/2/3/a.jpg' /></li>`;
    expect(extractGalleryImages(html, 'https://www.pornpics.com/galleries/x-1/')).toEqual([
      'https://cdni.pornpics.com/1280/1/2/3/a.jpg',
    ]);
  });

  it('caps the number of photos', () => {
    const many = Array.from(
      { length: 100 },
      (_, i) => `<a class='rel-link' href='https://cdni.pornpics.com/1280/1/1/1/p${i}.jpg'></a>`
    ).join('');
    expect(extractGalleryImages(many, 'https://www.pornpics.com/galleries/x-1/')).toHaveLength(60);
  });
});

describe('GET /gallery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects anything but a pornpics gallery without fetching', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    for (const bad of [
      'http://169.254.169.254/latest',
      'https://evil.example/galleries/x-1/',
      'https://www.pornpics.com/pornstars/x/',
      'https://user:pw@www.pornpics.com/galleries/x-1/',
    ]) {
      const res = await crawlerRouter.request('/gallery?url=' + encodeURIComponent(bad));
      expect(res.status, bad).toBe(400);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns the photos of a valid gallery', async () => {
    const fetchSpy = vi.fn(async (_url: string | URL | Request) => new Response(GALLERY_HTML));
    vi.stubGlobal('fetch', fetchSpy);

    const res = await crawlerRouter.request(
      '/gallery?url=' + encodeURIComponent('https://www.pornpics.com/galleries/hot-milfs-74165845')
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toMatch(/max-age=1800/);
    const body = (await res.json()) as { url: string; title: string; images: string[] };
    expect(body.url).toBe('https://www.pornpics.com/galleries/hot-milfs-74165845/');
    expect(body.title).toBe('Hot MILFs posing');
    expect(body.images).toHaveLength(2);
    expect(String(fetchSpy.mock.calls[0][0])).toBe('https://www.pornpics.com/galleries/hot-milfs-74165845/');
  });

  it('maps an upstream 404 to 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('gone', { status: 404 })));
    const res = await crawlerRouter.request(
      '/gallery?url=' + encodeURIComponent('https://www.pornpics.com/galleries/missing-1/')
    );
    expect(res.status).toBe(404);
  });
});
