import { useState, useEffect, useCallback, useRef } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const promptShownRef = useRef(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    
    setIsStandalone(isStandaloneMode);
    setIsInstalled(isStandaloneMode);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if iOS and not installed
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    
    if (isIOS && !isStandaloneMode && !promptShownRef.current) {
      // Check if already added to home screen
      const isInStandaloneMode = (window.navigator as any).standalone === true;
      if (!isInStandaloneMode) {
        // Show iOS prompt after a delay
        iosTimer = setTimeout(() => {
          if (!promptShownRef.current && !isStandaloneMode) {
            setShowIOSPrompt(true);
          }
        }, 3000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (iosTimer) {
        clearTimeout(iosTimer);
      }
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  const dismissIOSPrompt = useCallback(() => {
    setShowIOSPrompt(false);
    promptShownRef.current = true;
  }, []);

  return {
    isInstallable,
    isInstalled,
    isStandalone,
    showIOSPrompt,
    installApp,
    dismissIOSPrompt,
  };
}
