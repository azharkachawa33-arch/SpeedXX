import { TrackingEngine } from '../location/trackingEngine';
import type { TrackingState, Trip } from '../../models/types';

/**
 * Centralized Trip Manager
 * 
 * This service manages the authoritative trip state at the application level.
 * It ensures that trip state survives component unmounts, navigation changes,
 * and browser tab switches. Only explicit user actions can start/stop trips.
 */
class TripManager {
  private static instance: TripManager;
  private trackingEngine: TrackingEngine | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): TripManager {
    if (!TripManager.instance) {
      TripManager.instance = new TripManager();
    }
    return TripManager.instance;
  }

  /**
   * Initialize the trip manager
   */
  initialize(): void {
    if (this.isInitialized) {
      return; // Already initialized
    }

    this.trackingEngine = new TrackingEngine();
    this.isInitialized = true;
  }

  /**
   * Get the tracking engine
   */
  getTrackingEngine(): TrackingEngine | null {
    return this.trackingEngine;
  }

  /**
   * Get current trip state
   */
  getTripState(): TrackingState {
    if (!this.trackingEngine) {
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
    return this.trackingEngine.getState();
  }

  /**
   * Check if a trip is currently active
   */
  isTripActive(): boolean {
    const state = this.getTripState();
    return state.state === 'running' || state.state === 'paused';
  }

  /**
   * Check if trip is in completed state
   */
  isTripCompleted(): boolean {
    const state = this.getTripState();
    return state.state === 'completed';
  }

  /**
   * Force cleanup - only use when completely shutting down the app
   */
  destroy(): void {
    if (this.trackingEngine) {
      this.trackingEngine.cleanup();
      this.trackingEngine = null;
    }
    this.isInitialized = false;
  }
}

// Export singleton instance
export const tripManager = TripManager.getInstance();