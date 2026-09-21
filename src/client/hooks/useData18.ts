import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

const STALE = 5 * 60_000;

export function useData18Scenes(page: number, enabled = true) {
  return useQuery({
    queryKey: ['data18', 'scenes', page],
    queryFn: () => apiClient.getData18Scenes(page),
    placeholderData: keepPreviousData,
    staleTime: STALE,
    enabled,
  });
}

export function useData18Movies(page: number, enabled = true) {
  return useQuery({
    queryKey: ['data18', 'movies', page],
    queryFn: () => apiClient.getData18Movies(page),
    placeholderData: keepPreviousData,
    staleTime: STALE,
    enabled,
  });
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
