import { describe, it, expect } from 'vitest';
import {
  characterCreateSchema,
  characterUpdateSchema,
  characterActiveSchema,
  labelCreateSchema,
} from './validation';

describe('characterCreateSchema', () => {
  const valid = {
    name: 'Alex Rivera',
    categoryKey: 'sluts',
    images: [{ url: 'https://a.test/1.jpg' }],
  };

  it('accepts a minimal valid payload', () => {
    expect(characterCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = characterCreateSchema.safeParse({ ...valid, name: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects zero images', () => {
    const result = characterCreateSchema.safeParse({ ...valid, images: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 6 images', () => {
    const images = Array.from({ length: 7 }, (_, i) => ({ url: `https://a.test/${i}.jpg` }));
    const result = characterCreateSchema.safeParse({ ...valid, images });
    expect(result.success).toBe(false);
  });

  it('accepts exactly 6 images', () => {
    const images = Array.from({ length: 6 }, (_, i) => ({ url: `https://a.test/${i}.jpg` }));
    expect(characterCreateSchema.safeParse({ ...valid, images }).success).toBe(true);
  });

  it('rejects a non-URL image entry', () => {
    const result = characterCreateSchema.safeParse({ ...valid, images: [{ url: 'not-a-url' }] });
    expect(result.success).toBe(false);
  });

  it('rejects an empty categoryKey', () => {
    const result = characterCreateSchema.safeParse({ ...valid, categoryKey: '' });
    expect(result.success).toBe(false);
  });

  it('labelIds and newLabelNames are optional', () => {
    expect(characterCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a non-positive labelId', () => {
    const result = characterCreateSchema.safeParse({ ...valid, labelIds: [0] });
    expect(result.success).toBe(false);
  });
});

describe('characterUpdateSchema', () => {
  it('has the same shape/constraints as create', () => {
    const valid = {
      name: 'Jordan Lee',
      categoryKey: 'trans',
      images: [{ url: 'https://a.test/1.jpg' }],
    };
    expect(characterUpdateSchema.safeParse(valid).success).toBe(true);
    expect(characterUpdateSchema.safeParse({ ...valid, images: [] }).success).toBe(false);
  });
});

describe('characterActiveSchema', () => {
  it('accepts { isActive: true } and { isActive: false }', () => {
    expect(characterActiveSchema.safeParse({ isActive: true }).success).toBe(true);
    expect(characterActiveSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('rejects a non-boolean isActive', () => {
    expect(characterActiveSchema.safeParse({ isActive: 'true' }).success).toBe(false);
    expect(characterActiveSchema.safeParse({}).success).toBe(false);
  });
});

describe('labelCreateSchema', () => {
  it('rejects an empty name', () => {
    expect(labelCreateSchema.safeParse({ name: '  ' }).success).toBe(false);
  });

  it('accepts a valid name', () => {
    expect(labelCreateSchema.safeParse({ name: 'Redhead' }).success).toBe(true);
  });
});
