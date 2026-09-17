import { useState, useEffect, useCallback } from 'react';
import { LocationService } from '../services/location/locationService';

export type PermissionType = 'location' | 'notification' | 'orientation';

interface PermissionState {
  status: 'prompt' | 'granted' | 'denied' | 'unknown';
  isLoading: boolean;
}

export const usePermissions = () => {
  const [permissions, setPermissions] = useState<Record<PermissionType, PermissionState>>({
    location: { status: 'prompt', isLoading: false },
    notification: { status: 'prompt', isLoading: false },
    orientation: { status: 'prompt', isLoading: false },
  });

  const locationService = new LocationService();

  const requestLocationPermission = useCallback(async () => {
    setPermissions(prev => ({
      ...prev,
      location: { ...prev.location, isLoading: true },
    }));

    try {
      // Check if iOS device
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      let granted = false;
      if (isIOS) {
        // Use iOS-specific permission request
        granted = await locationService.requestIOSPermission();
      } else {
        // Use standard permission request
        granted = await locationService.requestPermission();
      }
      
      setPermissions(prev => ({
        ...prev,
        location: { status: granted ? 'granted' : 'denied', isLoading: false },
      }));
      return granted;
    } catch (error) {
      setPermissions(prev => ({
        ...prev,
        location: { status: 'denied', isLoading: false },
      }));
      return false;
    }
  }, [locationService]);

  const requestNotificationPermission = useCallback(async () => {
    setPermissions(prev => ({
      ...prev,
      notification: { ...prev.notification, isLoading: true },
    }));

    try {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        setPermissions(prev => ({
          ...prev,
          notification: { status: granted ? 'granted' : 'denied', isLoading: false },
        }));
        return granted;
      } else {
        setPermissions(prev => ({
          ...prev,
          notification: { status: 'unknown', isLoading: false },
        }));
        return false;
      }
    } catch (error) {
      setPermissions(prev => ({
        ...prev,
        notification: { status: 'denied', isLoading: false },
      }));
      return false;
    }
  }, []);

  const requestOrientationPermission = useCallback(async () => {
    setPermissions(prev => ({
      ...prev,
      orientation: { ...prev.orientation, isLoading: true },
    }));

    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        const granted = permission === 'granted';
        setPermissions(prev => ({
          ...prev,
          orientation: { status: granted ? 'granted' : 'denied', isLoading: false },
        }));
        return granted;
      } else {
        // iOS 13+ doesn't support, or non-iOS device
        setPermissions(prev => ({
          ...prev,
          orientation: { status: 'unknown', isLoading: false },
        }));
        return true; // Assume granted on non-iOS
      }
    } catch (error) {
      setPermissions(prev => ({
        ...prev,
        orientation: { status: 'denied', isLoading: false },
      }));
      return false;
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    // Check location permission
    try {
      const locationStatus = await locationService.checkPermission();
      setPermissions(prev => ({
        ...prev,
        location: { status: locationStatus, isLoading: false },
      }));
    } catch (error) {
      setPermissions(prev => ({
        ...prev,
        location: { status: 'unknown', isLoading: false },
      }));
    }

    // Check notification permission
    if ('Notification' in window) {
      const notificationStatus = Notification.permission;
      setPermissions(prev => ({
        ...prev,
        notification: { status: notificationStatus as any, isLoading: false },
      }));
    }

    // Orientation permission can't be checked without requesting
  }, [locationService]);

  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    requestLocationPermission,
    requestNotificationPermission,
    requestOrientationPermission,
    checkPermissions,
  };
};