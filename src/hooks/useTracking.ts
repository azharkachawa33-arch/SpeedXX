import { useState, useEffect, useCallback, useRef } from 'react';
import { TrackingEngine } from '../services/location/trackingEngine';
import { tripManager } from '../services/trip/tripManager';
import type { TrackingState, TripState, GpsError, Trip } from '../models/types';
import { convertSpeed, formatSpeed } from '../utils/speedConversion';
import { metersToKilometers, metersToMiles, metersToNauticalMiles, formatDistance } from '../utils/distanceCalculation';
import { getTripStorage } from '../services/storage';
import { getSettingsService } from '../services/settings/settingsService';

export function useTracking() {
  const trackingEngineRef = useRef<TrackingEngine | null>(null);
  const [state, setState] = useState<TrackingState>(() => tripManager.getTripState());
  
  // Load speed unit from settings
  const settingsService = getSettingsService();
  const [speedUnit, setSpeedUnit] = useState<'km/h' | 'mph' | 'knots'>(settingsService.getSpeedUnit());
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi' | 'nm'>(settingsService.getDistanceUnit());
  const [gpsAvailable, setGpsAvailable] = useState(false);
  const [tripStorageAvailable, setTripStorageAvailable] = useState(false);

  // Initialize tracking engine using TripManager singleton
  useEffect(() => {
    // Initialize TripManager if not already initialized
    tripManager.initialize();
    
    // Get the tracking engine from TripManager
    const engine = tripManager.getTrackingEngine();
    if (engine) {
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
        // Error handled silently
      });

      // Subscribe to trip completion
      engine.onTripCompleted(async (trip: Trip) => {
        if (storageAvailable) {
          try {
            await storage.saveTrip(trip);
          } catch (error) {
            // Trip save failed silently
          }
        }
      });
    }

    // IMPORTANT: Do NOT cleanup engine on unmount
    // This allows trip to continue running in background when user navigates to other tabs
    // Cleanup only happens when user explicitly stops the trip or app closes
    return () => {
      // Never cleanup automatically - only on explicit stop
      // This ensures trip continues across tab changes
      // The tracking engine lives at application level via TripManager
    };
  }, []); // Run once on mount

  // Start trip - check if already active or completed first
  const startTrip = useCallback(async () => {
    if (!trackingEngineRef.current) return;
    
    // Check if trip is already active
    if (tripManager.isTripActive()) {
      throw new Error('A trip is already active. Stop the current trip first.');
    }
    
    // If trip is completed, reset it first
    if (tripManager.isTripCompleted()) {
      trackingEngineRef.current.reset();
    }
    
    try {
      await trackingEngineRef.current.startTrip();
    } catch (error) {
      throw error;
    }
  }, []);

  // Pause trip
  const pauseTrip = useCallback(() => {
    if (!trackingEngineRef.current) return;
    
    try {
      trackingEngineRef.current.pauseTrip();
    } catch (error) {
      throw error;
    }
  }, []);

  // Resume trip
  const resumeTrip = useCallback(async () => {
    if (!trackingEngineRef.current) return;
    
    try {
      await trackingEngineRef.current.resumeTrip();
    } catch (error) {
      throw error;
    }
  }, []);

  // Stop trip
  const stopTrip = useCallback(() => {
    if (!trackingEngineRef.current) return;
    
    try {
      trackingEngineRef.current.stopTrip();
    } catch (error) {
      throw error;
    }
  }, []);

  // Reset trip
  const resetTrip = useCallback(() => {
    if (!trackingEngineRef.current) return;
    
    try {
      trackingEngineRef.current.reset();
    } catch (error) {
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

  // Retry after error - only reset if in error or completed state
  const retryTrip = useCallback(async () => {
    if (!trackingEngineRef.current) return;
    
    try {
      const currentState = trackingEngineRef.current.getState();
      // Only reset if in error or completed state, preserve other states
      if (currentState.state === 'error' || currentState.state === 'completed') {
        trackingEngineRef.current.reset();
      }
      await startTrip();
    } catch (error) {
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