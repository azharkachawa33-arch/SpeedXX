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

  // Force permission request for Safari
  async requestPermission(): Promise<boolean> {
    // iOS Safari specific permission handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    try {
      // For iOS Safari, try with more lenient settings first
      if (isIOS) {
        const iOSOptions = {
          enableHighAccuracy: false, // iOS works better with this false initially
          timeout: 10000, // Shorter timeout for permission check
          maximumAge: 0,
        };
        
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              // Success - permission granted
              resolve();
            },
            (error) => {
              // If permission denied, try one more time with user gesture
              if (error.code === 1) {
                // Permission denied - might need user to enable in settings
                reject(error);
              } else {
                // Other error - might be timeout or unavailable, try again
                reject(error);
              }
            },
            iOSOptions
          );
        });
        
        return true;
      } else {
        // Non-iOS browsers
        await this.getCurrentPosition();
        return true;
      }
    } catch (error) {
      // For iOS, check if it's a permission error
      if (isIOS) {
        // On iOS, we might need to guide user to settings
        return false;
      }
      return false;
    }
  }

  // iOS-specific manual permission request
  async requestIOSPermission(): Promise<boolean> {
    try {
      // iOS Safari requires explicit user gesture for permission
      const iOSOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      };
      
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve();
          },
          (error) => {
            reject(error);
          },
          iOSOptions
        );
      });
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // Check if device is iOS
  isIOS(): boolean {
    const userAgent = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
    const isNotIE = !(window as any).MSStream;
    return isIOSDevice && isNotIE;
  }

  getCurrentPosition(): Promise<GpsPosition> {
    return new Promise((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(this.createError('unsupported', 'Geolocation is not available in this browser'));
        return;
      }

      // Detect iOS device
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

      // Apply GPS accuracy setting from settings
      const settingsService = getSettingsService();
      const gpsAccuracy = settingsService.getGpsAccuracy();
      
      // Safari compatibility: use standard options with fallback
      const options = {
        enableHighAccuracy: isIOS ? false : (gpsAccuracy === 'high'), // iOS works better with false initially
        timeout: isIOS ? 15000 : this.config.timeout, // Shorter timeout for iOS permission check
        maximumAge: this.config.maximumAge,
      };
      
      // Add error boundary for Safari
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const gpsPosition = this.convertToGpsPosition(position);
            resolve(gpsPosition);
          },
          (error) => {
            const gpsError = this.convertToGpsError(error);
            
            // iOS specific: If permission denied, try with different approach
            if (isIOS && error.code === 1) {
              // Permission denied - might need user to enable in settings
              // Try one more time with different options
              const retryOptions = {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 0,
              };
              
              navigator.geolocation.getCurrentPosition(
                (retryPosition) => {
                  const retryGpsPosition = this.convertToGpsPosition(retryPosition);
                  resolve(retryGpsPosition);
                },
                (retryError) => {
                  reject(gpsError);
                },
                retryOptions
              );
            } else {
              reject(gpsError);
            }
          },
          options
        );
      } catch (error) {
        reject(this.createError('position_unavailable', 'Exception occurred while getting position'));
      }
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

    // Detect iOS device
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Apply GPS accuracy setting from settings
    const settingsService = getSettingsService();
    const gpsAccuracy = settingsService.getGpsAccuracy();
    
    // Safari compatibility options
    const options = {
      enableHighAccuracy: isIOS ? false : (gpsAccuracy === 'high'), // iOS works better with false initially
      timeout: isIOS ? 20000 : this.config.timeout, // Longer timeout for iOS
      maximumAge: isIOS ? 5000 : this.config.maximumAge, // Allow some cached data for iOS
    };
    
    try {
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
          // Safari-specific error handling
          const gpsError = this.convertToGpsError(error);
          
          // Safari sometimes returns timeout on first successful position
          // Retry with more lenient settings if timeout
          if (error.code === 3 && this.lastPosition) {
            // Use last known position instead of error
            onSuccess(this.lastPosition);
            return;
          }
          
          // iOS specific: If permission denied during watch, try with different approach
          if (isIOS && error.code === 1) {
            // Permission denied - might need user to enable in settings
            // Try with more lenient settings
            const retryOptions = {
              enableHighAccuracy: false,
              timeout: 30000,
              maximumAge: 10000,
            };
            
            try {
              this.watchId = navigator.geolocation.watchPosition(
                (retryPosition) => {
                  const retryGpsPosition = this.convertToGpsPosition(retryPosition);
                  if (this.isValidPosition(retryGpsPosition)) {
                    this.lastPosition = retryGpsPosition;
                    onSuccess(retryGpsPosition);
                  } else {
                    onError(gpsError);
                  }
                },
                (retryError) => {
                  onError(this.convertToGpsError(retryError));
                },
                retryOptions
              );
            } catch (retryError) {
              onError(gpsError);
            }
            return;
          }
          
          // For position unavailable in Safari, try with lower accuracy
          if (error.code === 2 && options.enableHighAccuracy) {
            // Retry with lower accuracy
            const retryOptions = {
              enableHighAccuracy: false,
              timeout: this.config.timeout * 2, // Double timeout
              maximumAge: this.config.maximumAge * 2, // Allow older data
            };
            
            try {
              this.watchId = navigator.geolocation.watchPosition(
                (retryPosition) => {
                  const retryGpsPosition = this.convertToGpsPosition(retryPosition);
                  if (this.isValidPosition(retryGpsPosition)) {
                    this.lastPosition = retryGpsPosition;
                    onSuccess(retryGpsPosition);
                  } else {
                    onError(gpsError);
                  }
                },
                (retryError) => {
                  onError(this.convertToGpsError(retryError));
                },
                retryOptions
              );
            } catch (retryError) {
              onError(gpsError);
            }
            return;
          }
          
          onError(gpsError);
        },
        options
      );
    } catch (error) {
      onError(this.createError('position_unavailable', 'Exception occurred while watching position'));
    }
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