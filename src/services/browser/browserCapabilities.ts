export interface BrowserCapabilities {
  geolocation: boolean;
  deviceOrientation: boolean;
  localStorage: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  webAssembly: boolean;
}

export const checkBrowserCapabilities = (): BrowserCapabilities => {
  const capabilities: BrowserCapabilities = {
    geolocation: 'geolocation' in navigator,
    deviceOrientation: 'DeviceOrientationEvent' in window,
    localStorage: (() => {
      try {
        const test = '__localStorage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    })(),
    indexedDB: 'indexedDB' in window,
    serviceWorker: 'serviceWorker' in navigator,
    webAssembly: 'WebAssembly' in window,
  };

  return capabilities;
};

export const getCapabilityStatus = (capability: boolean): string => {
  if (capability) return 'supported';
  return 'unsupported';
};

export const checkGeolocationPermission = async (): Promise<PermissionState> => {
  if (!('permissions' in navigator)) {
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state;
  } catch (error) {
    console.error('Error checking geolocation permission:', error);
    return 'prompt';
  }
};

export const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const isTouchDevice = (): boolean => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};