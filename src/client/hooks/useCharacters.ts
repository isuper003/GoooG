import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, type CharacterListParams } from '../lib/apiClient';
import type { CharacterCreateInput, CharacterUpdateInput } from '../../shared/validation';

export function useCharacters(params: CharacterListParams = {}) {
  return useQuery({
    queryKey: ['characters', params],
    queryFn: () => apiClient.getCharacters(params),
    placeholderData: (prev) => prev,
  });
}

function invalidateCharacterQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['characters'] });
  qc.invalidateQueries({ queryKey: ['home-previews'] });
  qc.invalidateQueries({ queryKey: ['stats'] });
}

export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CharacterCreateInput) => apiClient.createCharacter(body),
    onSuccess: () => invalidateCharacterQueries(qc),
  });
}

export function useUpdateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CharacterUpdateInput }) =>
      apiClient.updateCharacter(id, body),
    onSuccess: () => invalidateCharacterQueries(qc),
  });
}

export function useSetCharacterActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiClient.setCharacterActive(id, { isActive }),
    onSuccess: () => invalidateCharacterQueries(qc),
  });
}

export function useDeleteCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteCharacter(id),
    onSuccess: () => invalidateCharacterQueries(qc),
  });
}
