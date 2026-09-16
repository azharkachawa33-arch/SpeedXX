import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useTripHistory } from '../../hooks/useTripHistory';
import { useCompass } from '../../hooks/useCompass';
import { useSpeedLimit } from '../../hooks/useSpeedLimit';
import { useTracking } from '../../hooks/useTracking';
import { useNotifications } from '../../components/common/NotificationSystem';
import { usePWA } from '../../hooks/usePWA';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { getSettingsService, type Theme, type SpeedUnit, type DistanceUnit, type GpsAccuracy } from '../../services/settings/settingsService';
import { APP_VERSION } from '../../constants/app';
import { getTripStorage } from '../../services/storage';

export const SettingsView: React.FC = () => {
  const { getTripCount, clearAllTrips } = useTripHistory();
  const { status: compassStatus } = useCompass();
  const { config: speedLimitConfig, updateConfig: updateSpeedLimitConfig } = useSpeedLimit();
  const { speedUnit, updateSpeedUnit } = useTracking();
  const { addNotification } = useNotifications();
  const { isInstallable, isInstalled, isStandalone, showIOSPrompt, installApp, dismissIOSPrompt } = usePWA();
  const { isOnline } = useOnlineStatus();
  const settingsService = getSettingsService();
  
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [tripCount, setTripCount] = useState<number>(0);
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Load all settings
  const [theme, setTheme] = useState<Theme>(settingsService.getTheme());
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(settingsService.getDistanceUnit());
  const [compassEnabled, setCompassEnabled] = useState(settingsService.getCompassEnabled());
  const [compassOnSpeedometer, setCompassOnSpeedometer] = useState(settingsService.getCompassOnSpeedometer());
  const [compassOnHud, setCompassOnHud] = useState(settingsService.getCompassOnHud());
  const [hudEnabled, setHudEnabled] = useState(settingsService.getHudEnabled());
  const [hudFullscreen, setHudFullscreen] = useState(settingsService.getHudFullscreen());
  const [hudWakeLock, setHudWakeLock] = useState(settingsService.getHudWakeLock());
  const [hudShowSecondaryStats, setHudShowSecondaryStats] = useState(settingsService.getHudShowSecondaryStats());
  const [gpsAccuracy, setGpsAccuracy] = useState<GpsAccuracy>(settingsService.getGpsAccuracy());
  
  const [tempSpeedLimit, setTempSpeedLimit] = useState(speedLimitConfig.value.toString());
  const [tempWarningThreshold, setTempWarningThreshold] = useState(speedLimitConfig.warningThreshold.toString());

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await clearAllTrips();
      addNotification({
        type: 'success',
        message: 'All trips cleared successfully',
        autoHide: true,
      });
      setTripCount(0);
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to clear trip history',
        autoHide: true,
      });
    } finally {
      setClearing(false);
      setShowClearDialog(false);
    }
  };

  const handleResetSettings = async () => {
    setResetting(true);
    try {
      settingsService.resetToDefaults();
      
      // Reload all settings
      setTheme(settingsService.getTheme());
      setDistanceUnit(settingsService.getDistanceUnit());
      setCompassEnabled(settingsService.getCompassEnabled());
      setCompassOnSpeedometer(settingsService.getCompassOnSpeedometer());
      setCompassOnHud(settingsService.getCompassOnHud());
      setHudEnabled(settingsService.getHudEnabled());
      setHudFullscreen(settingsService.getHudFullscreen());
      setHudWakeLock(settingsService.getHudWakeLock());
      setHudShowSecondaryStats(settingsService.getHudShowSecondaryStats());
      setGpsAccuracy(settingsService.getGpsAccuracy());
      
      addNotification({
        type: 'success',
        message: 'Settings reset to defaults',
        autoHide: true,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to reset settings',
        autoHide: true,
      });
    } finally {
      setResetting(false);
      setShowResetDialog(false);
    }
  };

  const handleExportAllData = async () => {
    setExporting(true);
    try {
      const storage = getTripStorage();
      const trips = await storage.getAllTrips();
      
      const exportData = {
        version: APP_VERSION,
        exportDate: new Date().toISOString(),
        tripCount: trips.length,
        trips: trips,
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `speedometer-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Export successful',
        autoHide: true,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to export data',
        autoHide: true,
      });
    } finally {
      setExporting(false);
    }
  };

  // Load trip count on mount
  useEffect(() => {
    const loadCount = async () => {
      try {
        const count = await getTripCount();
        setTripCount(count);
      } catch (error) {
        // Trip count load failed silently
      }
    };
    loadCount();
  }, [getTripCount]);

  // Sync temp values with config
  useEffect(() => {
    setTempSpeedLimit(speedLimitConfig.value.toString());
    setTempWarningThreshold(speedLimitConfig.warningThreshold.toString());
  }, [speedLimitConfig.value, speedLimitConfig.warningThreshold, speedLimitConfig.unit]);

  // Apply theme
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      const effectiveTheme = theme === 'system' ? systemTheme : theme;
      
      if (effectiveTheme === 'dark') {
        root.style.setProperty('--color-background-primary', '#0a0a0a');
        root.style.setProperty('--color-background-secondary', '#141414');
        root.style.setProperty('--color-background-tertiary', '#1a1a1a');
        root.style.setProperty('--color-background-card', '#1e1e1e');
        root.style.setProperty('--color-text-primary', '#ffffff');
        root.style.setProperty('--color-text-secondary', '#a0a0a0');
        root.style.setProperty('--color-text-tertiary', '#666666');
        root.style.setProperty('--color-border-primary', '#2a2a2a');
        root.style.setProperty('--color-border-secondary', '#333333');
      } else {
        root.style.setProperty('--color-background-primary', '#ffffff');
        root.style.setProperty('--color-background-secondary', '#f5f5f5');
        root.style.setProperty('--color-background-tertiary', '#e5e5e5');
        root.style.setProperty('--color-background-card', '#ffffff');
        root.style.setProperty('--color-text-primary', '#111111');
        root.style.setProperty('--color-text-secondary', '#666666');
        root.style.setProperty('--color-text-tertiary', '#999999');
        root.style.setProperty('--color-border-primary', '#e0e0e0');
        root.style.setProperty('--color-border-secondary', '#d0d0d0');
      }
    };
    
    applyTheme();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme();
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleSpeedLimitToggle = () => {
    updateSpeedLimitConfig({ enabled: !speedLimitConfig.enabled });
  };

  const handleSpeedLimitChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 500) {
      setTempSpeedLimit(value);
      updateSpeedLimitConfig({ value: numValue });
    }
  };

  const handleWarningThresholdChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      setTempWarningThreshold(value);
      updateSpeedLimitConfig({ warningThreshold: numValue });
    }
  };

  const handleSoundToggle = () => {
    updateSpeedLimitConfig({ soundEnabled: !speedLimitConfig.soundEnabled });
  };

  const handleVibrationToggle = () => {
    updateSpeedLimitConfig({ vibrationEnabled: !speedLimitConfig.vibrationEnabled });
  };

  const handleInstallApp = async () => {
    const installed = await installApp();
    if (installed) {
      addNotification({
        type: 'success',
        message: 'Speedometer installed successfully',
        autoHide: true,
      });
    }
  };

  const handleSpeedUnitChange = (newUnit: SpeedUnit) => {
    updateSpeedUnit(newUnit);
    updateSpeedLimitConfig({ unit: newUnit });
    addNotification({
      type: 'success',
      message: `Speed unit changed to ${newUnit}`,
      autoHide: true,
    });
  };

  const handleDistanceUnitChange = (newUnit: DistanceUnit) => {
    setDistanceUnit(newUnit);
    settingsService.updateDistanceUnit(newUnit);
    addNotification({
      type: 'success',
      message: `Distance unit changed to ${newUnit}`,
      autoHide: true,
    });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    settingsService.updateTheme(newTheme);
  };

  const handleCompassEnabledToggle = () => {
    const newValue = !compassEnabled;
    setCompassEnabled(newValue);
    settingsService.updateCompassEnabled(newValue);
  };

  const handleCompassOnSpeedometerToggle = () => {
    const newValue = !compassOnSpeedometer;
    setCompassOnSpeedometer(newValue);
    settingsService.updateCompassOnSpeedometer(newValue);
  };

  const handleCompassOnHudToggle = () => {
    const newValue = !compassOnHud;
    setCompassOnHud(newValue);
    settingsService.updateCompassOnHud(newValue);
  };

  const handleHudEnabledToggle = () => {
    const newValue = !hudEnabled;
    setHudEnabled(newValue);
    settingsService.updateHudEnabled(newValue);
  };

  const handleHudFullscreenToggle = () => {
    const newValue = !hudFullscreen;
    setHudFullscreen(newValue);
    settingsService.updateHudFullscreen(newValue);
  };

  const handleHudWakeLockToggle = () => {
    const newValue = !hudWakeLock;
    setHudWakeLock(newValue);
    settingsService.updateHudWakeLock(newValue);
  };

  const handleHudShowSecondaryStatsToggle = () => {
    const newValue = !hudShowSecondaryStats;
    setHudShowSecondaryStats(newValue);
    settingsService.updateHudShowSecondaryStats(newValue);
  };

  const handleGpsAccuracyChange = (newAccuracy: GpsAccuracy) => {
    setGpsAccuracy(newAccuracy);
    settingsService.updateGpsAccuracy(newAccuracy);
    addNotification({
      type: 'success',
      message: `GPS accuracy set to ${newAccuracy}`,
      autoHide: true,
    });
  };

  const ThemeButton: React.FC<{ value: Theme; label: string }> = ({ value, label }) => (
    <Button
      size="sm"
      variant={theme === value ? 'primary' : 'secondary'}
      onClick={() => handleThemeChange(value)}
      aria-label={`Set theme to ${label}`}
    >
      {label}
    </Button>
  );

  const SpeedUnitButton: React.FC<{ value: SpeedUnit }> = ({ value }) => (
    <Button
      size="sm"
      variant={speedUnit === value ? 'primary' : 'secondary'}
      onClick={() => handleSpeedUnitChange(value)}
      aria-label={`Set speed unit to ${value}`}
    >
      {value}
    </Button>
  );

  const DistanceUnitButton: React.FC<{ value: DistanceUnit }> = ({ value }) => (
    <Button
      size="sm"
      variant={distanceUnit === value ? 'primary' : 'secondary'}
      onClick={() => handleDistanceUnitChange(value)}
      aria-label={`Set distance unit to ${value}`}
    >
      {value}
    </Button>
  );

  const GpsAccuracyButton: React.FC<{ value: GpsAccuracy; label: string }> = ({ value, label }) => (
    <Button
      size="sm"
      variant={gpsAccuracy === value ? 'primary' : 'secondary'}
      onClick={() => handleGpsAccuracyChange(value)}
      aria-label={`Set GPS accuracy to ${label}`}
    >
      {label}
    </Button>
  );

  const ToggleSetting: React.FC<{
    icon: string;
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }> = ({ icon, label, description, enabled, onToggle, disabled }) => (
    <Card padding="md">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon name={icon} size={20} className="text-[var(--color-accent-primary)]" />
          <div>
            <p className="text-[var(--color-text-primary)] font-medium">{label}</p>
            <p className="text-[var(--color-text-secondary)] text-sm">{description}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={enabled ? 'primary' : 'secondary'}
          onClick={onToggle}
          disabled={disabled}
          aria-label={`${label} ${enabled ? 'enabled' : 'disabled'}`}
        >
          {enabled ? 'ON' : 'OFF'}
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
      </header>

      <div className="px-4 py-6 space-y-6 pb-24">
        {/* Appearance Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Appearance</h2>
          <div className="space-y-3">
            <Card padding="md">
              <div className="space-y-3">
                <div>
                  <p className="text-[var(--color-text-primary)] font-medium mb-2">Theme</p>
                  <div className="flex space-x-2">
                    <ThemeButton value="system" label="System" />
                    <ThemeButton value="light" label="Light" />
                    <ThemeButton value="dark" label="Dark" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Speed & Distance Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Speed & Distance</h2>
          <div className="space-y-3">
            <Card padding="md">
              <div className="space-y-3">
                <div>
                  <p className="text-[var(--color-text-primary)] font-medium mb-2">Speed Unit</p>
                  <div className="flex space-x-2">
                    <SpeedUnitButton value="km/h" />
                    <SpeedUnitButton value="mph" />
                    <SpeedUnitButton value="knots" />
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <div className="space-y-3">
                <div>
                  <p className="text-[var(--color-text-primary)] font-medium mb-2">Distance Unit</p>
                  <div className="flex space-x-2">
                    <DistanceUnitButton value="km" />
                    <DistanceUnitButton value="mi" />
                    <DistanceUnitButton value="nm" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Speed Alerts Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Speed Alerts</h2>
          <div className="space-y-3">
            <ToggleSetting
              icon="alert"
              label="Speed Limit Alert"
              description={speedLimitConfig.enabled ? 'Enabled' : 'Disabled'}
              enabled={speedLimitConfig.enabled}
              onToggle={handleSpeedLimitToggle}
            />

            {speedLimitConfig.enabled && (
              <>
                <Card padding="md">
                  <div className="space-y-3">
                    <div>
                      <label 
                        htmlFor="speed-limit-input"
                        className="text-sm text-[var(--color-text-secondary)] mb-1 block"
                      >
                        Speed Limit ({speedLimitConfig.unit})
                      </label>
                      <input
                        id="speed-limit-input"
                        type="number"
                        value={tempSpeedLimit}
                        onChange={(e) => handleSpeedLimitChange(e.target.value)}
                        min="0"
                        max="500"
                        step="1"
                        aria-label={`Speed limit in ${speedLimitConfig.unit}`}
                        className="w-full px-3 py-2 bg-[var(--color-background-tertiary)] border border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                      />
                    </div>
                    <div>
                      <label 
                        htmlFor="warning-threshold-input"
                        className="text-sm text-[var(--color-text-secondary)] mb-1 block"
                      >
                        Warning Threshold ({speedLimitConfig.unit})
                      </label>
                      <input
                        id="warning-threshold-input"
                        type="number"
                        value={tempWarningThreshold}
                        onChange={(e) => handleWarningThresholdChange(e.target.value)}
                        min="0"
                        max="50"
                        step="1"
                        aria-label={`Warning threshold in ${speedLimitConfig.unit}`}
                        className="w-full px-3 py-2 bg-[var(--color-background-tertiary)] border border-[var(--color-border-primary)] rounded-lg text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                      />
                    </div>
                  </div>
                </Card>

                <ToggleSetting
                  icon="volume-high"
                  label="Sound Alert"
                  description={speedLimitConfig.soundEnabled ? 'Enabled' : 'Disabled'}
                  enabled={speedLimitConfig.soundEnabled}
                  onToggle={handleSoundToggle}
                />

                <ToggleSetting
                  icon="vibrate"
                  label="Vibration Alert"
                  description={speedLimitConfig.vibrationEnabled ? 'Enabled' : 'Disabled'}
                  enabled={speedLimitConfig.vibrationEnabled}
                  onToggle={handleVibrationToggle}
                />
              </>
            )}
          </div>
        </section>

        {/* Compass Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Compass</h2>
          <div className="space-y-3">
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="compass" size={20} className="text-[var(--color-accent-primary)]" />
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">Compass Status</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">
                      {compassStatus.available ? 'Available' : 'Unavailable'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <ToggleSetting
              icon="compass"
              label="Compass"
              description={compassEnabled ? 'Enabled' : 'Disabled'}
              enabled={compassEnabled}
              onToggle={handleCompassEnabledToggle}
              disabled={!compassStatus.available}
            />

            <ToggleSetting
              icon="compass"
              label="Show on Speedometer"
              description={compassOnSpeedometer ? 'Enabled' : 'Disabled'}
              enabled={compassOnSpeedometer}
              onToggle={handleCompassOnSpeedometerToggle}
              disabled={!compassEnabled || !compassStatus.available}
            />

            <ToggleSetting
              icon="compass"
              label="Show in HUD"
              description={compassOnHud ? 'Enabled' : 'Disabled'}
              enabled={compassOnHud}
              onToggle={handleCompassOnHudToggle}
              disabled={!compassEnabled || !compassStatus.available}
            />
          </div>
        </section>

        {/* HUD / Driving Mode Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">HUD / Driving Mode</h2>
          <div className="space-y-3">
            <ToggleSetting
              icon="car"
              label="HUD Mode"
              description={hudEnabled ? 'Enabled' : 'Disabled'}
              enabled={hudEnabled}
              onToggle={handleHudEnabledToggle}
            />

            <ToggleSetting
              icon="maximize"
              label="Fullscreen"
              description={hudFullscreen ? 'Remembered' : 'Not remembered'}
              enabled={hudFullscreen}
              onToggle={handleHudFullscreenToggle}
            />

            <ToggleSetting
              icon="lightbulb"
              label="Keep Screen Awake"
              description={hudWakeLock ? 'Enabled' : 'Disabled'}
              enabled={hudWakeLock}
              onToggle={handleHudWakeLockToggle}
            />

            <ToggleSetting
              icon="list"
              label="Show Secondary Stats"
              description={hudShowSecondaryStats ? 'Enabled' : 'Disabled'}
              enabled={hudShowSecondaryStats}
              onToggle={handleHudShowSecondaryStatsToggle}
            />
          </div>
        </section>

        {/* Location & GPS Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Location & GPS</h2>
          <div className="space-y-3">
            <Card padding="md">
              <div className="space-y-3">
                <div>
                  <p className="text-[var(--color-text-primary)] font-medium mb-2">GPS Accuracy</p>
                  <div className="flex space-x-2">
                    <GpsAccuracyButton value="balanced" label="Balanced" />
                    <GpsAccuracyButton value="high" label="High" />
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="location" size={20} className="text-[var(--color-accent-primary)]" />
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">GPS Capability</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">
                      {'geolocation' in navigator ? 'Available' : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* App Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">App</h2>
          <div className="space-y-3">
            {isInstallable && !isInstalled && (
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon name="download" size={20} className="text-[var(--color-accent-primary)]" />
                    <div>
                      <p className="text-[var(--color-text-primary)] font-medium">Install Speedometer</p>
                      <p className="text-[var(--color-text-secondary)] text-sm">Use Speedometer like an app</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleInstallApp}
                    aria-label="Install Speedometer"
                  >
                    Install
                  </Button>
                </div>
              </Card>
            )}

            {isInstalled && (
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon name="check" size={20} className="text-[var(--color-accent-success)]" />
                    <div>
                      <p className="text-[var(--color-text-primary)] font-medium">Installed</p>
                      <p className="text-[var(--color-text-secondary)] text-sm">Speedometer is installed on this device</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {!isInstallable && !isInstalled && (
              <Card padding="md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Icon name="info" size={20} className="text-[var(--color-accent-primary)]" />
                    <div>
                      <p className="text-[var(--color-text-primary)] font-medium">Install</p>
                      <p className="text-[var(--color-text-secondary)] text-sm">
                        Use browser menu or "Add to Home Screen" on iOS
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="wifi" size={20} className={isOnline ? "text-[var(--color-accent-success)]" : "text-[var(--color-accent-warning)]"} />
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">Connection</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">{isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="tag" size={20} className="text-[var(--color-accent-primary)]" />
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">Version</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">{APP_VERSION}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Data & Privacy Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">Data & Privacy</h2>
          <div className="space-y-3">
            <Card padding="md">
              <div className="space-y-2">
                <p className="text-[var(--color-text-primary)] font-medium">Privacy Information</p>
                <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
                  <li>• Trip history stored locally in browser</li>
                  <li>• No account required</li>
                  <li>• No cloud sync</li>
                  <li>• No advertising tracking</li>
                  <li>• No analytics tracking</li>
                </ul>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="download" size={20} className="text-[var(--color-accent-primary)]" />
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">Export All Trip Data</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">
                      {tripCount} trip{tripCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExportAllData}
                  disabled={tripCount === 0 || exporting}
                  isLoading={exporting}
                >
                  Export
                </Button>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="trash" size={20} className="text-[var(--color-accent-error)]" />
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">Clear All Trip History</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">
                      {tripCount} trip{tripCount !== 1 ? 's' : ''} saved
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowClearDialog(true)}
                  disabled={tripCount === 0}
                >
                  Clear
                </Button>
              </div>
            </Card>

            <Card padding="md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Icon name="refresh" size={20} className="text-[var(--color-accent-warning)]" />
                  <div>
                    <p className="text-[var(--color-text-primary)] font-medium">Reset All Settings</p>
                    <p className="text-[var(--color-text-secondary)] text-sm">Restore default preferences</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowResetDialog(true)}
                >
                  Reset
                </Button>
              </div>
            </Card>
          </div>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-3">About</h2>
          <div className="space-y-3">
            <Card padding="md">
              <div className="space-y-2">
                <p className="text-[var(--color-text-primary)] font-medium">Speedometer</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Browser-based GPS speedometer and driving utility
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Version {APP_VERSION}
                </p>
              </div>
            </Card>

            <Card padding="md">
              <div className="space-y-2">
                <p className="text-[var(--color-text-primary)] font-medium">Browser Support</p>
                <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
                  <li>• GPS depends on browser/device permissions and hardware</li>
                  <li>• Compass depends on device/browser sensor support</li>
                  <li>• Fullscreen and Wake Lock depend on browser support</li>
                  <li>• iOS Safari has additional sensor/permission restrictions</li>
                  <li>• Background tracking is limited compared to native apps</li>
                </ul>
              </div>
            </Card>
          </div>
        </section>
      </div>

      {/* Clear History Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Clear all trip history?
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              This will permanently delete all saved trips from this device. This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowClearDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleClearHistory}
                isLoading={clearing}
              >
                Clear History
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Reset Settings Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Reset all settings?
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              This will restore all settings to their default values. Your trip history will not be affected.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowResetDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleResetSettings}
                isLoading={resetting}
              >
                Reset
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
