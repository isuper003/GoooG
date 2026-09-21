import { describe, it, expect } from 'vitest';
import { dedupeById, nextPageIfNew } from './useData18';

const items = (...ids: string[]) => ids.map((id) => ({ id }));

describe('dedupeById', () => {
  it('flattens pages and keeps the first occurrence of each id', () => {
    expect(dedupeById([items('1', '2'), items('2', '3'), items('3', '4')])).toEqual(items('1', '2', '3', '4'));
  });

  it('handles no pages', () => {
    expect(dedupeById([])).toEqual([]);
  });
});

describe('nextPageIfNew', () => {
  it('asks for the following page while pages keep bringing new items', () => {
    expect(nextPageIfNew(2, items('30', '31'), [items('1', '2')])).toBe(3);
  });

  it('stops on an empty page', () => {
    expect(nextPageIfNew(3, [], [items('1')])).toBeUndefined();
  });

  it('stops when the site repeats a page it already returned', () => {
    expect(nextPageIfNew(4, items('1', '2'), [items('1', '2'), items('3')])).toBeUndefined();
  });

  it('keeps going when only some items of the page were seen before', () => {
    expect(nextPageIfNew(2, items('2', '3'), [items('1', '2')])).toBe(3);
  });
});
