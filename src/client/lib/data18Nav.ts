/** In-app links for Data18 entities and detail pages. */

export function entityHref(path: string): string {
  return `/data18?entity=${encodeURIComponent(path)}`;
}

export const performerHref = (slug: string) => entityHref(`/name/${slug}`);
export const studioHref = (slug: string) => entityHref(`/studios/${slug}`);
export const sceneHref = (id: string) => `/data18/scene/${id}`;
export const movieHref = (slug: string) => `/data18/movie/${slug}`;

/** Path of a Data18 URL relative to the site (`https://www.data18.com/name/x` -> `/name/x`). */
export function toSitePath(url: string): string {
  return url.replace(/^https?:\/\/(?:www\.)?data18\.com/, '');
}
