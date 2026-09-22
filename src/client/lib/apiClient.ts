import type {
  CategoryDTO,
  CharacterDTO,
  LabelDTO,
  HomePreviewsDTO,
  GameSessionCreateResponse,
  GameAnswerResponse,
  StatsOverview,
  ConfusedPair,
  ReviewQueuesDTO,
  HeatmapResponse,
} from '../../shared/types';
import type { GalleryCard, GalleryImagesResponse } from '../../shared/galleryTypes';
import type {
  Data18ScenesResponse,
  Data18MoviesResponse,
  Data18SearchResponse,
  Data18EntityDetail,
  Data18PerformerExtra,
  Data18SceneDetail,
  Data18MovieDetail,
  Data18PornPicsResult,
  Data18Favorite,
  Data18FeedResponse,
} from '../../shared/data18Types';
import type {
  GameSessionCreateInput,
  GameAnswerInput,
  GameSessionFinishInput,
  CharacterCreateInput,
  CharacterUpdateInput,
  CharacterActiveInput,
  LabelCreateInput,
} from '../../shared/validation';

export type CharacterSort =
  | 'category'
  | 'newest'
  | 'oldest'
  | 'most_correct'
  | 'least_correct'
  | 'weakest';

export interface CharacterListParams {
  category?: 'trans' | 'sluts' | 'twinks' | 'mix';
  label?: number;
  search?: string;
  sort?: CharacterSort;
}

const API_SECRET = import.meta.env.VITE_API_WRITE_SECRET as string | undefined;

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (API_SECRET) headers.set('X-App-Secret', API_SECRET);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(path, { ...init, headers });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // response had no JSON body
    }
    let message = res.statusText;
    if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>;
      if (typeof b.error === 'string') {
        message = b.error;
      } else if (b.error && typeof b.error === 'object' && 'message' in (b.error as object)) {
        message = String((b.error as { message: unknown }).message);
      } else if (typeof b.message === 'string') {
        message = b.message;
      }
    }
    throw new ApiError(res.status, body, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  getCategories: () => request<CategoryDTO[]>('/api/categories'),

  getHomePreviews: () => request<HomePreviewsDTO>('/api/home-previews'),

  getReviewQueues: () => request<ReviewQueuesDTO>('/api/review/queues'),

  getCharacters: (params: CharacterListParams = {}) => {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
    if (params.label !== undefined) search.set('label', String(params.label));
    if (params.search) search.set('search', params.search);
    if (params.sort) search.set('sort', params.sort);
    const qs = search.toString();
    return request<CharacterDTO[]>(`/api/characters${qs ? `?${qs}` : ''}`);
  },

  getCharacter: (id: number) => request<CharacterDTO>(`/api/characters/${id}`),

  createCharacter: (body: CharacterCreateInput) =>
    request<CharacterDTO>('/api/characters', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCharacter: (id: number, body: CharacterUpdateInput) =>
    request<CharacterDTO>(`/api/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  setCharacterActive: (id: number, body: CharacterActiveInput) =>
    request<CharacterDTO>(`/api/characters/${id}/active`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  deleteCharacter: (id: number) =>
    request<{ ok: boolean }>(`/api/characters/${id}`, { method: 'DELETE' }),

  getLabels: () => request<LabelDTO[]>('/api/labels'),

  createLabel: (body: LabelCreateInput) =>
    request<LabelDTO>('/api/labels', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteLabel: (id: number) => request<{ ok: boolean }>(`/api/labels/${id}`, { method: 'DELETE' }),

  getStatsOverview: () => request<StatsOverview>('/api/stats/overview'),

  getConfusions: (limit?: number) => {
    const qs = limit !== undefined ? `?limit=${encodeURIComponent(limit)}` : '';
    return request<ConfusedPair[]>(`/api/stats/confusions${qs}`);
  },

  getHeatmap: () => request<HeatmapResponse>('/api/stats/heatmap'),

  createGameSession: (body: GameSessionCreateInput) =>
    request<GameSessionCreateResponse>('/api/game-sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  postAnswer: (sessionId: number, body: GameAnswerInput) =>
    request<GameAnswerResponse>(`/api/game-sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  finishSession: (sessionId: number, body: GameSessionFinishInput) =>
    request<{ ok: boolean }>(`/api/game-sessions/${sessionId}/finish`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  crawlUrl: (url: string, categoryKey: 'trans' | 'sluts' | 'twinks' = 'sluts') =>
    request<CrawlResponse>('/api/crawler/fetch', {
      method: 'POST',
      body: JSON.stringify({ url, categoryKey }),
    }),

  crawlByNames: (
    names: string[],
    categoryKey: 'trans' | 'sluts' | 'twinks' = 'sluts',
    forceWeb = false
  ) =>
    request<CrawlResponse>('/api/crawler/fetch-by-name', {
      method: 'POST',
      body: JSON.stringify({ names, categoryKey, forceWeb }),
    }),

  // Data18 Explorer API
  getData18Scenes: (page = 1) =>
    request<Data18ScenesResponse>(`/api/data18/scenes?page=${page}`),

  getData18Upcoming: (page = 1) =>
    request<Data18ScenesResponse>(`/api/data18/upcoming?page=${page}`),

  getData18Movies: (page = 1) =>
    request<Data18MoviesResponse>(`/api/data18/movies?page=${page}`),

  searchData18: (q: string, type: 'performer' | 'studio' | 'series' | 'all' = 'all') =>
    request<Data18SearchResponse>(
      `/api/data18/search?q=${encodeURIComponent(q)}&type=${type}`
    ),

  getData18Entity: (path: string, page = 1, tab: 'scenes' | 'movies' = 'scenes') =>
    request<Data18EntityDetail>(
      `/api/data18/entity?path=${encodeURIComponent(path)}&page=${page}&tab=${tab}`
    ),

  getData18PerformerExtra: (slug: string) =>
    request<Data18PerformerExtra>(`/api/data18/performer-extra?slug=${encodeURIComponent(slug)}`),

  getData18Scene: (id: string) =>
    request<Data18SceneDetail>(`/api/data18/scene/${encodeURIComponent(id)}`),

  getData18Movie: (slug: string) =>
    request<Data18MovieDetail>(`/api/data18/movie/${encodeURIComponent(slug)}`),

  getData18Favorites: () => request<{ favorites: Data18Favorite[] }>('/api/data18/favorites'),

  addData18Favorite: (path: string) =>
    request<Data18Favorite>('/api/data18/favorites', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  removeData18Favorite: (path: string) =>
    request<{ ok: boolean }>(`/api/data18/favorites?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    }),

  markData18Seen: (items: { path: string; sceneId: string }[]) =>
    request<{ ok: boolean; updated: number }>('/api/data18/favorites/seen', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  getData18Feed: () => request<Data18FeedResponse>('/api/data18/feed'),

  getGalleryImages: (url: string) =>
    request<GalleryImagesResponse>(`/api/crawler/gallery?url=${encodeURIComponent(url)}`),

  searchPornPics: (name: string) =>
    request<Data18PornPicsResult>(`/api/data18/pornpics?name=${encodeURIComponent(name)}`),

  scrapeWatchVideos: (query: string) =>
    request<WatchScrapeResponse>(`/api/watch/search?q=${encodeURIComponent(query)}`),
};

export interface ScrapedWatchVideo {
  id: string;
  siteId: string;
  siteName: string;
  siteDomain: string;
  badgeColor: string;
  title: string;
  url: string;
  thumbUrl: string;
  duration?: string;
}

export interface SiteScrapeStatus {
  siteId: string;
  siteName: string;
  siteDomain: string;
  badgeColor: string;
  count: number;
  status: 'success' | 'empty' | 'error' | 'timeout';
  error?: string;
  directSearchUrl: string;
}

export interface WatchScrapeResponse {
  query: string;
  videos: ScrapedWatchVideo[];
  siteStatuses: SiteScrapeStatus[];
  totalFound: number;
}

interface CrawledItem {
  name: string;
  avatarUrl?: string;
  galleries?: GalleryCard[];
  categoryKey: 'trans' | 'sluts' | 'twinks';
  availableImages: string[];
}

interface CrawlResponse {
  categoryKey: 'trans' | 'sluts' | 'twinks';
  totalFound: number;
  items: CrawledItem[];
}
