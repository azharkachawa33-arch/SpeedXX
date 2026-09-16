export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';
export type CompassSource = 'device' | 'gps' | 'unavailable';

export interface CompassData {
  heading: number; // 0-359 degrees
  accuracy: number | null; // confidence level 0-100 or null
  source: CompassSource;
  timestamp: number;
}

export interface CompassStatus {
  available: boolean;
  permission: PermissionState;
  source: CompassSource;
  active: boolean;
  calibrationNeeded: boolean;
}

export class OrientationService {
  private currentHeading: number = 0;
  private currentSource: CompassSource = 'unavailable';
  private isActive: boolean = false;
  private calibrationNeeded: boolean = false;
  private permissionState: PermissionState = 'prompt';
  private headingCallback: ((data: CompassData) => void) | null = null;
  private statusCallback: ((status: CompassStatus) => void) | null = null;
  private lastGpsHeading: number | null = null;
  private lastGpsSpeed: number | null = null;
  private smoothingFactor: number = 0.1; // Exponential smoothing factor

  constructor() {
    this.checkAvailability();
  }

  private checkAvailability(): void {
    const hasDeviceOrientation = 'DeviceOrientationEvent' in window;
    this.permissionState = hasDeviceOrientation ? 'prompt' : 'unsupported';
  }

  isAvailable(): boolean {
    return 'DeviceOrientationEvent' in window;
  }

  async requestPermission(): Promise<PermissionState> {
    if (!this.isAvailable()) {
      this.permissionState = 'unsupported';
      return 'unsupported';
    }

    // iOS 13+ requires explicit permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        this.permissionState = permission === 'granted' ? 'granted' : 'denied';
        return this.permissionState;
      } catch (error) {
        this.permissionState = 'denied';
        return 'denied';
      }
    }

    // Non-iOS devices don't require permission
    this.permissionState = 'granted';
    return 'granted';
  }

  startCompass(): void {
    if (this.isActive) return;

    if (this.permissionState !== 'granted') {
      return;
    }

    this.isActive = true;
    this.currentSource = 'device';
    
    window.addEventListener('deviceorientation', this.handleOrientation);
    window.addEventListener('deviceorientationabsolute', this.handleAbsoluteOrientation);
    
    this.notifyStatus();
  }

  stopCompass(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.currentSource = 'unavailable';
    
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.removeEventListener('deviceorientationabsolute', this.handleAbsoluteOrientation);
    
    this.notifyStatus();
  }

  private handleOrientation = (event: DeviceOrientationEvent): void => {
    if (!this.isActive) return;

    // Try to get heading from alpha (compass heading)
    if (event.alpha !== null && !isNaN(event.alpha)) {
      const heading = this.normalizeHeading(event.alpha);
      this.updateHeading(heading, 'device');
    }
  };

  private handleAbsoluteOrientation = (event: DeviceOrientationEvent): void => {
    if (!this.isActive) return;

    // Absolute orientation is more accurate when available
    if (event.alpha !== null && !isNaN(event.alpha)) {
      const heading = this.normalizeHeading(event.alpha);
      this.updateHeading(heading, 'device');
    }
  };

  private normalizeHeading(degrees: number): number {
    // Normalize to 0-359 range
    let normalized = degrees % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  }

  private updateHeading(newHeading: number, source: CompassSource): void {
    // Apply exponential smoothing to reduce noise
    const smoothedHeading = this.smoothHeading(this.currentHeading, newHeading);
    this.currentHeading = smoothedHeading;
    this.currentSource = source;

    if (this.headingCallback) {
      this.headingCallback({
        heading: smoothedHeading,
        accuracy: null, // Device orientation doesn't provide accuracy
        source: source,
        timestamp: Date.now(),
      });
    }
  }

  private smoothHeading(current: number, target: number): number {
    // Handle circular angle smoothing (359° → 0°)
    const diff = target - current;
    const normalizedDiff = diff - 360 * Math.round(diff / 360);
    return current + this.smoothingFactor * normalizedDiff;
  }

  updateGpsHeading(heading: number | null, speed: number | null): void {
    this.lastGpsHeading = heading;
    this.lastGpsSpeed = speed;

    // Only use GPS heading if device orientation is unavailable and device is moving
    if (this.currentSource === 'unavailable' && heading !== null && speed !== null && speed > 1) {
      const normalizedHeading = this.normalizeHeading(heading);
      this.updateHeading(normalizedHeading, 'gps');
    }
  }

  getCurrentHeading(): number {
    return this.currentHeading;
  }

  getCurrentSource(): CompassSource {
    return this.currentSource;
  }

  getStatus(): CompassStatus {
    return {
      available: this.isAvailable(),
      permission: this.permissionState,
      source: this.currentSource,
      active: this.isActive,
      calibrationNeeded: this.calibrationNeeded,
    };
  }

  onHeadingUpdate(callback: (data: CompassData) => void): void {
    this.headingCallback = callback;
  }

  onStatusChange(callback: (status: CompassStatus) => void): void {
    this.statusCallback = callback;
  }

  private notifyStatus(): void {
    if (this.statusCallback) {
      this.statusCallback(this.getStatus());
    }
  }

  cleanup(): void {
    this.stopCompass();
    this.headingCallback = null;
    this.statusCallback = null;
  }
}

// Singleton instance
let orientationServiceInstance: OrientationService | null = null;

export function getOrientationService(): OrientationService {
  if (!orientationServiceInstance) {
    orientationServiceInstance = new OrientationService();
  }
  return orientationServiceInstance;
}