import { describe, it, expect } from 'vitest';
import { computeCoverAndPan } from './MasterOverlayPlayer';

describe('MasterOverlayPlayer - computeCoverAndPan', () => {
  const video16x9 = { width: 1920, height: 1080 };
  const mobilePortrait = { width: 360, height: 740 };
  const desktopUltraWide = { width: 2560, height: 1080 };

  it('letterboxes in contain mode on a vertical mobile phone screen', () => {
    const result = computeCoverAndPan(
      mobilePortrait.width,
      mobilePortrait.height,
      video16x9.width,
      video16x9.height,
      'contain',
      1.0
    );

    // In contain on mobile portrait: width fills screen (scaleX = 1), height is letterboxed (scaleY < 1)
    expect(result.scaleX).toBeCloseTo(1.0, 3);
    expect(result.scaleY).toBeLessThan(1.0);
    expect(result.maxPanX).toBe(0);
    expect(result.maxPanY).toBe(0);
  });

  it('fills mobile portrait screen without black bars in cover mode', () => {
    const result = computeCoverAndPan(
      mobilePortrait.width,
      mobilePortrait.height,
      video16x9.width,
      video16x9.height,
      'cover',
      1.0
    );

    // In cover on mobile portrait: height fills screen (scaleY = 1), width expands beyond screen (scaleX > 1)
    expect(result.scaleY).toBeCloseTo(1.0, 3);
    expect(result.scaleX).toBeGreaterThan(1.0);
    // Pan is enabled horizontally to reveal cropped parts
    expect(result.maxPanX).toBeGreaterThan(0);
    expect(result.maxPanY).toBe(0);
  });

  it('pillarboxes in contain mode on ultrawide desktop', () => {
    const result = computeCoverAndPan(
      desktopUltraWide.width,
      desktopUltraWide.height,
      video16x9.width,
      video16x9.height,
      'contain',
      1.0
    );

    expect(result.scaleY).toBeCloseTo(1.0, 3);
    expect(result.scaleX).toBeLessThan(1.0);
    expect(result.maxPanX).toBe(0);
    expect(result.maxPanY).toBe(0);
  });

  it('fills ultrawide desktop in cover mode without pillarboxes', () => {
    const result = computeCoverAndPan(
      desktopUltraWide.width,
      desktopUltraWide.height,
      video16x9.width,
      video16x9.height,
      'cover',
      1.0
    );

    expect(result.scaleX).toBeCloseTo(1.0, 3);
    expect(result.scaleY).toBeGreaterThan(1.0);
    expect(result.maxPanY).toBeGreaterThan(0);
  });

  it('scales accurately with zoom factor', () => {
    const base = computeCoverAndPan(
      mobilePortrait.width,
      mobilePortrait.height,
      video16x9.width,
      video16x9.height,
      'contain',
      1.0
    );

    const zoomed = computeCoverAndPan(
      mobilePortrait.width,
      mobilePortrait.height,
      video16x9.width,
      video16x9.height,
      'contain',
      2.5
    );

    expect(zoomed.scaleX).toBeCloseTo(base.scaleX * 2.5, 3);
    expect(zoomed.scaleY).toBeCloseTo(base.scaleY * 2.5, 3);
    expect(zoomed.maxPanX).toBeGreaterThan(0);

    // When zoomed enough to exceed vertical canvas (e.g. 4.0x)
    const superZoomed = computeCoverAndPan(
      mobilePortrait.width,
      mobilePortrait.height,
      video16x9.width,
      video16x9.height,
      'contain',
      4.0
    );
    expect(superZoomed.scaleY).toBeGreaterThan(1.0);
    expect(superZoomed.maxPanY).toBeGreaterThan(0);
  });
});
