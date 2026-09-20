import type { CharacterDTO } from '../../../shared/types';

/**
 * Fisher-Yates shuffle algorithm on an array copy
 */
export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface SampleByCategoryOptions {
  characters: readonly CharacterDTO[];
  categoryCounts: Record<string, number>;
  activeOnly?: boolean;
}

export interface SampleTotalRandomOptions {
  characters: readonly CharacterDTO[];
  count: number;
  activeOnly?: boolean;
}

/**
 * Samples a specific count of characters from each category
 */
export function sampleCharactersByCategory({
  characters,
  categoryCounts,
  activeOnly = true,
}: SampleByCategoryOptions): CharacterDTO[] {
  const pool = activeOnly ? characters.filter((c) => c.isActive) : [...characters];
  const results: CharacterDTO[] = [];

  for (const [categoryKey, requestedCount] of Object.entries(categoryCounts)) {
    if (requestedCount <= 0) continue;

    const matching = pool.filter((c) => c.categoryKey === categoryKey);
    const shuffled = shuffleArray(matching);
    const selected = shuffled.slice(0, Math.min(requestedCount, matching.length));
    results.push(...selected);
  }

  // Shuffle final combined results for a dynamic surprise experience
  return shuffleArray(results);
}

/**
 * Samples a total count of random characters across all categories
 */
export function sampleTotalRandomCharacters({
  characters,
  count,
  activeOnly = true,
}: SampleTotalRandomOptions): CharacterDTO[] {
  const pool = activeOnly ? characters.filter((c) => c.isActive) : [...characters];
  if (count <= 0 || pool.length === 0) return [];

  const shuffled = shuffleArray(pool);
  return shuffled.slice(0, Math.min(count, pool.length));
}
