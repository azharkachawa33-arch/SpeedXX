// Core Types
export interface SpeedData {
  currentSpeed: number;
  unit: SpeedUnit;
  timestamp: number;
}

export interface TripStatistics {
  averageSpeed: number;
  maxSpeed: number;
  distance: number;
  duration: number; // in seconds
}

export interface AdvancedTripStatistics {
  movingTime: number; // in seconds
  stoppedTime: number; // in seconds
  movingAverageSpeed: number;
  overallAverageSpeed: number;
  maximumSpeed: number;
  minimumSpeed: number;
  distance: number;
  duration: number;
  elevationGain?: number; // in meters
  elevationLoss?: number; // in meters
  maxElevation?: number; // in meters
  minElevation?: number; // in meters
  speedDistribution: SpeedDistributionBucket[];
}

export interface SpeedDistributionBucket {
  minSpeed: number;
  maxSpeed: number;
  timeSpent: number; // in seconds
  percentage: number;
}

export interface Trip {
  id: string;
  name: string;
  date: number;
  statistics: TripStatistics;
  advancedStatistics?: AdvancedTripStatistics;
  route?: RoutePoint[];
  startTime: number;
  endTime: number;
  speedUnit: SpeedUnit;
  distanceUnit: DistanceUnit;
  startLocation?: LocationData;
  endLocation?: LocationData;
  createdAt: number;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  altitude?: number;
  heading?: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  speed?: number; // in m/s
  altitude?: number; // in meters
  heading?: number; // in degrees
}

export interface GpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null; // in m/s
  timestamp: number;
}

export interface GpsStatus {
  available: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'unknown';
  accuracy: 'high' | 'medium' | 'low' | 'unknown';
  signalStrength: number; // 0-100
  state: 'ready' | 'searching' | 'active' | 'weak' | 'permission_required' | 'unavailable';
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: number;
  autoHide?: boolean;
}

export interface AppSettings {
  speedUnit: 'km/h' | 'mph';
  appearance: 'dark' | 'light' | 'auto';
  speedAlert: boolean;
  alertSound: boolean;
  gpsAccuracy: 'high' | 'balanced' | 'low';
}

// Speed Limit Types
export type SpeedUnit = 'km/h' | 'mph' | 'knots';
export type DistanceUnit = 'km' | 'mi' | 'nm';
export type WarningLevel = 'normal' | 'approaching' | 'exceeded';

export interface SpeedLimitConfig {
  enabled: boolean;
  value: number; // in configured unit
  unit: SpeedUnit;
  warningThreshold: number; // in configured unit
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface SpeedLimitState {
  currentSpeed: number; // in m/s
  speedLimit: number; // in m/s
  warningLevel: WarningLevel;
  isActive: boolean;
  lastAlertTime: number;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

// GPS Tracking Types
export type TripState = 'idle' | 'starting' | 'running' | 'paused' | 'stopping' | 'completed' | 'error';

export interface TrackingState {
  state: TripState;
  currentPosition: GpsPosition | null;
  statistics: TripStatistics;
  startTime: number | null;
  pausedTime: number; // total time spent in paused state
  lastPauseStart: number | null;
  route: LocationData[];
  error: string | null;
}

export interface GpsError {
  type: 'permission_denied' | 'position_unavailable' | 'timeout' | 'unsupported' | 'signal_unavailable' | 'invalid_data';
  message: string;
  code?: number;
  retryable: boolean;
}

export interface TrackingConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  minAccuracy: number; // minimum accuracy in meters
  maxSpeedJump: number; // maximum reasonable speed jump in m/s
  maxDistanceJump: number; // maximum reasonable distance jump in meters
  smoothingFactor: number; // 0-1, lower = more smoothing
}