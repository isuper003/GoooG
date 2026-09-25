import { describe, it, expect } from 'vitest';
import { computeCoverAndPan } from './MasterOverlayPlayer';

describe('MasterOverlayPlayer - computeCoverAndPan', () => {
  const video16x9 = { width: 1920, height: 1080 };
  const mobilePortrait = { width: 360, height: 740 };
  const desktopUltraWide = { width: 2560, height: 1080 };
  const desktop16x9 = { width: 1920, height: 1080 };

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

  it('scales accurately with zoom-in (> 1.0)', () => {
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

  it('supports zoom-out (< 1.0) and enables full within-screen repositioning', () => {
    const base = computeCoverAndPan(
      desktop16x9.width,
      desktop16x9.height,
      video16x9.width,
      video16x9.height,
      'contain',
      1.0
    );

    expect(base.scaleX).toBeCloseTo(1.0, 3);
    expect(base.scaleY).toBeCloseTo(1.0, 3);
    expect(base.maxPanX).toBe(0);
    expect(base.maxPanY).toBe(0);

    // Zoom out to 50% scale
    const zoomedOut50 = computeCoverAndPan(
      desktop16x9.width,
      desktop16x9.height,
      video16x9.width,
      video16x9.height,
      'contain',
      0.5
    );

    expect(zoomedOut50.scaleX).toBeCloseTo(0.5, 3);
    expect(zoomedOut50.scaleY).toBeCloseTo(0.5, 3);
    // Allow panning up to (1.0 - 0.5) = 0.5 so video can be placed anywhere on screen
    expect(zoomedOut50.maxPanX).toBeCloseTo(0.5, 3);
    expect(zoomedOut50.maxPanY).toBeCloseTo(0.5, 3);

    // Zoom out to minimum 25% scale
    const zoomedOut25 = computeCoverAndPan(
      desktop16x9.width,
      desktop16x9.height,
      video16x9.width,
      video16x9.height,
      'contain',
      0.25
    );

    expect(zoomedOut25.scaleX).toBeCloseTo(0.25, 3);
    expect(zoomedOut25.scaleY).toBeCloseTo(0.25, 3);
    expect(zoomedOut25.maxPanX).toBeCloseTo(0.75, 3);
    expect(zoomedOut25.maxPanY).toBeCloseTo(0.75, 3);
  });
});
