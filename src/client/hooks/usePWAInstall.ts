import { useState, useEffect, useCallback } from 'react';

// Custom interface for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      const runningStandalone = isStandaloneMedia || isNavigatorStandalone;
      setIsInstalled(runningStandalone);
      if (runningStandalone) {
        setIsInstallable(false);
      }
    };

    checkStandalone();

    // 2. Check if iOS device
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    setIsIOS(isIosDevice);

    // 3. Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) setIsInstallable(false);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // 4. Capture beforeinstallprompt event (Android / Chromium / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // 5. App installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsGuideOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
        }
        setDeferredPrompt(null);
        return choice.outcome;
      } catch (err) {
        console.warn('[PWA] Prompt install error:', err);
      }
    } else {
      // If no native prompt available (e.g. iOS or manual browser menu), open guidance modal
      setIsGuideOpen(true);
    }
    return null;
  }, [deferredPrompt]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isGuideOpen,
    setIsGuideOpen,
    promptInstall,
  };
}
