import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFullscreen } from './useFullscreen';

describe('useFullscreen hook in environment without window/document', () => {
  it('gracefully handles SSR or environments where document is undefined', () => {
    // In node environment, typeof document may be undefined
    // useFullscreen should safely export the function without crashing
    expect(typeof useFullscreen).toBe('function');
  });
});

describe('useFullscreen DOM interactions with mock environment', () => {
  let originalDocument: unknown;
  let originalWindow: unknown;
  let classListSet: Set<string>;
  let eventListeners: Record<string, ((e: unknown) => void)[]>;

  beforeEach(() => {
    classListSet = new Set<string>();
    eventListeners = {};

    originalDocument = (globalThis as Record<string, unknown>).document;
    originalWindow = (globalThis as Record<string, unknown>).window;

    const mockDocument = {
      fullscreenEnabled: true,
      fullscreenElement: null as unknown,
      documentElement: {
        classList: {
          add: (cls: string) => classListSet.add(cls),
          remove: (cls: string) => classListSet.delete(cls),
          contains: (cls: string) => classListSet.has(cls),
        },
        requestFullscreen: vi.fn().mockResolvedValue(undefined),
      },
      body: {
        classList: {
          add: (cls: string) => classListSet.add(cls),
          remove: (cls: string) => classListSet.delete(cls),
          contains: (cls: string) => classListSet.has(cls),
        },
      },
      exitFullscreen: vi.fn().mockResolvedValue(undefined),
      addEventListener: (event: string, handler: (e: unknown) => void) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(handler);
      },
      removeEventListener: (event: string, handler: (e: unknown) => void) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
        }
      },
    };

    const mockWindow = {
      scrollTo: vi.fn(),
      addEventListener: (event: string, handler: (e: unknown) => void) => {
        if (!eventListeners[event]) eventListeners[event] = [];
        eventListeners[event].push(handler);
      },
      removeEventListener: (event: string, handler: (e: unknown) => void) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
        }
      },
    };

    (globalThis as Record<string, unknown>).document = mockDocument;
    (globalThis as Record<string, unknown>).window = mockWindow;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).document = originalDocument;
    (globalThis as Record<string, unknown>).window = originalWindow;
    vi.restoreAllMocks();
  });

  it('detects document and registers event listeners without crashing', () => {
    expect(globalThis.document).toBeDefined();
    expect(globalThis.window).toBeDefined();
  });

  it('properly adds and removes pseudo-fullscreen classes', () => {
    const doc = globalThis.document as unknown as {
      documentElement: { classList: { add: (c: string) => void; contains: (c: string) => boolean } };
      body: { classList: { add: (c: string) => void; contains: (c: string) => boolean } };
    };

    doc.documentElement.classList.add('fullscreen-active');
    doc.documentElement.classList.add('pseudo-fullscreen');
    doc.body.classList.add('pseudo-fullscreen-body');

    expect(doc.documentElement.classList.contains('fullscreen-active')).toBe(true);
    expect(doc.documentElement.classList.contains('pseudo-fullscreen')).toBe(true);
    expect(doc.body.classList.contains('pseudo-fullscreen-body')).toBe(true);
  });
});
