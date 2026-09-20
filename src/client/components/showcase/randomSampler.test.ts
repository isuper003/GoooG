import { describe, it, expect } from 'vitest';
import {
  shuffleArray,
  sampleCharactersByCategory,
  sampleTotalRandomCharacters,
} from './randomSampler';
import type { CharacterDTO } from '../../../shared/types';

function createMockCharacter(id: number, categoryKey: string, isActive = true): CharacterDTO {
  return {
    id,
    name: `Char ${id}`,
    categoryKey,
    isActive,
    srsLevel: 1,
    correctCount: 5,
    wrongCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    images: [{ id: id * 10, url: `https://example.com/${id}.jpg`, position: 0 }],
    labels: [],
  };
}

describe('randomSampler', () => {
  const characters: CharacterDTO[] = [
    createMockCharacter(1, 'sluts', true),
    createMockCharacter(2, 'sluts', true),
    createMockCharacter(3, 'sluts', false), // inactive
    createMockCharacter(4, 'trans', true),
    createMockCharacter(5, 'trans', true),
    createMockCharacter(6, 'trans', true),
    createMockCharacter(7, 'twinks', true),
  ];

  describe('shuffleArray', () => {
    it('returns a new array with the same elements', () => {
      const items = [1, 2, 3, 4, 5];
      const result = shuffleArray(items);
      expect(result).toHaveLength(items.length);
      expect(new Set(result)).toEqual(new Set(items));
    });
  });

  describe('sampleTotalRandomCharacters', () => {
    it('samples exactly requested count from active characters', () => {
      const result = sampleTotalRandomCharacters({
        characters,
        count: 3,
        activeOnly: true,
      });
      expect(result).toHaveLength(3);
      // All selected should be active
      expect(result.every((c) => c.isActive)).toBe(true);
      // All selected IDs should be unique
      const uniqueIds = new Set(result.map((c) => c.id));
      expect(uniqueIds.size).toBe(3);
    });

    it('caps at total available characters when requested count exceeds total', () => {
      const result = sampleTotalRandomCharacters({
        characters,
        count: 100,
        activeOnly: true,
      });
      // There are 6 active characters
      expect(result).toHaveLength(6);
    });

    it('returns empty array when count is 0', () => {
      const result = sampleTotalRandomCharacters({
        characters,
        count: 0,
      });
      expect(result).toEqual([]);
    });
  });

  describe('sampleCharactersByCategory', () => {
    it('samples specific counts from specified categories', () => {
      const result = sampleCharactersByCategory({
        characters,
        categoryCounts: {
          sluts: 2,
          trans: 1,
          twinks: 1,
        },
        activeOnly: true,
      });

      expect(result).toHaveLength(4);
      expect(result.filter((c) => c.categoryKey === 'sluts')).toHaveLength(2);
      expect(result.filter((c) => c.categoryKey === 'trans')).toHaveLength(1);
      expect(result.filter((c) => c.categoryKey === 'twinks')).toHaveLength(1);
    });

    it('handles requests exceeding category count gracefully', () => {
      const result = sampleCharactersByCategory({
        characters,
        categoryCounts: {
          twinks: 10, // only 1 active exists
        },
        activeOnly: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].categoryKey).toBe('twinks');
    });

    it('ignores categories with 0 or negative count', () => {
      const result = sampleCharactersByCategory({
        characters,
        categoryCounts: {
          sluts: 0,
          trans: 2,
        },
      });

      expect(result).toHaveLength(2);
      expect(result.every((c) => c.categoryKey === 'trans')).toBe(true);
    });
  });
});
