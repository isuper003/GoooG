/**
 * Transforms an image URL so that external images (e.g. from CDNs that may be
 * blocked by regional DNS/ISPs or restrict hotlinking) are reliably served
 * through the application's edge image proxy at /api/image-proxy?url=...
 */
export function toProxiedImageUrl(url: string | undefined | null): string {
  if (!url) return '';

  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already proxied, local asset, or data/blob URI
  if (
    trimmed.startsWith('/api/image-proxy') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/assets/')
  ) {
    return trimmed;
  }

  // Relative path on same origin
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Any external HTTP/HTTPS image URL (like cdni.pornpics.com)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}
