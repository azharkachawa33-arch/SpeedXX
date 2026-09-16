import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { useCompass } from '../../hooks/useCompass';
import { useSpeedLimit } from '../../hooks/useSpeedLimit';
import { useFullscreen } from '../../hooks/useFullscreen';
import { useWakeLock } from '../../hooks/useWakeLock';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { formatSpeed } from '../../utils/speedConversion';

export const HudView: React.FC = () => {
  const navigate = useNavigate();
  const {
    state: tripState,
    getCurrentSpeed,
    getFormattedSpeed,
    getFormattedDistance,
    getFormattedAverageSpeed,
    getFormattedMaxSpeed,
    formatDuration,
    getGpsStatus,
    pauseTrip,
    resumeTrip,
    stopTrip,
    statistics,
    speedUnit,
  } = useTracking();

  const {
    heading,
    cardinalDirection,
    formattedHeading,
    directionArrow,
    status: compassStatus,
  } = useCompass();

  const {
    config: speedLimitConfig,
    state: speedLimitState,
    evaluateSpeed,
    initializeAudio,
    getFormattedLimit,
    getWarningLevelText,
    setMonitoringActive,
  } = useSpeedLimit();

  const { isFullscreen, isSupported: fullscreenSupported, toggleFullscreen } = useFullscreen();
  const { isLocked: wakeLockLocked, isSupported: wakeLockSupported, requestWakeLock, releaseWakeLock } = useWakeLock();

  const [showStopDialog, setShowStopDialog] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPortrait, setIsPortrait] = useState(true);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  // Request wake lock when trip is running
  useEffect(() => {
    if (tripState === 'running' && wakeLockSupported) {
      requestWakeLock();
    } else if (tripState !== 'running' && wakeLockLocked) {
      releaseWakeLock();
    }
  }, [tripState, wakeLockSupported, wakeLockLocked, requestWakeLock, releaseWakeLock]);

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleUserInteraction = () => {
      initializeAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [initializeAudio]);

  // Evaluate speed limit
  useEffect(() => {
    if (tripState === 'running') {
      const currentSpeedMps = getCurrentSpeed();
      evaluateSpeed(currentSpeedMps);
    }
  }, [tripState, getCurrentSpeed, evaluateSpeed]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setControlsVisible(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

  const handleScreenTap = useCallback(() => {
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  const handlePause = useCallback(async () => {
    try {
      await pauseTrip();
      setMonitoringActive(false);
    } catch (error) {
      // Pause failed silently
    }
  }, [pauseTrip, setMonitoringActive]);

  const handleResume = useCallback(async () => {
    try {
      await resumeTrip();
      setMonitoringActive(true);
    } catch (error) {
      // Resume failed silently
    }
  }, [resumeTrip, setMonitoringActive]);

  const handleStop = useCallback(() => {
    setShowStopDialog(true);
  }, []);

  const confirmStop = useCallback(() => {
    stopTrip();
    setMonitoringActive(false);
    releaseWakeLock();
    setShowStopDialog(false);
    navigate('/');
  }, [stopTrip, setMonitoringActive, releaseWakeLock, navigate]);

  const cancelStop = useCallback(() => {
    setShowStopDialog(false);
  }, []);

  const handleExitHud = useCallback(() => {
    releaseWakeLock();
    if (isFullscreen) {
      toggleFullscreen();
    }
    navigate('/');
  }, [releaseWakeLock, isFullscreen, toggleFullscreen, navigate]);

  const handleToggleFullscreen = useCallback(() => {
    toggleFullscreen();
  }, [toggleFullscreen]);

  const gpsStatus = getGpsStatus();
  const currentSpeed = getCurrentSpeed();
  const duration = statistics?.duration || 0;

  // Handle case where trip hasn't started
  const displayStats = tripState !== 'idle' && statistics;

  // Get warning color class
  const getWarningColorClass = () => {
    switch (speedLimitState.warningLevel) {
      case 'exceeded':
        return 'text-[var(--color-accent-error)]';
      case 'approaching':
        return 'text-[var(--color-accent-warning)]';
      default:
        return 'text-[var(--color-text-primary)]';
    }
  };

  const getWarningBgClass = () => {
    switch (speedLimitState.warningLevel) {
      case 'exceeded':
        return 'bg-[var(--color-background-error)]';
      case 'approaching':
        return 'bg-[var(--color-background-warning)]';
      default:
        return 'bg-[var(--color-background-primary)]';
    }
  };

  return (
    <div
      className={`min-h-screen ${getWarningBgClass()} transition-colors duration-300`}
      onClick={handleScreenTap}
      onTouchStart={handleScreenTap}
    >
      {/* Stop Confirmation Dialog */}
      {showStopDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-background-secondary)] rounded-2xl p-6 max-w-sm w-full border border-[var(--color-border-primary)]">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
              End this trip?
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              This will stop GPS tracking and save your trip.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={cancelStop}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={confirmStop}
              >
                End Trip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Portrait Layout */}
      {isPortrait ? (
        <div className="flex flex-col h-screen safe-area-top safe-area-bottom">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                gpsStatus.state === 'active' ? 'bg-[var(--color-accent-success)]' :
                gpsStatus.state === 'searching' ? 'bg-[var(--color-accent-warning)] animate-pulse' :
                'bg-[var(--color-accent-error)]'
              }`} />
              <span className="text-sm text-[var(--color-text-secondary)]">
                {gpsStatus.state === 'active' ? 'GPS ACTIVE' :
                 gpsStatus.state === 'searching' ? 'GPS SEARCHING' :
                 gpsStatus.state === 'weak' ? 'WEAK GPS' :
                 gpsStatus.state === 'permission_required' ? 'LOCATION REQUIRED' :
                 'GPS UNAVAILABLE'}
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExitHud}
              aria-label="Exit HUD"
            >
              <Icon name="x" size={16} />
            </Button>
          </div>

          {/* Center - Speed Display */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center">
              <div className={`text-8xl sm:text-9xl font-bold ${getWarningColorClass()} transition-colors duration-300`}>
                {formatSpeed(currentSpeed, speedUnit, 0)}
              </div>
              <div className="text-2xl sm:text-3xl text-[var(--color-text-secondary)] mt-2">
                {speedUnit}
              </div>
            </div>

            {/* Speed Limit */}
            {speedLimitConfig.enabled && (
              <div className="mt-6 text-center">
                {speedLimitState.warningLevel === 'exceeded' ? (
                  <div className="text-[var(--color-accent-error)] font-bold text-lg animate-pulse">
                    SPEED LIMIT EXCEEDED
                  </div>
                ) : (
                  <div className="text-[var(--color-text-secondary)] text-lg">
                    LIMIT {getFormattedLimit()}
                  </div>
                )}
              </div>
            )}

            {/* Direction */}
            <div className="mt-4 text-center">
              <div className="text-3xl sm:text-4xl font-bold text-[var(--color-text-primary)]">
                {directionArrow} {cardinalDirection}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                {formattedHeading}
              </div>
            </div>
          </div>

          {/* Bottom - Stats & Controls */}
          <div className="px-4 pb-4 space-y-4">
            {/* Stats Grid */}
            {displayStats && (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--color-text-secondary)]">Distance</div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {getFormattedDistance()}
                  </div>
                </div>
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--color-text-secondary)]">Duration</div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {formatDuration(duration)}
                  </div>
                </div>
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--color-text-secondary)]">Avg Speed</div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {getFormattedAverageSpeed()}
                  </div>
                </div>
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3 text-center">
                  <div className="text-xs text-[var(--color-text-secondary)]">Max Speed</div>
                  <div className="text-lg font-bold text-[var(--color-text-primary)]">
                    {getFormattedMaxSpeed()}
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className={`flex space-x-3 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
              {tripState === 'running' ? (
                <>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handlePause}
                    aria-label="Pause trip"
                  >
                    <Icon name="pause" size={20} className="mr-2" />
                    Pause
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleStop}
                    aria-label="Stop trip"
                  >
                    <Icon name="stop" size={20} className="mr-2" />
                    Stop
                  </Button>
                </>
              ) : tripState === 'paused' ? (
                <>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleResume}
                    aria-label="Resume trip"
                  >
                    <Icon name="play" size={20} className="mr-2" />
                    Resume
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleStop}
                    aria-label="Stop trip"
                  >
                    <Icon name="stop" size={20} className="mr-2" />
                    Stop
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleExitHud}
                  aria-label="Exit HUD"
                >
                  <Icon name="x" size={20} className="mr-2" />
                  Exit HUD
                </Button>
              )}
            </div>

            {/* Fullscreen Toggle */}
            {fullscreenSupported && (
              <div className={`flex justify-center transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={16} className="mr-2" />
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Landscape Layout */
        <div className="flex flex-col h-screen safe-area-top safe-area-bottom">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                gpsStatus.state === 'active' ? 'bg-[var(--color-accent-success)]' :
                gpsStatus.state === 'searching' ? 'bg-[var(--color-accent-warning)] animate-pulse' :
                'bg-[var(--color-accent-error)]'
              }`} />
              <span className="text-sm text-[var(--color-text-secondary)]">
                {gpsStatus.state === 'active' ? 'GPS ACTIVE' :
                 gpsStatus.state === 'searching' ? 'GPS SEARCHING' :
                 gpsStatus.state === 'weak' ? 'WEAK GPS' :
                 gpsStatus.state === 'permission_required' ? 'LOCATION REQUIRED' :
                 'GPS UNAVAILABLE'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {fullscreenSupported && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  <Icon name={isFullscreen ? 'minimize' : 'maximize'} size={16} />
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={handleExitHud}
                aria-label="Exit HUD"
              >
                <Icon name="x" size={16} />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex px-4 pb-4 space-x-4">
            {/* Left - Speed Display */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className={`text-7xl sm:text-8xl font-bold ${getWarningColorClass()} transition-colors duration-300`}>
                  {formatSpeed(currentSpeed, speedUnit, 0)}
                </div>
                <div className="text-xl sm:text-2xl text-[var(--color-text-secondary)] mt-2">
                  {speedUnit}
                </div>
              </div>

              {/* Speed Limit */}
              {speedLimitConfig.enabled && (
                <div className="mt-4 text-center">
                  {speedLimitState.warningLevel === 'exceeded' ? (
                    <div className="text-[var(--color-accent-error)] font-bold text-base animate-pulse">
                      SPEED LIMIT EXCEEDED
                    </div>
                  ) : (
                    <div className="text-[var(--color-text-secondary)] text-base">
                      LIMIT {getFormattedLimit()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Center - Direction */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-[var(--color-text-primary)]">
                  {directionArrow} {cardinalDirection}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)] mt-2">
                  {formattedHeading}
                </div>
              </div>
            </div>

            {/* Right - Stats */}
            {displayStats && (
              <div className="flex-1 flex flex-col justify-center space-y-2">
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--color-text-secondary)]">Distance</div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {getFormattedDistance()}
                  </div>
                </div>
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--color-text-secondary)]">Duration</div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {formatDuration(duration)}
                  </div>
                </div>
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--color-text-secondary)]">Avg Speed</div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {getFormattedAverageSpeed()}
                  </div>
                </div>
                <div className="bg-[var(--color-background-tertiary)] rounded-lg p-3">
                  <div className="text-xs text-[var(--color-text-secondary)]">Max Speed</div>
                  <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                    {getFormattedMaxSpeed()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom - Controls */}
          <div className={`px-4 pb-4 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex space-x-3">
              {tripState === 'running' ? (
                <>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={handlePause}
                    aria-label="Pause trip"
                  >
                    <Icon name="pause" size={20} className="mr-2" />
                    Pause
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleStop}
                    aria-label="Stop trip"
                  >
                    <Icon name="stop" size={20} className="mr-2" />
                    Stop
                  </Button>
                </>
              ) : tripState === 'paused' ? (
                <>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleResume}
                    aria-label="Resume trip"
                  >
                    <Icon name="play" size={20} className="mr-2" />
                    Resume
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleStop}
                    aria-label="Stop trip"
                  >
                    <Icon name="stop" size={20} className="mr-2" />
                    Stop
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleExitHud}
                  aria-label="Exit HUD"
                >
                  <Icon name="x" size={20} className="mr-2" />
                  Exit HUD
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
