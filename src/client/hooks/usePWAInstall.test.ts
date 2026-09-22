import { describe, it, expect } from 'vitest';
import { usePWAInstall } from './usePWAInstall';

describe('usePWAInstall module', () => {
  it('exports usePWAInstall as a valid function', () => {
    expect(typeof usePWAInstall).toBe('function');
  });
});
