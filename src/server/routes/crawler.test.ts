import { describe, it, expect } from 'vitest';
import { extractProfileLinks, extractProfileGallery, upgradeImageResolution } from './crawler';

describe('upgradeImageResolution', () => {
  it('replaces a /460/ path segment with /1280/', () => {
    expect(upgradeImageResolution('https://cdni.pornpics.com/460/7/549/43129135/43129135_073.jpg')).toBe(
      'https://cdni.pornpics.com/1280/7/549/43129135/43129135_073.jpg'
    );
  });

  it('leaves URLs without a /460/ segment unchanged', () => {
    const url = 'https://cdni.pornpics.com/1280/7/549/43129135/43129135_073.jpg';
    expect(upgradeImageResolution(url)).toBe(url);
  });

  it('does not touch "460" appearing outside a /460/ path segment', () => {
    const url = 'https://example.com/img/4601/photo.jpg';
    expect(upgradeImageResolution(url)).toBe(url);
  });
});

describe('extractProfileLinks (stage 1: listing page → profile links)', () => {
  const baseUrl = 'https://example.com/pornstars/';

  it('extracts name and absolute profile URL from a listing card', () => {
    const html = `
      <li class='thumbwook'>
        <a class='rel-link' href='/pornstars/angela-white/' title="Angela White">
          <span class="m-name">Angela White</span>
          <img src="https://static.example.com/1px.png" data-src="https://cdn.test/460/a/1.jpg" alt="Angela White" width="300" height="450">
        </a>
      </li>
    `;
    const links = extractProfileLinks(html, baseUrl);
    expect(links).toEqual([{ name: 'Angela White', profileUrl: 'https://example.com/pornstars/angela-white/' }]);
  });

  it('extracts multiple distinct cards', () => {
    const html = `
      <a href='/pornstars/a/' title="Person A"><img src="https://cdn.test/460/a/1.jpg" alt="Person A"></a>
      <a href='/pornstars/b/' title="Person B"><img src="https://cdn.test/460/b/1.jpg" alt="Person B"></a>
    `;
    const links = extractProfileLinks(html, baseUrl);
    expect(links.map((l) => l.name).sort()).toEqual(['Person A', 'Person B']);
  });

  it('skips links with no image at all (nav links, pagination, random-gallery buttons)', () => {
    const html = `
      <a href="/pornstars/2/">2</a>
      <a href="/rnd/random"><svg class="svg-icon"><use href="#icon-random"></use></svg></a>
    `;
    expect(extractProfileLinks(html, baseUrl)).toEqual([]);
  });

  it('skips a site-logo link (svg image) even though it has an href and an image', () => {
    const html = `
      <a href="/"><img src="https://static.example.com/style/img/logo.svg" alt=" Free Porn Pics" width="118" height="56"></a>
      <a href='/pornstars/a/' title="Person A"><img src="https://cdn.test/460/a/1.jpg" alt="Person A"></a>
    `;
    const links = extractProfileLinks(html, baseUrl);
    expect(links.map((l) => l.name)).toEqual(['Person A']);
  });

  it('skips a "Login with Google" icon link', () => {
    const html = `
      <a href="#" class="google-oauth-button">
        <img src="https://static.example.com/style/img/google-icon.svg" alt="google" width="22" height="22">
      </a>
      <a href='/pornstars/a/' title="Person A"><img src="https://cdn.test/460/a/1.jpg" alt="Person A"></a>
    `;
    const links = extractProfileLinks(html, baseUrl);
    expect(links.map((l) => l.name)).toEqual(['Person A']);
  });

  it('prefers the title attribute for the name over alt text', () => {
    const html = `<a href='/pornstars/a/' title="The Real Name"><img src="https://cdn.test/460/a/1.jpg" alt="alt text differs"></a>`;
    expect(extractProfileLinks(html, baseUrl)[0].name).toBe('The Real Name');
  });

  it('deduplicates cards that resolve to the same profile URL', () => {
    const html = `
      <a href='/pornstars/a/' title="Person A"><img src="https://cdn.test/460/a/1.jpg"></a>
      <a href='/pornstars/a/' title="Person A"><img src="https://cdn.test/460/a/2.jpg"></a>
    `;
    expect(extractProfileLinks(html, baseUrl)).toHaveLength(1);
  });

  it('resolves a root-relative href against the base URL', () => {
    const html = `<a href='/pornstars/a/' title="Person A"><img src="https://cdn.test/460/a/1.jpg"></a>`;
    const links = extractProfileLinks(html, 'https://example.com/pornstars/shemale/?page=2');
    expect(links[0].profileUrl).toBe('https://example.com/pornstars/a/');
  });
});

describe('extractProfileGallery (stage 2: profile page → avatar + album)', () => {
  const baseUrl = 'https://example.com/pornstars/angela-white/';

  it('extracts the avatar from a schema.org Person JSON-LD "image" field', () => {
    const html = `
      <script type="application/ld+json">
      { "@context": "https://schema.org", "@type": "Person", "name": "Angela White", "image": "https://cdn.test/models/a/angela_white.jpeg" }
      </script>
    `;
    const { avatarUrl } = extractProfileGallery(html, baseUrl);
    expect(avatarUrl).toBe('https://cdn.test/models/a/angela_white.jpeg');
  });

  it('extracts the avatar from a nested "mainEntity.image" field (ProfilePage schema)', () => {
    const html = `
      <script type="application/ld+json">
      {"@type": "ProfilePage", "mainEntity": {"@type": "Person", "image": "https://cdn.test/models/a/angela_white.jpeg"}}
      </script>
    `;
    const { avatarUrl } = extractProfileGallery(html, baseUrl);
    expect(avatarUrl).toBe('https://cdn.test/models/a/angela_white.jpeg');
  });

  it('tolerates a malformed JSON-LD block and still returns gallery images', () => {
    const html = `
      <script type="application/ld+json">{ this is not valid json </script>
      <a href="https://example.com/galleries/g1/"><img data-src="https://cdn.test/460/a/1.jpg" alt="gallery 1"></a>
    `;
    const { avatarUrl, images } = extractProfileGallery(html, baseUrl);
    expect(avatarUrl).toBe('');
    expect(images).toEqual(['https://cdn.test/1280/a/1.jpg']);
  });

  it('collects every gallery thumbnail card, upgrading resolution and deduplicating', () => {
    const html = `
      <a href="https://example.com/galleries/g1/"><img data-src="https://cdn.test/460/a/1.jpg" alt="gallery 1"></a>
      <a href="https://example.com/galleries/g2/"><img data-src="https://cdn.test/460/a/2.jpg" alt="gallery 2"></a>
      <a href="https://example.com/galleries/g1/"><img data-src="https://cdn.test/460/a/1.jpg" alt="gallery 1 again"></a>
    `;
    const { images } = extractProfileGallery(html, baseUrl);
    expect(images).toEqual(['https://cdn.test/1280/a/1.jpg', 'https://cdn.test/1280/a/2.jpg']);
  });

  it('excludes the avatar URL from the gallery images if it also appears as a card', () => {
    const html = `
      <script type="application/ld+json">{"@type":"Person","image":"https://cdn.test/1280/a/1.jpg"}</script>
      <a href="https://example.com/galleries/g1/"><img data-src="https://cdn.test/460/a/1.jpg"></a>
      <a href="https://example.com/galleries/g2/"><img data-src="https://cdn.test/460/a/2.jpg"></a>
    `;
    const { avatarUrl, images } = extractProfileGallery(html, baseUrl);
    expect(avatarUrl).toBe('https://cdn.test/1280/a/1.jpg');
    expect(images).toEqual(['https://cdn.test/1280/a/2.jpg']);
  });

  it('filters out ad placeholder / icon images from the gallery', () => {
    const html = `
      <li class="thumbwook r2-frame"><span class="h2 ad-text"><i></i></span></li>
      <a href="https://example.com/galleries/g1/"><img data-src="https://cdn.test/460/a/1.jpg"></a>
      <a href="/social"><img src="https://cdn.test/icon.svg" alt="social" width="20" height="20"></a>
    `;
    const { images } = extractProfileGallery(html, baseUrl);
    expect(images).toEqual(['https://cdn.test/1280/a/1.jpg']);
  });

  it('returns an empty avatar and empty gallery for a page with none of the expected markup', () => {
    const html = '<div>Nothing here</div>';
    expect(extractProfileGallery(html, baseUrl)).toEqual({ avatarUrl: '', images: [] });
  });

  it('caps the number of gallery images returned', () => {
    const cards = Array.from(
      { length: 40 },
      (_, i) => `<a href="https://example.com/galleries/g${i}/"><img data-src="https://cdn.test/460/a/${i}.jpg"></a>`
    ).join('\n');
    const { images } = extractProfileGallery(cards, baseUrl);
    expect(images.length).toBeLessThanOrEqual(30);
  });
});
