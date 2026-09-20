import { useState, useEffect, useCallback, useRef } from 'react';

// Extended Document and Element interface for vendor prefixes
interface DocumentWithFullscreen extends Document {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
}

interface ElementWithFullscreen extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
}

export interface UseFullscreenOptions {
  /** Target element to enter fullscreen for. Defaults to document.documentElement */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** Enable Screen Wake Lock to prevent screen sleep while fullscreen (supported browsers) */
  preventSleep?: boolean;
  /** Enable 'F' key keyboard shortcut */
  enableKeyShortcut?: boolean;
}

export interface UseFullscreenReturn {
  /** Whether fullscreen is currently active (either native or pseudo fallback) */
  isFullscreen: boolean;
  /** Whether native browser Fullscreen API is supported on this platform */
  isNativeSupported: boolean;
  /** Whether currently running in simulated/pseudo fullscreen (e.g. iOS Safari) */
  isPseudo: boolean;
  /** Toggle fullscreen state */
  toggleFullscreen: () => Promise<void>;
  /** Enter fullscreen */
  enterFullscreen: () => Promise<void>;
  /** Exit fullscreen */
  exitFullscreen: () => Promise<void>;
}

/**
 * Check if the native Fullscreen API is available
 */
function checkNativeFullscreenSupport(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as DocumentWithFullscreen;
  return !!(
    doc.fullscreenEnabled ||
    (doc as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled ||
    (doc as unknown as { mozFullScreenEnabled?: boolean }).mozFullScreenEnabled ||
    (doc as unknown as { msFullscreenEnabled?: boolean }).msFullscreenEnabled ||
    doc.documentElement.requestFullscreen ||
    (doc.documentElement as ElementWithFullscreen).webkitRequestFullscreen
  );
}

/**
 * Get the current active fullscreen element across browser prefixes
 */
function getActiveFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as DocumentWithFullscreen;
  return (
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.mozFullScreenElement ||
    doc.msFullscreenElement ||
    null
  );
}

export function useFullscreen(options: UseFullscreenOptions = {}): UseFullscreenReturn {
  const {
    targetRef,
    preventSleep = true,
    enableKeyShortcut = true,
  } = options;

  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return !!getActiveFullscreenElement();
  });
  const [isPseudo, setIsPseudo] = useState<boolean>(false);
  const [isNativeSupported, setIsNativeSupported] = useState<boolean>(true);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Check support on mount
  useEffect(() => {
    setIsNativeSupported(checkNativeFullscreenSupport());
  }, []);

  // Sync state with native fullscreen events
  const syncFullscreenState = useCallback(() => {
    const active = getActiveFullscreenElement();
    if (active) {
      setIsFullscreen(true);
      setIsPseudo(false);
      document.documentElement.classList.add('fullscreen-active');
    } else {
      // If we weren't in pseudo mode, clear fullscreen
      setIsFullscreen((prev) => {
        if (!prev) return false;
        // If in pseudo mode, keep state; otherwise clear
        return isPseudo;
      });
      if (!isPseudo) {
        document.documentElement.classList.remove('fullscreen-active');
      }
    }
  }, [isPseudo]);

  // Request screen wake lock to keep screen on while playing/viewing
  const acquireWakeLock = useCallback(async () => {
    if (!preventSleep || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // Non-critical, ignore if user denied or battery saver active
    }
  }, [preventSleep]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  // Enter Fullscreen (Native with iOS / mobile fallback)
  const enterFullscreen = useCallback(async () => {
    const element = (targetRef?.current || document.documentElement) as ElementWithFullscreen;

    // Try native requestFullscreen with vendor prefixes
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      } else if (element.mozRequestFullScreen) {
        await element.mozRequestFullScreen();
      } else if (element.msRequestFullscreen) {
        await element.msRequestFullscreen();
      } else {
        // Platform does not support native fullscreen (e.g., iPhone iOS Safari)
        throw new Error('Native fullscreen not supported');
      }

      setIsFullscreen(true);
      setIsPseudo(false);
      document.documentElement.classList.add('fullscreen-active');
      document.documentElement.classList.remove('pseudo-fullscreen');
      await acquireWakeLock();
    } catch {
      // Fallback: Activate simulated/pseudo-fullscreen (essential for iPhone Safari)
      setIsFullscreen(true);
      setIsPseudo(true);
      document.documentElement.classList.add('fullscreen-active', 'pseudo-fullscreen');
      document.body.classList.add('pseudo-fullscreen-body');

      // Scroll slightly to collapse mobile browser address bar where supported
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 1);
      }
      await acquireWakeLock();
    }
  }, [targetRef, acquireWakeLock]);

  // Exit Fullscreen
  const exitFullscreen = useCallback(async () => {
    const doc = document as DocumentWithFullscreen;

    if (getActiveFullscreenElement()) {
      try {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        }
      } catch (err) {
        console.warn('Failed to exit native fullscreen:', err);
      }
    }

    // Always clean up pseudo-fullscreen classes
    setIsFullscreen(false);
    setIsPseudo(false);
    document.documentElement.classList.remove('fullscreen-active', 'pseudo-fullscreen');
    document.body.classList.remove('pseudo-fullscreen-body');
    releaseWakeLock();
  }, [releaseWakeLock]);

  // Toggle helper
  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Listen to browser fullscreen events & key shortcuts
  useEffect(() => {
    const handleNativeChange = () => {
      syncFullscreenState();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      // Escape key exits pseudo fullscreen
      if (e.key === 'Escape' && isPseudo) {
        exitFullscreen();
        return;
      }

      // 'F' key toggles fullscreen (laptop convenience)
      if (enableKeyShortcut && (e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleNativeChange);
    document.addEventListener('webkitfullscreenchange', handleNativeChange);
    document.addEventListener('mozfullscreenchange', handleNativeChange);
    document.addEventListener('MSFullscreenChange', handleNativeChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleNativeChange);
      document.removeEventListener('webkitfullscreenchange', handleNativeChange);
      document.removeEventListener('mozfullscreenchange', handleNativeChange);
      document.removeEventListener('MSFullscreenChange', handleNativeChange);
      window.removeEventListener('keydown', handleKeyDown);
      releaseWakeLock();
    };
  }, [syncFullscreenState, isPseudo, exitFullscreen, toggleFullscreen, enableKeyShortcut, releaseWakeLock]);

  return {
    isFullscreen,
    isNativeSupported,
    isPseudo,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  };
}
