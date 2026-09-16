import { useState, useEffect, useCallback, useRef } from 'react';

export function useServiceWorker() {
  const [isWaiting, setIsWaiting] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
          setRegistration(reg);
          registrationRef.current = reg;

          // Check for waiting service worker
          if (reg.waiting) {
            setIsWaiting(true);
          }

          // Listen for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setIsWaiting(true);
                }
              });
            }
          });
        })
        .catch((error) => {
          // Service worker registration failed silently
        });

      // Listen for controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    return () => {
      // Cleanup handled by browser
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (registrationRef.current && registrationRef.current.waiting) {
      registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
      setIsWaiting(false);
    }
  }, []);

  return {
    isWaiting,
    updateServiceWorker,
  };
}
