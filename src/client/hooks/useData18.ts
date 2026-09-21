import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiClient } from '../lib/apiClient';

const STALE = 5 * 60_000;

export function dedupeById<T extends { id: string }>(pages: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of pages.flat()) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Whether the last loaded page brought anything new; a repeated or empty page ends the list. */
export function nextPageIfNew<T extends { id: string }>(
  lastPage: number,
  lastItems: T[],
  earlierPages: T[][]
): number | undefined {
  if (lastItems.length === 0) return undefined;
  const earlier = new Set(earlierPages.flat().map((item) => item.id));
  return lastItems.some((item) => !earlier.has(item.id)) ? lastPage + 1 : undefined;
}

export type SceneFeedKind = 'latest' | 'upcoming';

/** Endless list of scenes: pages are appended as the user scrolls, starting at `startPage`. */
export function useData18InfiniteScenes(kind: SceneFeedKind, startPage: number, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: ['data18', 'infinite-scenes', kind, startPage],
    queryFn: ({ pageParam }) =>
      kind === 'upcoming' ? apiClient.getData18Upcoming(pageParam) : apiClient.getData18Scenes(pageParam),
    initialPageParam: startPage,
    getNextPageParam: (last, all) =>
      nextPageIfNew(
        last.page,
        last.scenes,
        all.slice(0, -1).map((p) => p.scenes)
      ),
    staleTime: STALE,
    enabled,
  });
  const scenes = useMemo(() => dedupeById(query.data?.pages.map((p) => p.scenes) ?? []), [query.data]);
  return { ...query, scenes, totalFound: query.data?.pages[0]?.totalFound };
}

/** Endless list of the latest movies, starting at `startPage`. */
export function useData18InfiniteMovies(startPage: number, enabled = true) {
  const query = useInfiniteQuery({
    queryKey: ['data18', 'infinite-movies', startPage],
    queryFn: ({ pageParam }) => apiClient.getData18Movies(pageParam),
    initialPageParam: startPage,
    getNextPageParam: (last, all) =>
      nextPageIfNew(
        last.page,
        last.movies,
        all.slice(0, -1).map((p) => p.movies)
      ),
    staleTime: STALE,
    enabled,
  });
  const movies = useMemo(() => dedupeById(query.data?.pages.map((p) => p.movies) ?? []), [query.data]);
  return { ...query, movies, totalFound: query.data?.pages[0]?.totalFound };
}

export function useData18Entity(path: string | null, page: number, tab: 'scenes' | 'movies') {
  return useQuery({
    queryKey: ['data18', 'entity', path, page, tab],
    queryFn: () => apiClient.getData18Entity(path!, page, tab),
    // Keep the old page visible while paging through one entity, but never
    // show another entity's data while a different one loads.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[2] === path ? previous : undefined,
    staleTime: STALE,
    enabled: !!path,
  });
}

export function useData18PerformerExtra(slug: string | null) {
  return useQuery({
    queryKey: ['data18', 'performer-extra', slug],
    queryFn: () => apiClient.getData18PerformerExtra(slug!),
    staleTime: 15 * 60_000,
    enabled: !!slug,
  });
}

export function useData18Scene(id: string | undefined) {
  return useQuery({
    queryKey: ['data18', 'scene', id],
    queryFn: () => apiClient.getData18Scene(id!),
    staleTime: 30 * 60_000,
    enabled: !!id,
  });
}

export function useData18Movie(slug: string | undefined) {
  return useQuery({
    queryKey: ['data18', 'movie', slug],
    queryFn: () => apiClient.getData18Movie(slug!),
    staleTime: 30 * 60_000,
    enabled: !!slug,
  });
}

/** Only runs once `enabled` flips on (the user asked for it) and is cached afterwards. */
export function usePornPicsSearch(name: string, enabled: boolean) {
  return useQuery({
    queryKey: ['data18', 'pornpics', name.toLowerCase()],
    queryFn: () => apiClient.searchPornPics(name),
    staleTime: 30 * 60_000,
    enabled: enabled && name.trim().length >= 2,
  });
}

export function useData18Favorites() {
  return useQuery({
    queryKey: ['data18', 'favorites'],
    queryFn: () => apiClient.getData18Favorites().then((r) => r.favorites),
    staleTime: 60_000,
  });
}

/** Follows or unfollows an entity, then refreshes the favorites list and the feed. */
export function useToggleData18Favorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ path, follow }: { path: string; follow: boolean }): Promise<void> => {
      if (follow) await apiClient.addData18Favorite(path);
      else await apiClient.removeData18Favorite(path);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data18', 'favorites'] });
      qc.invalidateQueries({ queryKey: ['data18', 'feed'] });
    },
  });
}

export function useData18Feed(enabled = true) {
  return useQuery({
    queryKey: ['data18', 'feed'],
    queryFn: () => apiClient.getData18Feed(),
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useMarkData18Seen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { path: string; sceneId: string }[]) => apiClient.markData18Seen(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['data18', 'feed'] });
      qc.invalidateQueries({ queryKey: ['data18', 'favorites'] });
    },
  });
}
