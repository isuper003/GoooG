import type { GalleryCard } from './galleryTypes';

export interface Data18CastMember {
  name: string;
  slug: string;
  url: string;
}

export interface Data18StudioRef {
  name: string;
  slug: string;
  url: string;
}

export interface Data18Scene {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  date: string | null;
  cast: Data18CastMember[];
  studio: Data18StudioRef | null;
  photosCount?: string;
}

export interface Data18Movie {
  id: string;
  /** URL segment after /movies/, e.g. "1213399-tanya-tate-is-milfwoman". */
  slug: string;
  title: string;
  url: string;
  coverUrl: string;
  studio: Data18StudioRef | null;
  date: string | null;
  photosCount?: string;
}

export interface Data18SearchResult {
  title: string;
  url: string;
  slug: string;
  type: 'performer' | 'studio' | 'series' | 'movie' | 'scene';
  avatarUrl?: string;
  scenesCount?: string;
  moviesCount?: string;
  lastUpdate?: string;
}

/** Counters shown in the entity's sidebar menu (all-time totals, not page sizes). */
export interface Data18EntityStats {
  scenes?: number;
  movies?: number;
  vr?: number;
  directors?: number;
  pairings?: number;
  studios?: number;
  tags?: number;
}

export interface Data18EntityDetail {
  name: string;
  slug: string;
  /** Canonical site path, e.g. `/name/cory-chase`. */
  path: string;
  type: 'performer' | 'studio' | 'site' | 'network' | 'series';
  avatarUrl?: string;
  /** Total scenes / movies on Data18 (falls back to the number on this page). */
  scenesCount?: number;
  moviesCount?: number;
  stats: Data18EntityStats;
  /** Which list `page` / `totalPages` refer to (scenes or the full movies tab). */
  tab: 'scenes' | 'movies';
  page: number;
  totalPages: number;
  scenes: Data18Scene[];
  movies: Data18Movie[];
}

export interface Data18Named {
  name: string;
  slug: string;
  url: string;
  imageUrl?: string;
  /** Number of scenes (together / for this studio / with this tag). */
  scenes?: number;
  movies?: number;
}

/** Extra profile data for a performer, loaded lazily from the sub-pages. */
export interface Data18PerformerExtra {
  slug: string;
  studios: Data18Named[];
  pairings: Data18Named[];
  tags: Data18Named[];
}

export interface Data18Tag {
  name: string;
  slug: string;
  category?: string;
}

export interface Data18GalleryImage {
  url: string;
  label?: string;
}

export interface Data18SceneDetail {
  id: string;
  title: string;
  url: string;
  /** Main preview image (largest available). */
  imageUrl: string;
  thumbUrl: string;
  releaseDate: string | null;
  duration: string | null;
  description: string | null;
  photosCount?: number;
  studio: Data18StudioRef | null;
  series: { name: string; url: string } | null;
  movie: { id: string; slug: string; title: string; url: string; sceneNumber?: string } | null;
  cast: (Data18CastMember & { avatarUrl: string })[];
  tags: Data18Tag[];
  siblingScenes: { id: string; title: string; url: string; imageUrl: string; label?: string }[];
}

export interface Data18MovieDetail {
  id: string;
  slug: string;
  title: string;
  url: string;
  coverUrl: string;
  backCoverUrl?: string;
  posterUrl?: string;
  releaseDate: string | null;
  year: string | null;
  duration: string | null;
  description: string | null;
  photosCount?: number;
  scenesCount?: number;
  studio: Data18StudioRef | null;
  directors: Data18CastMember[];
  cast: (Data18CastMember & { avatarUrl: string })[];
  tags: Data18Tag[];
  scenes: { id: string; title: string; url: string; imageUrl: string; cast: string[] }[];
}

export interface Data18PornPicsResult {
  name: string;
  /** Where the images came from: the performer's own page, a search page, or nothing found. */
  source: 'profile' | 'search' | 'none';
  pageUrl: string;
  searchUrl: string;
  avatarUrl: string;
  images: string[];
  /** The galleries behind those covers, so their full photo sets can be opened. */
  galleries: GalleryCard[];
}

export interface Data18ScenesResponse {
  page: number;
  scenes: Data18Scene[];
  totalFound?: number;
}

export interface Data18MoviesResponse {
  page: number;
  movies: Data18Movie[];
  totalFound?: number;
}

export interface Data18SearchResponse {
  query: string;
  type: string;
  results: Data18SearchResult[];
}
