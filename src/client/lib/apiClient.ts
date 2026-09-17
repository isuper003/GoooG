import type {
  CategoryDTO,
  HomePreviewsDTO,
  GameSessionCreateResponse,
  GameAnswerResponse,
} from '../../shared/types';
import type {
  GameSessionCreateInput,
  GameAnswerInput,
  GameSessionFinishInput,
} from '../../shared/validation';

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
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : res.statusText;
    throw new ApiError(res.status, body, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  getCategories: () => request<CategoryDTO[]>('/api/categories'),

  getHomePreviews: () => request<HomePreviewsDTO>('/api/home-previews'),

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
};
