import { useState, useCallback, useRef, useEffect } from 'react';
import { getSettingsService } from '../services/settings/settingsService';

export function useWakeLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const wakeLockRef = useRef<any>(null);
  const settingsService = getSettingsService();
  const [hudWakeLock, setHudWakeLock] = useState(settingsService.getHudWakeLock());

  useEffect(() => {
    // Check if Wake Lock API is supported
    const supported = 'wakeLock' in navigator;
    setIsSupported(supported);

    // Listen for visibility changes to reacquire wake lock
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isLocked && !wakeLockRef.current) {
        // Attempt to reacquire wake lock when page becomes visible
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isLocked]);

  const requestWakeLock = useCallback(async () => {
    if (!isSupported) {
      console.warn('Wake Lock API is not supported');
      return false;
    }

    if (!hudWakeLock) {
      console.log('Wake Lock is disabled in settings');
      return false;
    }

    if (wakeLockRef.current) {
      // Already locked
      return true;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsLocked(true);

      // Listen for wake lock release
      wakeLockRef.current.addEventListener('release', () => {
        console.log('Wake Lock was released');
        wakeLockRef.current = null;
        setIsLocked(false);
      });

      return true;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      wakeLockRef.current = null;
      setIsLocked(false);
      return false;
    }
  }, [isSupported, hudWakeLock]);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsLocked(false);
    }
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (isLocked) {
      releaseWakeLock();
      return false;
    } else {
      return requestWakeLock();
    }
  }, [isLocked, requestWakeLock, releaseWakeLock]);

  return {
    isLocked,
    isSupported,
    requestWakeLock,
    releaseWakeLock,
    toggleWakeLock,
  };
}
