import { describe, it, expect } from 'vitest';
import {
  extractProfileLinks,
  extractProfileGallery,
  upgradeImageResolution,
  slugifyName,
  getExistingCharactersForCategory,
} from './crawler';

describe('slugifyName', () => {
  it('lowercases and hyphenates a plain name', () => {
    expect(slugifyName('Angela White')).toBe('angela-white');
  });

  it('collapses extra whitespace into a single hyphen', () => {
    expect(slugifyName('  Little   Caprice  ')).toBe('little-caprice');
  });

  it('strips apostrophes without leaving a stray hyphen', () => {
    expect(slugifyName("Rin O'Malley")).toBe('rin-omalley');
  });

  it('drops other punctuation, replacing it with a hyphen', () => {
    expect(slugifyName('Jane & Jill')).toBe('jane-jill');
  });

  it('trims leading/trailing hyphens produced by punctuation at the edges', () => {
    expect(slugifyName('-Jordan Lee!')).toBe('jordan-lee');
  });
});

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

describe('getExistingCharactersForCategory', () => {
  it('returns an empty map if db is undefined', async () => {
    const result = await getExistingCharactersForCategory(undefined, 'sluts');
    expect(result.size).toBe(0);
  });

  it('queries existing characters and maps their program images', async () => {
    const mockDb = {
      prepare(query: string) {
        return {
          bind(...params: unknown[]) {
            return {
              async first<T>() {
                if (query.includes('FROM categories')) {
                  return { id: 10 } as T;
                }
                return null;
              },
              async all<T>() {
                if (query.includes('FROM characters WHERE category_id')) {
                  return {
                    results: [
                      { id: 1, name: 'Angela White' },
                      { id: 2, name: ' Eva Elfie ' },
                    ] as T[],
                  };
                }
                if (query.includes('FROM character_images')) {
                  return {
                    results: [
                      { character_id: 1, url: 'https://example.com/angela1.jpg', position: 0 },
                      { character_id: 1, url: 'https://example.com/angela2.jpg', position: 1 },
                      { character_id: 2, url: 'https://example.com/eva1.jpg', position: 0 },
                    ] as T[],
                  };
                }
                return { results: [] as T[] };
              },
            };
          },
        };
      },
    } as unknown as D1Database;

    const result = await getExistingCharactersForCategory(mockDb, 'sluts');
    expect(result.size).toBe(2);

    const angela = result.get('angela white');
    expect(angela).toBeDefined();
    expect(angela?.name).toBe('Angela White');
    expect(angela?.avatarUrl).toBe('https://example.com/angela1.jpg');
    expect(angela?.images).toEqual([
      'https://example.com/angela1.jpg',
      'https://example.com/angela2.jpg',
    ]);

    const eva = result.get('eva elfie');
    expect(eva).toBeDefined();
    expect(eva?.name).toBe(' Eva Elfie ');
    expect(eva?.avatarUrl).toBe('https://example.com/eva1.jpg');
    expect(eva?.images).toEqual(['https://example.com/eva1.jpg']);
  });
});
