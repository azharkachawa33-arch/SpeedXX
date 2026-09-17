import type { GpsPosition, GpsError, TrackingConfig } from '../../models/types';
import { getSettingsService } from '../settings/settingsService';

const DEFAULT_CONFIG: TrackingConfig = {
  enableHighAccuracy: true,
  timeout: 30000, // Increased to 30s for Safari (Safari can be slower)
  maximumAge: 0,
  minAccuracy: 1000, // Increased to 1000m for Safari (more lenient)
  maxSpeedJump: 50, // 50 m/s (180 km/h) maximum jump
  maxDistanceJump: 500, // 500 meters maximum jump
  smoothingFactor: 0.3,
};

export class LocationService {
  private watchId: number | null = null;
  private config: TrackingConfig;
  private lastPosition: GpsPosition | null = null;
  private callbacks: {
    onSuccess: (position: GpsPosition) => void;
    onError: (error: GpsError) => void;
  } | null = null;

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  isAvailable(): boolean {
    const available = 'geolocation' in navigator && navigator.geolocation !== null;
    return available;
  }

  async checkPermission(): Promise<PermissionState> {
    // Safari doesn't support permissions API for geolocation
    // Always return 'prompt' to trigger permission request
    if (!('permissions' in navigator)) {
      return 'prompt';
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state;
    } catch (error) {
      return 'prompt';
    }
  }

  // Simple permission check
  async requestPermission(): Promise<boolean> {
    try {
      await this.getCurrentPosition();
      return true;
    } catch (error) {
      return false;
    }
  }

  getCurrentPosition(): Promise<GpsPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(this.createError('unsupported', 'Geolocation is not available in this browser'));
        return;
      }

      // Apply GPS accuracy setting from settings
      const settingsService = getSettingsService();
      const gpsAccuracy = settingsService.getGpsAccuracy();
      const enableHighAccuracy = gpsAccuracy === 'high';
      
      // Simple, standard options for all browsers including iOS
      const options = {
        enableHighAccuracy,
        timeout: this.config.timeout,
        maximumAge: this.config.maximumAge,
      };
      
      // Standard getCurrentPosition call
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsPosition = this.convertToGpsPosition(position);
          resolve(gpsPosition);
        },
        (error) => {
          const gpsError = this.convertToGpsError(error);
          reject(gpsError);
        },
        options
      );
    });
  }

  startWatching(
    onSuccess: (position: GpsPosition) => void,
    onError: (error: GpsError) => void
  ): void {
    if (!this.isAvailable()) {
      onError(this.createError('unsupported', 'Geolocation is not available in this browser'));
      return;
    }

    this.callbacks = { onSuccess, onError };

    // Apply GPS accuracy setting from settings
    const settingsService = getSettingsService();
    const gpsAccuracy = settingsService.getGpsAccuracy();
    const enableHighAccuracy = gpsAccuracy === 'high';
    
    // Standard options for all browsers
    const options = {
      enableHighAccuracy,
      timeout: this.config.timeout,
      maximumAge: this.config.maximumAge,
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const gpsPosition = this.convertToGpsPosition(position);
        
        if (this.isValidPosition(gpsPosition)) {
          this.lastPosition = gpsPosition;
          onSuccess(gpsPosition);
        } else {
          onError(this.createError('invalid_data', 'Invalid GPS position received'));
        }
      },
      (error) => {
        const gpsError = this.convertToGpsError(error);
        onError(gpsError);
      },
      options
    );
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.callbacks = null;
    this.lastPosition = null;
  }

  private convertToGpsPosition(position: GeolocationPosition): GpsPosition {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      timestamp: position.timestamp,
    };
  }

  private convertToGpsError(error: GeolocationPositionError): GpsError {
    const errorMap: Record<number, { type: GpsError['type']; message: string; retryable: boolean }> = {
      1: {
        type: 'permission_denied',
        message: 'Location permission was denied. Please enable location services in your browser settings.',
        retryable: false,
      },
      2: {
        type: 'position_unavailable',
        message: 'Location information is unavailable. Please check your device settings.',
        retryable: true,
      },
      3: {
        type: 'timeout',
        message: 'Location request timed out. Please try again.',
        retryable: true,
      },
    };

    const mappedError = errorMap[error.code] || {
      type: 'position_unavailable',
      message: 'An unknown location error occurred.',
      retryable: true,
    };

    return {
      ...mappedError,
      code: error.code,
    };
  }

  private createError(type: GpsError['type'], message: string): GpsError {
    return {
      type,
      message,
      retryable: type !== 'permission_denied' && type !== 'unsupported',
    };
  }

  private isValidPosition(position: GpsPosition): boolean {
    // Check for valid latitude/longitude
    if (position.latitude < -90 || position.latitude > 90) return false;
    if (position.longitude < -180 || position.longitude > 180) return false;
    
    // Check for reasonable accuracy
    if (position.accuracy < 0 || position.accuracy > 10000) return false;
    
    // Check for reasonable timestamp (not too old or in future)
    const now = Date.now();
    const timestampDiff = Math.abs(now - position.timestamp);
    if (timestampDiff > 60000) return false; // More than 1 minute difference
    
    // Check for reasonable speed if available
    if (position.speed !== null && (position.speed < 0 || position.speed > 200)) return false; // Max 200 m/s (720 km/h)
    
    return true;
  }

  updateConfig(config: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): TrackingConfig {
    return { ...this.config };
  }

  getLastPosition(): GpsPosition | null {
    return this.lastPosition;
  }

  isWatching(): boolean {
    return this.watchId !== null;
  }
}