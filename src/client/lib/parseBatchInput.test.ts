import { describe, it, expect } from 'vitest';
import { parseBatchInput } from './parseBatchInput';

describe('parseBatchInput', () => {
  it('returns an empty array for blank input', () => {
    expect(parseBatchInput('', 'sluts')).toEqual([]);
    expect(parseBatchInput('   \n  ', 'sluts')).toEqual([]);
  });

  describe('JSON format', () => {
    it('parses a JSON array with name/category/images', () => {
      const raw = JSON.stringify([
        { name: 'Alex Rivera', category: 'sluts', images: ['https://a.test/1.jpg', 'https://a.test/2.jpg'] },
        { name: 'Jordan Lee', category: 'trans', images: ['https://a.test/3.jpg'] },
      ]);

      const items = parseBatchInput(raw, 'twinks');
      expect(items).toHaveLength(2);

      expect(items[0].name).toBe('Alex Rivera');
      expect(items[0].categoryKey).toBe('sluts');
      expect(items[0].avatarUrl).toBe('https://a.test/1.jpg');
      // avatar is excluded from the candidate gallery
      expect(items[0].availableImages).toEqual(['https://a.test/2.jpg']);
      expect(items[0].selectedImages).toEqual(['https://a.test/2.jpg']);

      expect(items[1].categoryKey).toBe('trans');
    });

    it('falls back to the default category when category is missing or unrecognized', () => {
      const raw = JSON.stringify([{ name: 'No Category', images: ['https://a.test/1.jpg'] }]);
      const items = parseBatchInput(raw, 'twinks');
      expect(items[0].categoryKey).toBe('twinks');
    });

    it('accepts the legacy "sl" shorthand for sluts', () => {
      const raw = JSON.stringify([{ name: 'Legacy', category: 'sl', images: ['https://a.test/1.jpg'] }]);
      expect(parseBatchInput(raw, 'trans')[0].categoryKey).toBe('sluts');
    });

    it('accepts images as {url} objects, not just strings', () => {
      const raw = JSON.stringify([
        { name: 'Obj Images', category: 'sluts', images: [{ url: 'https://a.test/1.jpg' }, { url: 'https://a.test/2.jpg' }] },
      ]);
      const items = parseBatchInput(raw, 'sluts');
      expect(items[0].avatarUrl).toBe('https://a.test/1.jpg');
      expect(items[0].availableImages).toEqual(['https://a.test/2.jpg']);
    });

    it('when only 1 image exists, uses it as the avatar and falls back to it as the sole candidate', () => {
      const raw = JSON.stringify([{ name: 'Solo Image', category: 'sluts', images: ['https://a.test/only.jpg'] }]);
      const items = parseBatchInput(raw, 'sluts');
      expect(items[0].avatarUrl).toBe('https://a.test/only.jpg');
      // No separate gallery image, so the sole image is still offered as a candidate
      expect(items[0].availableImages).toEqual(['https://a.test/only.jpg']);
    });

    it('falls through to the line-by-line parser on invalid JSON starting with [ or {', () => {
      const raw = '[not valid json\nhttps://a.test/1.jpg';
      const items = parseBatchInput(raw, 'sluts');
      expect(items).toHaveLength(1);
      expect(items[0].availableImages).toEqual(['https://a.test/1.jpg']);
    });

    it('ignores non-object entries in a mixed JSON array', () => {
      const raw = JSON.stringify([null, 'skip me', { name: 'Valid', images: ['https://a.test/1.jpg'] }]);
      const items = parseBatchInput(raw, 'sluts');
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Valid');
    });
  });

  describe('pipe-delimited text format', () => {
    it('parses "Name | Category | url1, url2"', () => {
      const raw = 'Alex Rivera | sluts | https://a.test/1.jpg, https://a.test/2.jpg';
      const items = parseBatchInput(raw, 'twinks');
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Alex Rivera');
      expect(items[0].categoryKey).toBe('sluts');
      expect(items[0].avatarUrl).toBe('https://a.test/1.jpg');
      expect(items[0].availableImages).toEqual(['https://a.test/2.jpg']);
    });

    it('parses "Name | url1, url2" (no category column) using the default category', () => {
      const raw = 'Jordan Lee | https://a.test/1.jpg, https://a.test/2.jpg';
      const items = parseBatchInput(raw, 'trans');
      expect(items[0].categoryKey).toBe('trans');
      expect(items[0].availableImages).toEqual(['https://a.test/2.jpg']);
    });

    it('parses multiple lines independently', () => {
      const raw = [
        'Alex Rivera | sluts | https://a.test/1.jpg',
        'Jordan Lee | trans | https://a.test/2.jpg',
        'Taylor Cruz | twinks | https://a.test/3.jpg',
      ].join('\n');
      const items = parseBatchInput(raw, 'sluts');
      expect(items).toHaveLength(3);
      expect(items.map((i) => i.categoryKey)).toEqual(['sluts', 'trans', 'twinks']);
    });

    it('drops non-http(s) URLs, leaving the sole valid URL as both avatar and fallback candidate', () => {
      const raw = 'Alex Rivera | sluts | ftp://a.test/1.jpg, https://a.test/2.jpg, javascript:alert(1)';
      const items = parseBatchInput(raw, 'sluts');
      expect(items[0].avatarUrl).toBe('https://a.test/2.jpg');
      expect(items[0].availableImages).toEqual(['https://a.test/2.jpg']);
    });
  });

  describe('bare image URL list format', () => {
    it('derives a name from the URL filename', () => {
      const raw = 'https://a.test/gallery/alex-rivera.jpg';
      const items = parseBatchInput(raw, 'sluts');
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('alex rivera');
      expect(items[0].categoryKey).toBe('sluts');
      expect(items[0].avatarUrl).toBe(raw);
      expect(items[0].availableImages).toEqual([raw]);
    });

    it('treats each bare URL as a separate character', () => {
      const raw = 'https://a.test/1.jpg\nhttps://a.test/2.jpg';
      const items = parseBatchInput(raw, 'sluts');
      expect(items).toHaveLength(2);
    });

    it('skips lines that are neither pipe-delimited nor a URL', () => {
      const raw = 'https://a.test/1.jpg\njust some random text\nhttps://a.test/2.jpg';
      const items = parseBatchInput(raw, 'sluts');
      expect(items).toHaveLength(2);
    });
  });
});
