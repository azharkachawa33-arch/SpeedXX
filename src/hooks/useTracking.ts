import { useState, useEffect, useCallback, useRef } from 'react';
import { TrackingEngine } from '../services/location/trackingEngine';
import type { TrackingState, TripState, GpsError, Trip } from '../models/types';
import { convertSpeed, formatSpeed } from '../utils/speedConversion';
import { metersToKilometers, metersToMiles, metersToNauticalMiles, formatDistance } from '../utils/distanceCalculation';
import { getTripStorage } from '../services/storage';
import { getSettingsService } from '../services/settings/settingsService';

export function useTracking() {
  const trackingEngineRef = useRef<TrackingEngine | null>(null);
  const [state, setState] = useState<TrackingState>(() => ({
    state: 'idle',
    currentPosition: null,
    statistics: {
      averageSpeed: 0,
      maxSpeed: 0,
      distance: 0,
      duration: 0,
    },
    startTime: null,
    pausedTime: 0,
    lastPauseStart: null,
    route: [],
    error: null,
  }));
  
  // Load speed unit from settings
  const settingsService = getSettingsService();
  const [speedUnit, setSpeedUnit] = useState<'km/h' | 'mph' | 'knots'>(settingsService.getSpeedUnit());
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi' | 'nm'>(settingsService.getDistanceUnit());
  const [gpsAvailable, setGpsAvailable] = useState(false);
  const [tripStorageAvailable, setTripStorageAvailable] = useState(false);

  // Initialize tracking engine
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('useTracking: Initializing tracking engine');
    }
    const engine = new TrackingEngine();
    trackingEngineRef.current = engine;

    // Check GPS availability
    const available = engine.locationService.isAvailable();
    setGpsAvailable(available);

    // Check trip storage availability
    const storage = getTripStorage();
    const storageAvailable = storage.isAvailable();
    setTripStorageAvailable(storageAvailable);

    // Subscribe to state updates
    engine.onStateUpdate((newState) => {
      setState(newState);
    });

    // Subscribe to errors
    engine.onError((error) => {
      if (import.meta.env.DEV) {
        console.error('useTracking: Tracking error:', error);
      }
    });

    // Subscribe to trip completion
    engine.onTripCompleted(async (trip: Trip) => {
      if (storageAvailable) {
        try {
          await storage.saveTrip(trip);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('useTracking: Failed to save trip:', error);
          }
        }
      }
    });

    // IMPORTANT: Do NOT cleanup engine on unmount
    // This allows trip to continue running in background when user navigates to other tabs
    // Cleanup only happens when user explicitly stops the trip or app closes
    return () => {
      // Only cleanup if trip is not running
      if (engine.getState().state === 'idle') {
        engine.cleanup();
      }
    };
  }, []); // Run once on mount

  // Start trip
  const startTrip = useCallback(async () => {
    console.log('useTracking: startTrip called');
    if (!trackingEngineRef.current) return;
    
    try {
      console.log('useTracking: Calling engine.startTrip()');
      await trackingEngineRef.current.startTrip();
      console.log('useTracking: Trip started successfully');
    } catch (error) {
      console.error('useTracking: Failed to start trip:', error);
      throw error;
    }
  }, []);

  // Pause trip
  const pauseTrip = useCallback(() => {
    if (!trackingEngineRef.current) return;
    
    try {
      trackingEngineRef.current.pauseTrip();
    } catch (error) {
      console.error('Failed to pause trip:', error);
      throw error;
    }
  }, []);

  // Resume trip
  const resumeTrip = useCallback(async () => {
    if (!trackingEngineRef.current) return;
    
    try {
      await trackingEngineRef.current.resumeTrip();
    } catch (error) {
      console.error('Failed to resume trip:', error);
      throw error;
    }
  }, []);

  // Stop trip
  const stopTrip = useCallback(() => {
    if (!trackingEngineRef.current) return;
    
    try {
      trackingEngineRef.current.stopTrip();
    } catch (error) {
      console.error('Failed to stop trip:', error);
      throw error;
    }
  }, []);

  // Reset trip
  const resetTrip = useCallback(() => {
    if (!trackingEngineRef.current) return;
    
    try {
      trackingEngineRef.current.reset();
    } catch (error) {
      console.error('Failed to reset trip:', error);
      throw error;
    }
  }, []);

  // Format duration
  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get current speed in selected unit
  const getCurrentSpeed = useCallback((): number => {
    const position = state.currentPosition;
    if (!position || position.speed === null) return 0;
    
    return convertSpeed(position.speed, speedUnit);
  }, [state.currentPosition, speedUnit]);

  // Get formatted current speed
  const getFormattedSpeed = useCallback((): string => {
    const speed = getCurrentSpeed();
    return formatSpeed(speed, speedUnit, 0);
  }, [getCurrentSpeed, speedUnit]);

  // Get average speed in selected unit
  const getAverageSpeed = useCallback((): number => {
    const avgSpeed = state.statistics.averageSpeed; // in m/s
    return convertSpeed(avgSpeed, speedUnit);
  }, [state.statistics.averageSpeed, speedUnit]);

  // Get formatted average speed
  const getFormattedAverageSpeed = useCallback((): string => {
    const speed = getAverageSpeed();
    return formatSpeed(speed, speedUnit, 0);
  }, [getAverageSpeed, speedUnit]);

  // Get max speed in selected unit
  const getMaxSpeed = useCallback((): number => {
    const maxSpeed = state.statistics.maxSpeed; // in m/s
    return convertSpeed(maxSpeed, speedUnit);
  }, [state.statistics.maxSpeed, speedUnit]);

  // Get formatted max speed
  const getFormattedMaxSpeed = useCallback((): string => {
    const speed = getMaxSpeed();
    return formatSpeed(speed, speedUnit, 0);
  }, [getMaxSpeed, speedUnit]);

  // Get distance in selected unit
  const getDistance = useCallback((): number => {
    const distance = state.statistics.distance; // in meters
    switch (distanceUnit) {
      case 'km':
        return metersToKilometers(distance);
      case 'mi':
        return metersToMiles(distance);
      case 'nm':
        return metersToNauticalMiles(distance);
      default:
        return distance;
    }
  }, [state.statistics.distance, distanceUnit]);

  // Get formatted distance
  const getFormattedDistance = useCallback((): string => {
    return formatDistance(state.statistics.distance, distanceUnit, 1);
  }, [state.statistics.distance, distanceUnit]);

  // Get GPS status
  const getGpsStatus = useCallback((): {
    available: boolean;
    permission: 'granted' | 'denied' | 'prompt' | 'unknown';
    accuracy: 'high' | 'medium' | 'low' | 'unknown';
    signalStrength: number;
    state: 'ready' | 'searching' | 'active' | 'weak' | 'permission_required' | 'unavailable';
  } => {
    if (!trackingEngineRef.current) {
      return {
        available: false,
        permission: 'unknown',
        accuracy: 'unknown',
        signalStrength: 0,
        state: 'unavailable',
      };
    }
    
    return trackingEngineRef.current.getGpsStatus();
  }, []);

  // Update speed unit
  const updateSpeedUnit = useCallback((unit: 'km/h' | 'mph' | 'knots') => {
    setSpeedUnit(unit);
    settingsService.updateSpeedUnit(unit);
  }, [settingsService]);

  // Update distance unit
  const updateDistanceUnit = useCallback((unit: 'km' | 'mi' | 'nm') => {
    setDistanceUnit(unit);
    settingsService.updateDistanceUnit(unit);
  }, [settingsService]);

  // Retry after error
  const retryTrip = useCallback(async () => {
    if (!trackingEngineRef.current) return;
    
    try {
      trackingEngineRef.current.reset();
      await startTrip();
    } catch (error) {
      console.error('Failed to retry trip:', error);
      throw error;
    }
  }, [startTrip]);

  return {
    // State
    state: state.state,
    currentPosition: state.currentPosition,
    statistics: state.statistics,
    error: state.error,
    gpsAvailable,
    speedUnit,
    distanceUnit,
    
    // Actions
    startTrip,
    pauseTrip,
    resumeTrip,
    stopTrip,
    resetTrip,
    retryTrip,
    updateSpeedUnit,
    updateDistanceUnit,
    
    // Computed values
    getCurrentSpeed,
    getFormattedSpeed,
    getAverageSpeed,
    getFormattedAverageSpeed,
    getMaxSpeed,
    getFormattedMaxSpeed,
    getDistance,
    getFormattedDistance,
    formatDuration,
    getGpsStatus,
    
    // Trip info
    startTime: state.startTime,
    route: state.route,
  };
}