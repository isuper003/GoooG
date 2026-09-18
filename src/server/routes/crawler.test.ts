import { describe, it, expect } from 'vitest';
import { parseHtmlContent, upgradeImageResolution } from './crawler';

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

  it('only replaces the first occurrence (matches the real CDN path shape)', () => {
    const url = 'https://cdn.test/460/a/460/b.jpg';
    expect(upgradeImageResolution(url)).toBe('https://cdn.test/1280/a/460/b.jpg');
  });
});

describe('parseHtmlContent', () => {
  const baseUrl = 'https://example.com/gallery';

  it('extracts a character with an avatar and gallery images from an <a><img> card', () => {
    const html = `
      <a href="/profile/alex">
        <img src="https://cdni.pornpics.com/460/1/1/1/avatar.jpg" alt="Alex Rivera">
        <img src="https://cdni.pornpics.com/460/1/1/1/gallery2.jpg" alt="Alex Rivera 2">
      </a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'sluts');
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Alex Rivera');
    expect(items[0].categoryKey).toBe('sluts');
    // Upgraded to 1280 resolution
    expect(items[0].avatarUrl).toBe('https://cdni.pornpics.com/1280/1/1/1/avatar.jpg');
    expect(items[0].availableImages).toEqual(['https://cdni.pornpics.com/1280/1/1/1/gallery2.jpg']);
  });

  it('excludes the avatar from availableImages even when it is the only image', () => {
    const html = `
      <a href="/profile/jordan">
        <img src="https://cdn.test/460/j/1.jpg" alt="Jordan Lee">
      </a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'sluts');
    expect(items).toHaveLength(1);
    expect(items[0].avatarUrl).toBe('https://cdn.test/1280/j/1.jpg');
    expect(items[0].availableImages).toEqual([]);
  });

  it('skips lazy-load placeholder src attributes in favor of data-src', () => {
    const html = `
      <a href="/profile/taylor">
        <img src="https://static.test/1px.png" data-src="https://cdn.test/460/t/1.jpg" alt="Taylor Cruz">
      </a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'sluts');
    expect(items[0].avatarUrl).toBe('https://cdn.test/1280/t/1.jpg');
  });

  it('resolves relative image URLs against the base URL', () => {
    const html = `
      <a href="/profile/rel">
        <img src="/img/460/rel.jpg" alt="Relative Person">
      </a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'trans');
    expect(items[0].avatarUrl).toBe('https://example.com/img/1280/rel.jpg');
  });

  it('extracts multiple distinct characters from separate cards', () => {
    const html = `
      <a href="/profile/a"><img src="https://cdn.test/460/a/1.jpg" alt="Person A"></a>
      <a href="/profile/b"><img src="https://cdn.test/460/b/1.jpg" alt="Person B"></a>
      <a href="/profile/c"><img src="https://cdn.test/460/c/1.jpg" alt="Person C"></a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'twinks');
    expect(items.map((i) => i.name).sort()).toEqual(['Person A', 'Person B', 'Person C']);
    expect(items.every((i) => i.categoryKey === 'twinks')).toBe(true);
  });

  it('merges repeated cards for the same name into one item with a combined gallery', () => {
    const html = `
      <a href="/profile/x"><img src="https://cdn.test/460/x/1.jpg" alt="Same Person"></a>
      <a href="/profile/x2"><img src="https://cdn.test/460/x/2.jpg" alt="Same Person"></a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'sluts');
    expect(items).toHaveLength(1);
    expect(items[0].availableImages).toContain('https://cdn.test/1280/x/2.jpg');
  });

  it('strips trailing photo-count suffixes from names', () => {
    const html = `
      <a href="/profile/y">
        <img src="https://cdn.test/460/y/1.jpg" alt="Some Person (24)">
      </a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'sluts');
    expect(items[0].name).toBe('Some Person');
  });

  it('returns an empty list for HTML with no image cards', () => {
    const html = '<div>No characters here</div>';
    expect(parseHtmlContent(html, baseUrl, 'sluts')).toEqual([]);
  });

  it('ignores data: and javascript: URLs', () => {
    const html = `
      <a href="/profile/bad">
        <img src="data:image/png;base64,AAAA" alt="Bad Person">
      </a>
    `;
    const items = parseHtmlContent(html, baseUrl, 'sluts');
    expect(items).toHaveLength(0);
  });
});
