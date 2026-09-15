import type { GpsPosition, TrackingConfig, LocationData } from '../../models/types';
import { haversineDistance } from '../../utils/distanceCalculation';

export class GpsFilter {
  private config: TrackingConfig;
  private lastValidPosition: GpsPosition | null = null;
  private smoothedSpeed: number = 0;

  constructor(config: TrackingConfig) {
    this.config = config;
  }

  /**
   * Filter and validate GPS position
   * @param position Raw GPS position
   * @returns Filtered position or null if invalid
   */
  filterPosition(position: GpsPosition): GpsPosition | null {
    if (!this.isValidPosition(position)) {
      return null;
    }

    if (!this.lastValidPosition) {
      this.lastValidPosition = position;
      this.smoothedSpeed = position.speed || 0;
      return position;
    }

    // Check for unrealistic jumps
    if (this.hasUnrealisticJump(position)) {
      return null;
    }

    // Apply speed smoothing
    const smoothedPosition = this.applySpeedSmoothing(position);
    
    this.lastValidPosition = smoothedPosition;
    return smoothedPosition;
  }

  /**
   * Basic position validation
   */
  private isValidPosition(position: GpsPosition): boolean {
    console.log('isValidPosition check for:', position);
    
    // Check latitude range
    if (position.latitude < -90 || position.latitude > 90) {
      console.log('Invalid latitude');
      return false;
    }
    
    // Check longitude range
    if (position.longitude < -180 || position.longitude > 180) {
      console.log('Invalid longitude');
      return false;
    }
    
    // Check accuracy
    if (position.accuracy < 0 || position.accuracy > 10000) {
      console.log('Invalid accuracy');
      return false;
    }
    
    // Check timestamp freshness
    const now = Date.now();
    const timestampDiff = Math.abs(now - position.timestamp);
    if (timestampDiff > 60000) {
      console.log('Timestamp too old:', timestampDiff);
      return false; // More than 1 minute old
    }
    
    // Check speed if available
    if (position.speed !== null) {
      if (position.speed < 0 || position.speed > 200) {
        console.log('Invalid speed:', position.speed);
        return false; // Max 200 m/s (720 km/h)
      }
    }
    
    console.log('Position is valid');
    return true;
  }

  /**
   * Check for unrealistic GPS jumps
   */
  private hasUnrealisticJump(position: GpsPosition): boolean {
    if (!this.lastValidPosition) return false;

    const timeDiff = (position.timestamp - this.lastValidPosition.timestamp) / 1000; // seconds
    if (timeDiff <= 0) return true; // Invalid time sequence

    const distance = haversineDistance(
      this.lastValidPosition.latitude,
      this.lastValidPosition.longitude,
      position.latitude,
      position.longitude
    );
    
    // Check distance jump
    if (distance > this.config.maxDistanceJump) {
      return true;
    }

    // Check speed jump
    if (position.speed !== null && this.lastValidPosition.speed !== null) {
      const speedDiff = Math.abs(position.speed - this.lastValidPosition.speed);
      if (speedDiff > this.config.maxSpeedJump) {
        return true;
      }
    }

    // Calculate derived speed from distance/time
    const derivedSpeed = distance / timeDiff;
    if (derivedSpeed > this.config.maxSpeedJump) {
      return true;
    }

    return false;
  }

  /**
   * Apply exponential smoothing to speed values
   */
  private applySpeedSmoothing(position: GpsPosition): GpsPosition {
    if (position.speed === null) {
      return position;
    }

    // Exponential moving average
    this.smoothedSpeed = this.smoothedSpeed + 
      this.config.smoothingFactor * (position.speed - this.smoothedSpeed);

    return {
      ...position,
      speed: this.smoothedSpeed,
    };
  }

  /**
   * Check if position meets minimum accuracy requirements
   */
  meetsAccuracyRequirement(position: GpsPosition): boolean {
    const meetsAccuracy = position.accuracy <= this.config.minAccuracy;
    console.log('Accuracy check:', position.accuracy, 'vs', this.config.minAccuracy, 'meets:', meetsAccuracy);
    return meetsAccuracy;
  }

  /**
   * Get GPS accuracy level
   */
  getAccuracyLevel(accuracy: number): 'high' | 'medium' | 'low' {
    if (accuracy <= 10) return 'high';
    if (accuracy <= 50) return 'medium';
    return 'low';
  }

  /**
   * Calculate signal strength based on accuracy
   */
  calculateSignalStrength(accuracy: number): number {
    // Signal strength 0-100 based on accuracy
    // 0m accuracy = 100% signal
    // 100m accuracy = 0% signal
    const maxAccuracy = 100;
    const strength = Math.max(0, Math.min(100, 100 - (accuracy / maxAccuracy) * 100));
    return Math.round(strength);
  }

  /**
   * Reset filter state
   */
  reset(): void {
    this.lastValidPosition = null;
    this.smoothedSpeed = 0;
  }

  /**
   * Update filter configuration
   */
  updateConfig(config: Partial<TrackingConfig>): void {
    this.config = { ...this.config, ...config };
  }
}