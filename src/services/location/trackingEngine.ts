import type { 
  GpsPosition, 
  TrackingState, 
  TripState, 
  TripStatistics, 
  LocationData,
  TrackingConfig,
  GpsError,
  Trip,
  RoutePoint
} from '../../models/types';
import { LocationService } from './locationService';
import { GpsFilter } from './gpsFilter';
import { haversineDistance, calculateTotalRouteDistance } from '../../utils/distanceCalculation';
import { getSettingsService } from '../settings/settingsService';

export class TrackingEngine {
  public locationService: LocationService;
  private gpsFilter: GpsFilter;
  private state: TrackingState;
  private updateCallback: ((state: TrackingState) => void) | null = null;
  private errorCallback: ((error: GpsError) => void) | null = null;
  private tripCompletedCallback: ((trip: Trip) => void) | null = null;
  private tripTimerInterval: number | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(config: Partial<TrackingConfig> = {}) {
    // Apply GPS accuracy setting from settings
    const settingsService = getSettingsService();
    const gpsAccuracy = settingsService.getGpsAccuracy();
    const enableHighAccuracy = gpsAccuracy === 'high';
    
    this.locationService = new LocationService({ ...config, enableHighAccuracy });
    this.gpsFilter = new GpsFilter(this.locationService.getConfig());
    
    this.state = this.getInitialState();
    
    // Setup visibility change handler for background tracking
    this.setupVisibilityHandler();
  }

  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      // When tab becomes visible again, ensure GPS is still running
      if (this.state.state === 'running' && !this.locationService.isWatching()) {
        // Restart GPS watching if it was stopped
        this.locationService.startWatching(
          (position) => this.handlePositionUpdate(position),
          (error) => this.handleGpsError(error)
        );
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private getInitialState(): TrackingState {
    return {
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
    };
  }

  /**
   * Start tracking a new trip
   */
  async startTrip(): Promise<void> {
    if (this.state.state !== 'idle') {
      throw new Error('Cannot start trip: not in idle state');
    }

    this.updateState({ state: 'starting' });

    try {
      // Check if GPS is available
      if (!this.locationService.isAvailable()) {
        throw new Error('Geolocation is not available in this browser');
      }

      // Get initial position
      const initialPosition = await this.locationService.getCurrentPosition();
      
      if (!this.gpsFilter.meetsAccuracyRequirement(initialPosition)) {
        // Don't fail on poor accuracy - just continue for compatibility
      }

      // Start tracking
      this.startTrackingSession(initialPosition);
      
    } catch (error) {
      const gpsError = this.convertToGpsError(error);
      this.updateState({ 
        state: 'error', 
        error: gpsError.message 
      });
      if (this.errorCallback) {
        this.errorCallback(gpsError);
      }
      throw gpsError;
    }
  }

  /**
   * Pause the current trip
   */
  pauseTrip(): void {
    if (this.state.state !== 'running') {
      throw new Error('Cannot pause trip: not running');
    }

    this.updateState({ 
      state: 'paused',
      lastPauseStart: Date.now()
    });

    // Keep GPS watching even during pause for trip persistence
    // This ensures trip continues even if user changes tabs
    // Don't stop GPS watching - only manual stop should stop tracking
  }

  /**
   * Resume the paused trip
   */
  async resumeTrip(): Promise<void> {
    if (this.state.state !== 'paused') {
      throw new Error('Cannot resume trip: not paused');
    }

    this.updateState({ state: 'starting' });

    try {
      // Get current position to resume from
      const currentPosition = await this.locationService.getCurrentPosition();
      
      // Update paused time
      if (this.state.lastPauseStart) {
        const pauseDuration = Date.now() - this.state.lastPauseStart;
        this.updateState({ 
          pausedTime: this.state.pausedTime + pauseDuration,
          lastPauseStart: null
        });
      }

      // Just resume state - GPS is already running from pause
      this.updateState({
        state: 'running',
        currentPosition: currentPosition,
        error: null,
      });
      
    } catch (error) {
      const gpsError = this.convertToGpsError(error);
      this.updateState({ 
        state: 'error', 
        error: gpsError.message 
      });
      if (this.errorCallback) {
        this.errorCallback(gpsError);
      }
      throw gpsError;
    }
  }

  /**
   * Stop the current trip
   */
  stopTrip(): void {
    if (this.state.state !== 'running' && this.state.state !== 'paused') {
      throw new Error('Cannot stop trip: not running or paused');
    }

    this.updateState({ state: 'stopping' });

    // Stop GPS watching
    this.locationService.stopWatching();

    // Stop timer
    this.stopTripTimer();

    // Finalize statistics
    const finalStatistics = this.calculateFinalStatistics();
    
    // Create completed trip object
    const completedTrip = this.createCompletedTrip(finalStatistics);
    
    this.updateState({ 
      state: 'completed',
      statistics: finalStatistics
    });

    // Notify about completed trip
    if (this.tripCompletedCallback) {
      this.tripCompletedCallback(completedTrip);
    }

    // Reset to idle after a short delay
    setTimeout(() => {
      this.reset();
    }, 1000);
  }

  /**
   * Reset the tracking engine
   */
  reset(): void {
    this.locationService.stopWatching();
    this.stopTripTimer();
    this.gpsFilter.reset();
    this.state = this.getInitialState();
    
    if (this.updateCallback) {
      this.updateCallback(this.state);
    }
  }

  /**
   * Get current tracking state
   */
  getState(): TrackingState {
    return { ...this.state };
  }

  /**
   * Subscribe to state updates
   */
  onStateUpdate(callback: (state: TrackingState) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Subscribe to errors
   */
  onError(callback: (error: GpsError) => void): void {
    this.errorCallback = callback;
  }

  /**
   * Subscribe to trip completion
   */
  onTripCompleted(callback: (trip: Trip) => void): void {
    this.tripCompletedCallback = callback;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<TrackingConfig>): void {
    this.locationService.updateConfig(config);
    this.gpsFilter.updateConfig(this.locationService.getConfig());
  }

  private startTrackingSession(initialPosition: GpsPosition): void {
    // Prevent stale callbacks from modifying state after trip completion
    if (this.state.state !== 'starting' && this.state.state !== 'running') {
      return;
    }

    // Initialize trip data
    const startTime = this.state.startTime || Date.now();
    const route: LocationData[] = this.state.route.length > 0 
      ? this.state.route 
      : [this.convertToLocationData(initialPosition)];

    this.updateState({
      state: 'running',
      currentPosition: initialPosition,
      startTime,
      route,
      error: null,
    });

    // Start GPS watching
    this.locationService.startWatching(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handleGpsError(error)
    );

    // Start trip timer
    this.startTripTimer();
  }

  private handlePositionUpdate(position: GpsPosition): void {
    // Prevent stale callbacks from modifying state after trip completion
    if (this.state.state !== 'running') {
      return;
    }
    
    // Filter position
    const filteredPosition = this.gpsFilter.filterPosition(position);
    
    if (!filteredPosition) {
      return; // Skip invalid positions
    }

    // Calculate fallback speed if GPS speed is null
    let finalSpeed = filteredPosition.speed;
    if (filteredPosition.speed === null && this.state.currentPosition) {
      const timeDiff = (filteredPosition.timestamp - this.state.currentPosition.timestamp) / 1000;
      if (timeDiff > 0 && timeDiff < 60) { // Ignore very old positions
        const distance = haversineDistance(
          this.state.currentPosition.latitude,
          this.state.currentPosition.longitude,
          filteredPosition.latitude,
          filteredPosition.longitude
        );
        const calculatedSpeed = distance / timeDiff; // m/s
        
        // Use calculated speed if reasonable
        if (calculatedSpeed >= 0 && calculatedSpeed <= 200) {
          finalSpeed = calculatedSpeed;
        }
      }
    }

    // Calculate distance increment
    const distanceIncrement = this.calculateDistanceIncrement(filteredPosition);

    // Update statistics with the speed and distance
    const updatedStatistics = this.updateStatistics(finalSpeed, distanceIncrement);
    
    // Add to route (prevent excessive growth by only adding if distance > 0.5m)
    const shouldAddPoint = distanceIncrement > 0.5 || this.state.route.length === 0;
    const newRoute = shouldAddPoint 
      ? [...this.state.route, this.convertToLocationData(filteredPosition)]
      : this.state.route;

    this.updateState({
      currentPosition: filteredPosition,
      statistics: updatedStatistics,
      route: newRoute,
    });
  }

  private handleGpsError(error: GpsError): void {
    this.updateState({ 
      state: 'error',
      error: error.message 
    });
    
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  private calculateDistanceIncrement(position: GpsPosition): number {
    if (!this.state.currentPosition) return 0;
    return haversineDistance(
      this.state.currentPosition.latitude,
      this.state.currentPosition.longitude,
      position.latitude,
      position.longitude
    );
  }

  private updateStatistics(speed: number | null, distanceIncrement: number): TripStatistics {
    const currentStats = this.state.statistics;
    const currentSpeed = speed || 0;

    // Update max speed
    const newMaxSpeed = Math.max(currentStats.maxSpeed, currentSpeed);

    // Update distance
    const newDistance = currentStats.distance + distanceIncrement;

    // Update duration
    const newDuration = this.calculateDuration();

    // Calculate average speed
    const movingTime = this.calculateMovingTime();
    const newAverageSpeed = movingTime > 0 ? (newDistance / movingTime) : 0;

    return {
      averageSpeed: newAverageSpeed,
      maxSpeed: newMaxSpeed,
      distance: newDistance,
      duration: newDuration,
    };
  }

  private calculateDuration(): number {
    if (!this.state.startTime) return 0;
    
    const now = Date.now();
    const totalElapsed = now - this.state.startTime;
    const effectiveTime = totalElapsed - this.state.pausedTime;
    
    return Math.max(0, effectiveTime / 1000); // Convert to seconds
  }

  private calculateMovingTime(): number {
    // For now, use total duration minus paused time
    // In a more sophisticated implementation, we'd track actual moving time
    return this.calculateDuration();
  }

  private calculateFinalStatistics(): TripStatistics {
    const finalDistance = calculateTotalRouteDistance(this.state.route);
    const finalDuration = this.calculateDuration();
    const movingTime = this.calculateMovingTime();
    const finalAverageSpeed = movingTime > 0 ? (finalDistance / movingTime) : 0;

    return {
      averageSpeed: finalAverageSpeed,
      maxSpeed: this.state.statistics.maxSpeed,
      distance: finalDistance,
      duration: finalDuration,
    };
  }

  private startTripTimer(): void {
    this.stopTripTimer();
    
    this.tripTimerInterval = window.setInterval(() => {
      if (this.state.state === 'running') {
        const newDuration = this.calculateDuration();
        this.updateState({
          statistics: {
            ...this.state.statistics,
            duration: newDuration,
          },
        });
      }
    }, 1000);
  }

  private stopTripTimer(): void {
    if (this.tripTimerInterval !== null) {
      clearInterval(this.tripTimerInterval);
      this.tripTimerInterval = null;
    }
  }

  private convertToLocationData(position: GpsPosition): LocationData {
    return {
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      timestamp: position.timestamp,
      speed: position.speed || undefined,
    };
  }

  private createCompletedTrip(finalStatistics: TripStatistics): Trip {
    const settingsService = getSettingsService();
    const routePoints: RoutePoint[] = this.state.route.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      timestamp: point.timestamp,
      accuracy: point.accuracy,
      speed: point.speed,
      altitude: point.altitude,
      heading: point.heading,
    }));

    const startLocation = this.state.route.length > 0 ? {
      latitude: this.state.route[0].latitude,
      longitude: this.state.route[0].longitude,
      accuracy: this.state.route[0].accuracy,
      timestamp: this.state.route[0].timestamp,
      speed: this.state.route[0].speed,
      altitude: this.state.route[0].altitude,
      heading: this.state.route[0].heading,
    } : undefined;

    const endLocation = this.state.route.length > 0 ? {
      latitude: this.state.route[this.state.route.length - 1].latitude,
      longitude: this.state.route[this.state.route.length - 1].longitude,
      accuracy: this.state.route[this.state.route.length - 1].accuracy,
      timestamp: this.state.route[this.state.route.length - 1].timestamp,
      speed: this.state.route[this.state.route.length - 1].speed,
      altitude: this.state.route[this.state.route.length - 1].altitude,
      heading: this.state.route[this.state.route.length - 1].heading,
    } : undefined;

    const trip: Trip = {
      id: this.generateTripId(),
      name: this.generateTripName(),
      date: this.state.startTime || Date.now(),
      statistics: finalStatistics,
      route: routePoints,
      startTime: this.state.startTime || Date.now(),
      endTime: Date.now(),
      speedUnit: settingsService.getSpeedUnit(),
      distanceUnit: settingsService.getDistanceUnit(),
      startLocation,
      endLocation,
      createdAt: Date.now(),
    };

    return trip;
  }

  private generateTripId(): string {
    return `trip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTripName(): string {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `Trip ${hours}:${minutes}`;
  }

  private convertToGpsError(error: unknown): GpsError {
    if (error instanceof Error) {
      // Return the actual error message for better debugging
      return {
        type: 'position_unavailable',
        message: error.message,
        retryable: true,
      };
    }
    if (typeof error === 'string') {
      return {
        type: 'position_unavailable',
        message: error,
        retryable: true,
      };
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return {
        type: 'position_unavailable',
        message: String(error.message),
        retryable: true,
      };
    }
    return {
      type: 'position_unavailable',
      message: 'Unable to get GPS position. Please check your location permissions.',
      retryable: true,
    };
  }

  private updateState(updates: Partial<TrackingState>): void {
    this.state = { ...this.state, ...updates };
    
    if (this.updateCallback) {
      this.updateCallback(this.state);
    }
  }

  /**
   * Get GPS status based on current state
   */
  getGpsStatus(): {
    available: boolean;
    permission: 'granted' | 'denied' | 'prompt' | 'unknown';
    accuracy: 'high' | 'medium' | 'low' | 'unknown';
    signalStrength: number;
    state: 'ready' | 'searching' | 'active' | 'weak' | 'permission_required' | 'unavailable';
  } {
    const available = this.locationService.isAvailable();
    const currentPosition = this.state.currentPosition;
    
    let accuracy: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
    let signalStrength = 0;
    let state: 'ready' | 'searching' | 'active' | 'weak' | 'permission_required' | 'unavailable' = 'ready';
    let permission: 'granted' | 'denied' | 'prompt' | 'unknown' = 'unknown';

    if (currentPosition) {
      accuracy = this.gpsFilter.getAccuracyLevel(currentPosition.accuracy);
      signalStrength = this.gpsFilter.calculateSignalStrength(currentPosition.accuracy);
      state = 'active';
      permission = 'granted'; // If we have position, permission is granted
      
      if (signalStrength < 30) {
        state = 'weak';
      }
    } else if (this.state.state === 'starting') {
      state = 'searching';
    } else if (this.state.state === 'error') {
      state = 'unavailable';
      if (this.state.error?.includes('permission')) {
        state = 'permission_required';
        permission = 'denied';
      }
    }

    return {
      available,
      permission,
      accuracy,
      signalStrength,
      state,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.locationService.stopWatching();
    this.stopTripTimer();
    this.gpsFilter.reset();
    this.updateCallback = null;
    this.errorCallback = null;
    
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}