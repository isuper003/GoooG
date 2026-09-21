import type {
  CategoryDTO,
  CharacterDTO,
  LabelDTO,
  HomePreviewsDTO,
  GameSessionCreateResponse,
  GameAnswerResponse,
  StatsOverview,
  ConfusedPair,
} from '../../shared/types';
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

  getCharacters: (params: CharacterListParams = {}) => {
    const search = new URLSearchParams();
    if (params.category) search.set('category', params.category);
    if (params.label !== undefined) search.set('label', String(params.label));
    if (params.search) search.set('search', params.search);
    if (params.sort) search.set('sort', params.sort);
    const qs = search.toString();
    return request<CharacterDTO[]>(`/api/characters${qs ? `?${qs}` : ''}`);
  },

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

  crawlByNames: (names: string[], categoryKey: 'trans' | 'sluts' | 'twinks' = 'sluts') =>
    request<CrawlResponse>('/api/crawler/fetch-by-name', {
      method: 'POST',
      body: JSON.stringify({ names, categoryKey }),
    }),
};

interface CrawledItem {
  name: string;
  avatarUrl?: string;
  categoryKey: 'trans' | 'sluts' | 'twinks';
  availableImages: string[];
}

interface CrawlResponse {
  categoryKey: 'trans' | 'sluts' | 'twinks';
  totalFound: number;
  items: CrawledItem[];
}
