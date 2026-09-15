import { useState, useEffect, useCallback } from 'react';
import { getSpeedLimitService } from '../services/speedLimit';
import { getSettingsService } from '../services/settings/settingsService';
import type { SpeedLimitConfig, SpeedLimitState, WarningLevel } from '../models/types';
import { mpsToKmh, mpsToMph, mpsToKnots } from '../utils/speedConversion';

export function useSpeedLimit() {
  const speedLimitService = getSpeedLimitService();
  const [config, setConfig] = useState<SpeedLimitConfig>(speedLimitService.getConfig());
  const [state, setState] = useState<SpeedLimitState>(speedLimitService.getState());

  useEffect(() => {
    // Load settings from localStorage
    const settingsService = getSettingsService();
    const savedConfig = settingsService.getSpeedLimitConfig();
    setConfig(savedConfig);
    speedLimitService.updateConfig(savedConfig);

    speedLimitService.onStateChange((newState) => {
      setState(newState);
    });

    return () => {
      speedLimitService.cleanup();
    };
  }, []);

  const updateConfig = useCallback((newConfig: Partial<SpeedLimitConfig>) => {
    speedLimitService.updateConfig(newConfig);
    setConfig(speedLimitService.getConfig());
  }, []);

  const evaluateSpeed = useCallback((speedMps: number) => {
    speedLimitService.evaluateSpeedLimit(speedMps);
  }, []);

  const initializeAudio = useCallback(() => {
    speedLimitService.initializeAudio();
  }, []);

  const getFormattedLimit = useCallback(() => {
    const limitMps = state.speedLimit;
    switch (config.unit) {
      case 'km/h':
        return `${Math.round(mpsToKmh(limitMps))} km/h`;
      case 'mph':
        return `${Math.round(mpsToMph(limitMps))} mph`;
      case 'knots':
        return `${Math.round(mpsToKnots(limitMps))} knots`;
      default:
        return `${Math.round(mpsToKmh(limitMps))} km/h`;
    }
  }, [state.speedLimit, config.unit]);

  const getFormattedCurrentSpeed = useCallback(() => {
    const speedMps = state.currentSpeed;
    switch (config.unit) {
      case 'km/h':
        return `${Math.round(mpsToKmh(speedMps))} km/h`;
      case 'mph':
        return `${Math.round(mpsToMph(speedMps))} mph`;
      case 'knots':
        return `${Math.round(mpsToKnots(speedMps))} knots`;
      default:
        return `${Math.round(mpsToKmh(speedMps))} km/h`;
    }
  }, [state.currentSpeed, config.unit]);

  const getWarningLevelText = useCallback(() => {
    switch (state.warningLevel) {
      case 'normal':
        return 'Normal';
      case 'approaching':
        return 'Approaching';
      case 'exceeded':
        return 'Speed Limit Exceeded';
      default:
        return 'Normal';
    }
  }, [state.warningLevel]);

  const setMonitoringActive = useCallback((active: boolean) => {
    speedLimitService.setMonitoringActive(active);
  }, []);

  return {
    config,
    state,
    updateConfig,
    evaluateSpeed,
    initializeAudio,
    getFormattedLimit,
    getFormattedCurrentSpeed,
    getWarningLevelText,
    setMonitoringActive,
  };
}