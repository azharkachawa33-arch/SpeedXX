import { useState, useEffect, useCallback, useRef } from 'react';
import { getOrientationService, CompassData, CompassStatus, CompassSource } from '../services/orientation';
import { getCardinalDirection, getFullDirection, formatHeading, getDirectionArrow } from '../utils/compassUtils';
import { getSettingsService } from '../services/settings/settingsService';

export function useCompass() {
  const orientationServiceRef = useRef(getOrientationService());
  const settingsService = getSettingsService();
  
  const [heading, setHeading] = useState<number>(0);
  const [cardinalDirection, setCardinalDirection] = useState<string>('N');
  const [fullDirection, setFullDirection] = useState<string>('North');
  const [source, setSource] = useState<CompassSource>('unavailable');
  const [status, setStatus] = useState<CompassStatus>(orientationServiceRef.current.getStatus());
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(settingsService.getCompassEnabled());

  const requestPermission = useCallback(async () => {
    try {
      const permission = await orientationServiceRef.current.requestPermission();
      setPermissionRequested(true);
      setStatus(orientationServiceRef.current.getStatus());
      return permission;
    } catch (error) {
      return 'denied';
    }
  }, []);

  const startCompass = useCallback(() => {
    if (compassEnabled) {
      orientationServiceRef.current.startCompass();
      setStatus(orientationServiceRef.current.getStatus());
    }
  }, [compassEnabled]);

  const stopCompass = useCallback(() => {
    orientationServiceRef.current.stopCompass();
    setStatus(orientationServiceRef.current.getStatus());
  }, []);

  const updateGpsHeading = useCallback((heading: number | null, speed: number | null) => {
    orientationServiceRef.current.updateGpsHeading(heading, speed);
  }, []);

  useEffect(() => {
    const service = orientationServiceRef.current;

    // Subscribe to heading updates
    service.onHeadingUpdate((data: CompassData) => {
      setHeading(data.heading);
      setCardinalDirection(getCardinalDirection(data.heading));
      setFullDirection(getFullDirection(data.heading));
      setSource(data.source);
    });

    // Subscribe to status changes
    service.onStatusChange((newStatus: CompassStatus) => {
      setStatus(newStatus);
    });

    return () => {
      service.cleanup();
    };
  }, []);

  return {
    heading,
    cardinalDirection,
    fullDirection,
    formattedHeading: formatHeading(heading),
    directionArrow: getDirectionArrow(heading),
    source,
    status,
    requestPermission,
    startCompass,
    stopCompass,
    updateGpsHeading,
    permissionRequested,
    compassEnabled,
  };
}