import { describe, it, expect } from 'vitest';
import { toProxiedImageUrl } from './imageUrl';

describe('toProxiedImageUrl', () => {
  it('returns empty string for null, undefined, or empty string', () => {
    expect(toProxiedImageUrl(null)).toBe('');
    expect(toProxiedImageUrl(undefined)).toBe('');
    expect(toProxiedImageUrl('')).toBe('');
    expect(toProxiedImageUrl('   ')).toBe('');
  });

  it('leaves already proxied URLs untouched', () => {
    const url = '/api/image-proxy?url=https%3A%2F%2Fcdni.pornpics.com%2Fimage.jpg';
    expect(toProxiedImageUrl(url)).toBe(url);
  });

  it('leaves data URLs, blob URLs, and local assets untouched', () => {
    expect(toProxiedImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(toProxiedImageUrl('blob:https://example.com/123')).toBe('blob:https://example.com/123');
    expect(toProxiedImageUrl('/assets/icon.svg')).toBe('/assets/icon.svg');
  });

  it('leaves relative URLs untouched', () => {
    expect(toProxiedImageUrl('/images/avatar.jpg')).toBe('/images/avatar.jpg');
  });

  it('proxies external http and https URLs', () => {
    const raw = 'https://cdni.pornpics.com/1280/7/549/43129135/43129135_073.jpg';
    const expected = `/api/image-proxy?url=${encodeURIComponent(raw)}`;
    expect(toProxiedImageUrl(raw)).toBe(expected);
  });
});
