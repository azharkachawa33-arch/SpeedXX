import type { SpeedLimitConfig } from '../../models/types';

const SETTINGS_KEY = 'speedx_settings';

export type Theme = 'system' | 'light' | 'dark';
export type SpeedUnit = 'km/h' | 'mph' | 'knots';
export type DistanceUnit = 'km' | 'mi' | 'nm';
export type GpsAccuracy = 'balanced' | 'high';

export interface AppSettings {
  theme: Theme;
  speedUnit: SpeedUnit;
  distanceUnit: DistanceUnit;
  speedLimit: SpeedLimitConfig;
  compassEnabled: boolean;
  compassOnSpeedometer: boolean;
  compassOnHud: boolean;
  hudEnabled: boolean;
  hudFullscreen: boolean;
  hudWakeLock: boolean;
  hudShowSecondaryStats: boolean;
  gpsAccuracy: GpsAccuracy;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  speedUnit: 'km/h',
  distanceUnit: 'km',
  speedLimit: {
    enabled: false,
    value: 80,
    unit: 'km/h',
    warningThreshold: 5,
    soundEnabled: true,
    vibrationEnabled: true,
  },
  compassEnabled: true,
  compassOnSpeedometer: true,
  compassOnHud: true,
  hudEnabled: true,
  hudFullscreen: false,
  hudWakeLock: true,
  hudShowSecondaryStats: true,
  gpsAccuracy: 'high',
};

export class SettingsService {
  private settings: AppSettings;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...defaultSettings };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSpeedLimitConfig(config: Partial<SpeedLimitConfig>): void {
    this.settings.speedLimit = { ...this.settings.speedLimit, ...config };
    this.saveSettings();
  }

  getSpeedLimitConfig(): SpeedLimitConfig {
    return { ...this.settings.speedLimit };
  }

  getSpeedUnit(): SpeedUnit {
    return this.settings.speedUnit;
  }

  updateSpeedUnit(unit: SpeedUnit): void {
    this.settings.speedUnit = unit;
    this.saveSettings();
  }

  getDistanceUnit(): DistanceUnit {
    return this.settings.distanceUnit;
  }

  updateDistanceUnit(unit: DistanceUnit): void {
    this.settings.distanceUnit = unit;
    this.saveSettings();
  }

  getTheme(): Theme {
    return this.settings.theme;
  }

  updateTheme(theme: Theme): void {
    this.settings.theme = theme;
    this.saveSettings();
  }

  getCompassEnabled(): boolean {
    return this.settings.compassEnabled;
  }

  updateCompassEnabled(enabled: boolean): void {
    this.settings.compassEnabled = enabled;
    this.saveSettings();
  }

  getCompassOnSpeedometer(): boolean {
    return this.settings.compassOnSpeedometer;
  }

  updateCompassOnSpeedometer(enabled: boolean): void {
    this.settings.compassOnSpeedometer = enabled;
    this.saveSettings();
  }

  getCompassOnHud(): boolean {
    return this.settings.compassOnHud;
  }

  updateCompassOnHud(enabled: boolean): void {
    this.settings.compassOnHud = enabled;
    this.saveSettings();
  }

  getHudEnabled(): boolean {
    return this.settings.hudEnabled;
  }

  updateHudEnabled(enabled: boolean): void {
    this.settings.hudEnabled = enabled;
    this.saveSettings();
  }

  getHudFullscreen(): boolean {
    return this.settings.hudFullscreen;
  }

  updateHudFullscreen(enabled: boolean): void {
    this.settings.hudFullscreen = enabled;
    this.saveSettings();
  }

  getHudWakeLock(): boolean {
    return this.settings.hudWakeLock;
  }

  updateHudWakeLock(enabled: boolean): void {
    this.settings.hudWakeLock = enabled;
    this.saveSettings();
  }

  getHudShowSecondaryStats(): boolean {
    return this.settings.hudShowSecondaryStats;
  }

  updateHudShowSecondaryStats(enabled: boolean): void {
    this.settings.hudShowSecondaryStats = enabled;
    this.saveSettings();
  }

  getGpsAccuracy(): GpsAccuracy {
    return this.settings.gpsAccuracy;
  }

  updateGpsAccuracy(accuracy: GpsAccuracy): void {
    this.settings.gpsAccuracy = accuracy;
    this.saveSettings();
  }

  resetToDefaults(): void {
    this.settings = { ...defaultSettings };
    this.saveSettings();
  }
}

// Singleton instance
let settingsServiceInstance: SettingsService | null = null;

export function getSettingsService(): SettingsService {
  if (!settingsServiceInstance) {
    settingsServiceInstance = new SettingsService();
  }
  return settingsServiceInstance;
}