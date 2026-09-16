import type { SpeedLimitConfig, SpeedLimitState, WarningLevel, SpeedUnit } from '../../models/types';
import { mpsToKmh, mpsToMph, mpsToKnots, kmhToMps, mphToMps, knotsToMps } from '../../utils/speedConversion';
import { getSettingsService } from '../settings/settingsService';

export class SpeedLimitService {
  private config: SpeedLimitConfig;
  private state: SpeedLimitState;
  private stateCallback: ((state: SpeedLimitState) => void) | null = null;
  private alertCallback: ((state: SpeedLimitState) => void) | null = null;
  private hysteresisBuffer: number; // in m/s
  private alertCooldown: number = 5000; // 5 seconds between alerts
  private audioContext: AudioContext | null = null;
  private audioInitialized: boolean = false;

  constructor() {
    const settingsService = getSettingsService();
    this.config = settingsService.getSpeedLimitConfig();
    
    // Sync speed limit unit with global speed unit
    const globalSpeedUnit = settingsService.getSpeedUnit();
    if (this.config.unit !== globalSpeedUnit) {
      // Convert the speed limit value to match the global unit
      let convertedValue = this.config.value;
      if (this.config.unit === 'km/h' && globalSpeedUnit === 'mph') {
        convertedValue = this.config.value * 0.621371;
      } else if (this.config.unit === 'mph' && globalSpeedUnit === 'km/h') {
        convertedValue = this.config.value / 0.621371;
      }
      convertedValue = Math.round(convertedValue * 10) / 10;
      this.config.unit = globalSpeedUnit;
      this.config.value = convertedValue;
    }
    
    this.state = this.getInitialState();
    this.hysteresisBuffer = 2.777; // ~10 km/h in m/s
  }

  private getInitialState(): SpeedLimitState {
    return {
      currentSpeed: 0,
      speedLimit: this.configToMps(this.config.value, this.config.unit),
      warningLevel: 'normal',
      isActive: false,
      lastAlertTime: 0,
    };
  }

  private configToMps(value: number, unit: SpeedUnit): number {
    switch (unit) {
      case 'km/h':
        return kmhToMps(value);
      case 'mph':
        return mphToMps(value);
      case 'knots':
        return knotsToMps(value);
      default:
        return kmhToMps(value);
    }
  }

  private mpsToConfigUnit(mps: number, unit: SpeedUnit): number {
    switch (unit) {
      case 'km/h':
        return mpsToKmh(mps);
      case 'mph':
        return mpsToMph(mps);
      case 'knots':
        return mpsToKnots(mps);
      default:
        return mpsToKmh(mps);
    }
  }

  updateConfig(newConfig: Partial<SpeedLimitConfig>): void {
    const oldUnit = this.config.unit;
    const newUnit = newConfig.unit || oldUnit;
    
    // Convert speed limit value if unit changes
    if (newConfig.unit && newConfig.unit !== oldUnit) {
      let convertedValue = this.config.value;
      if (oldUnit === 'km/h' && newUnit === 'mph') {
        // Convert km/h to mph
        convertedValue = this.config.value * 0.621371;
      } else if (oldUnit === 'mph' && newUnit === 'km/h') {
        // Convert mph to km/h
        convertedValue = this.config.value / 0.621371;
      }
      
      // Round to reasonable precision
      convertedValue = Math.round(convertedValue * 10) / 10;
      
      this.config = { ...this.config, ...newConfig, value: convertedValue };
    } else {
      this.config = { ...this.config, ...newConfig };
    }
    
    // Persist to settings service
    const settingsService = getSettingsService();
    settingsService.updateSpeedLimitConfig(this.config);
    
    // Recalculate speed limit in m/s
    this.state.speedLimit = this.configToMps(this.config.value, this.config.unit);
    
    // Reevaluate current state
    this.evaluateSpeedLimit(this.state.currentSpeed);
  }

  getConfig(): SpeedLimitConfig {
    return { ...this.config };
  }

  evaluateSpeedLimit(currentSpeedMps: number): void {
    if (!this.config.enabled) {
      this.setWarningLevel('normal');
      return;
    }

    this.state.currentSpeed = currentSpeedMps;
    const thresholdMps = this.configToMps(this.config.warningThreshold, this.config.unit);
    const activationThreshold = this.state.speedLimit + thresholdMps;
    const deactivationThreshold = this.state.speedLimit - this.hysteresisBuffer;

    let newWarningLevel: WarningLevel;

    if (currentSpeedMps >= activationThreshold) {
      newWarningLevel = 'exceeded';
    } else if (currentSpeedMps >= this.state.speedLimit) {
      newWarningLevel = 'approaching';
    } else {
      newWarningLevel = 'normal';
    }

    // Apply hysteresis - only downgrade if significantly below threshold
    if (this.state.warningLevel === 'exceeded' && newWarningLevel !== 'exceeded') {
      if (currentSpeedMps > deactivationThreshold) {
        newWarningLevel = 'exceeded'; // Keep exceeded until well below
      }
    }

    const previousLevel = this.state.warningLevel;
    this.setWarningLevel(newWarningLevel);

    // Trigger alert when entering exceeded state
    if (previousLevel !== 'exceeded' && newWarningLevel === 'exceeded') {
      this.triggerAlert();
    }

    this.notifyState();
  }

  private setWarningLevel(level: WarningLevel): void {
    this.state.warningLevel = level;
    this.state.isActive = level !== 'normal';
  }

  setMonitoringActive(active: boolean): void {
    if (!active) {
      // Reset to normal when monitoring stops
      this.setWarningLevel('normal');
    }
  }

  private triggerAlert(): void {
    const now = Date.now();
    
    // Check cooldown
    if (now - this.state.lastAlertTime < this.alertCooldown) {
      return;
    }

    this.state.lastAlertTime = now;

    // Trigger sound
    if (this.config.soundEnabled) {
      this.playAlertSound();
    }

    // Trigger vibration
    if (this.config.vibrationEnabled) {
      this.vibrate();
    }

    // Notify alert callback
    if (this.alertCallback) {
      this.alertCallback(this.state);
    }
  }

  private async playAlertSound(): Promise<void> {
    try {
      // Initialize audio context on first use (user gesture required)
      if (!this.audioInitialized) {
        if (!this.audioContext) {
          this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        
        this.audioInitialized = true;
      }

      if (!this.audioContext) return;

      // Create a simple beep sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = 800; // 800 Hz beep
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.2);
    } catch (error) {
      // Alert sound failed silently
    }
  }

  private vibrate(): void {
    if (!('vibrate' in navigator)) {
      return;
    }

    try {
      navigator.vibrate(200); // 200ms vibration
    } catch (error) {
      // Vibration failed silently
    }
  }

  initializeAudio(): void {
    // Initialize audio context on user gesture
    if (!this.audioInitialized && this.config.soundEnabled) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.audioInitialized = true;
      } catch (error) {
        // Audio initialization failed silently
      }
    }
  }

  getState(): SpeedLimitState {
    return { ...this.state };
  }

  onStateChange(callback: (state: SpeedLimitState) => void): void {
    this.stateCallback = callback;
  }

  onAlert(callback: (state: SpeedLimitState) => void): void {
    this.alertCallback = callback;
  }

  private notifyState(): void {
    if (this.stateCallback) {
      this.stateCallback(this.getState());
    }
  }

  reset(): void {
    this.state = this.getInitialState();
    this.notifyState();
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioInitialized = false;
    this.stateCallback = null;
    this.alertCallback = null;
  }
}

// Singleton instance
let speedLimitServiceInstance: SpeedLimitService | null = null;

export function getSpeedLimitService(): SpeedLimitService {
  if (!speedLimitServiceInstance) {
    speedLimitServiceInstance = new SpeedLimitService();
  }
  return speedLimitServiceInstance;
}