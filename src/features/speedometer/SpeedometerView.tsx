import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeedometerDisplay } from '../../components/dashboard/SpeedometerDisplay';
import { StatisticsCard } from '../../components/dashboard/StatisticsCard';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Card } from '../../components/ui/Card';
import { useTracking } from '../../hooks/useTracking';
import { useCompass } from '../../hooks/useCompass';
import { useSpeedLimit } from '../../hooks/useSpeedLimit';
import { useNotifications } from '../../components/common/NotificationSystem';
import { MapController } from '../../services/map';

export const SpeedometerView: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  
  const {
    state: tripState,
    currentPosition,
    statistics,
    error,
    gpsAvailable,
    speedUnit,
    startTrip,
    pauseTrip,
    resumeTrip,
    stopTrip,
    resetTrip,
    retryTrip,
    getFormattedSpeed,
    getFormattedAverageSpeed,
    getFormattedMaxSpeed,
    getFormattedDistance,
    formatDuration,
    getGpsStatus,
    route,
  } = useTracking();

  const {
    heading,
    cardinalDirection,
    formattedHeading,
    directionArrow,
    source,
    status: compassStatus,
    updateGpsHeading,
  } = useCompass();

  const {
    config: speedLimitConfig,
    state: speedLimitState,
    evaluateSpeed,
    initializeAudio,
    getFormattedLimit,
    getFormattedCurrentSpeed,
    getWarningLevelText,
    setMonitoringActive,
  } = useSpeedLimit();

  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<MapController | null>(null);

  const gpsStatus = getGpsStatus();

  // Add debug log helper
  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Handle errors
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error,
        autoHide: false,
      });
    }
  }, [error, addNotification]);

  // Handle trip completion
  useEffect(() => {
    if (tripState === 'completed') {
      addNotification({
        type: 'success',
        message: 'Trip completed successfully!',
        autoHide: true,
      });
      
      // Navigate to trips screen after short delay
      setTimeout(() => {
        navigate('/trips');
      }, 2000);
    }
  }, [tripState, addNotification, navigate]);

  const handleStartTrip = async () => {
    addDebugLog('Starting trip request...');
    addDebugLog('GPS available: ' + gpsAvailable);
    
    // Initialize audio context for speed limit alerts (user gesture)
    if (speedLimitConfig.enabled && speedLimitConfig.soundEnabled) {
      initializeAudio();
    }
    
    setIsStarting(true);
    try {
      addDebugLog('Calling startTrip...');
      await startTrip();
      addDebugLog('Trip started successfully');
    } catch (error) {
      let errorMessage = 'Failed to start trip';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // Handle GpsError object specifically
        if ('message' in error) {
          errorMessage = String(error.message);
        } else if ('type' in error) {
          errorMessage = String(error.type);
        } else {
          errorMessage = 'Unknown error occurred. Please try again.';
        }
      } else {
        errorMessage = 'Unknown error occurred. Please try again.';
      }
      
      addDebugLog('Failed to start trip: ' + errorMessage);
      console.error('Failed to start trip:', error);
      addNotification({
        type: 'error',
        message: errorMessage,
        autoHide: false,
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseTrip = () => {
    try {
      pauseTrip();
      addDebugLog('Trip paused');
      setMonitoringActive(false); // Stop speed limit monitoring on pause
    } catch (error) {
      console.error('Failed to pause trip:', error);
      addDebugLog('Failed to pause trip: ' + error);
    }
  };

  const handleResumeTrip = async () => {
    setIsStarting(true);
    try {
      await resumeTrip();
      addDebugLog('Trip resumed');
      setMonitoringActive(true); // Resume speed limit monitoring
    } catch (error) {
      console.error('Failed to resume trip:', error);
      addDebugLog('Failed to resume trip: ' + error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopTrip = () => {
    setIsStopping(true);
    try {
      stopTrip();
      addDebugLog('Trip stopped');
      setMonitoringActive(false); // Stop speed limit monitoring on stop
    } catch (error) {
      console.error('Failed to stop trip:', error);
      addDebugLog('Failed to stop trip: ' + error);
    } finally {
      setIsStopping(false);
    }
  };

  const handleRetry = async () => {
    setIsStarting(true);
    try {
      await retryTrip();
      addDebugLog('Retrying trip start...');
    } catch (error) {
      console.error('Failed to retry trip:', error);
      addDebugLog('Failed to retry trip: ' + error);
    } finally {
      setIsStarting(false);
    }
  };

  const getButtonLabel = () => {
    if (isStarting) return 'STARTING...';
    if (tripState === 'idle') return 'START TRIP';
    if (tripState === 'starting') return 'SEARCHING...';
    if (tripState === 'running') return 'PAUSE';
    if (tripState === 'paused') return 'RESUME';
    if (tripState === 'stopping') return 'STOPPING...';
    return 'START TRIP';
  };

  const getButtonIcon = () => {
    if (tripState === 'idle' || tripState === 'paused') return 'play';
    if (tripState === 'running') return 'pause';
    return 'play';
  };

  const getButtonVariant = () => {
    if (tripState === 'running') return 'secondary';
    return 'primary';
  };

  const getGpsStatusText = () => {
    switch (gpsStatus.state) {
      case 'ready':
        return 'GPS Ready';
      case 'searching':
        return 'Searching for GPS...';
      case 'active':
        return 'GPS Active';
      case 'weak':
        return 'Weak GPS Signal';
      case 'permission_required':
        return 'Location Permission Required';
      case 'unavailable':
        return 'GPS Unavailable';
      default:
        return 'GPS Ready';
    }
  };

  const getGpsStatusColor = () => {
    switch (gpsStatus.state) {
      case 'ready':
        return 'bg-[var(--color-accent-success)]';
      case 'searching':
        return 'bg-[var(--color-accent-warning)] animate-pulse';
      case 'active':
        return 'bg-[var(--color-accent-success)]';
      case 'weak':
        return 'bg-[var(--color-accent-warning)]';
      case 'permission_required':
        return 'bg-[var(--color-accent-error)]';
      case 'unavailable':
        return 'bg-[var(--color-accent-error)]';
      default:
        return 'bg-[var(--color-accent-success)]';
    }
  };

  // Initialize map preview
  useEffect(() => {
    if (!showMapPreview || !mapContainerRef.current) return;

    try {
      const controller = new MapController();
      mapControllerRef.current = controller;
      
      controller.initialize(mapContainerRef.current);
      
      setTimeout(() => {
        if (controller.isLoaded()) {
          setMapLoaded(true);
          
          // Update current position
          if (currentPosition) {
            controller.updateCurrentPosition(currentPosition);
          }
          
          // Update route if trip is running
          if (route.length >= 2 && tripState === 'running') {
            const routePoints = route.map(point => ({
              latitude: point.latitude,
              longitude: point.longitude,
              timestamp: point.timestamp,
              accuracy: point.accuracy,
            }));
            controller.updateRoute(routePoints);
          }
        }
      }, 100);

      return () => {
        controller.destroy();
      };
    } catch (error) {
      console.error('Failed to initialize map preview:', error);
    }
  }, [showMapPreview, currentPosition, route, tripState]);

  // Update map preview during trip
  useEffect(() => {
    if (mapControllerRef.current && currentPosition) {
      const useHeading = source === 'device' ? heading : (currentPosition.heading || undefined);
      mapControllerRef.current.updateCurrentPosition(currentPosition, useHeading);
    }
  }, [currentPosition, heading, source]);

  // Update compass with GPS heading
  useEffect(() => {
    if (currentPosition && currentPosition.heading !== null) {
      updateGpsHeading(currentPosition.heading, currentPosition.speed);
    }
  }, [currentPosition, updateGpsHeading]);

  // Evaluate speed limit
  useEffect(() => {
    if (currentPosition && currentPosition.speed !== null && tripState === 'running') {
      evaluateSpeed(currentPosition.speed);
    }
  }, [currentPosition, tripState, evaluateSpeed]);

  useEffect(() => {
    if (mapControllerRef.current && route.length >= 2 && tripState === 'running') {
      const routePoints = route.map(point => ({
        latitude: point.latitude,
        longitude: point.longitude,
        timestamp: point.timestamp,
        accuracy: point.accuracy,
      }));
      mapControllerRef.current.updateRoute(routePoints);
    }
  }, [route, tripState]);

  const currentSpeed = tripState === 'idle' ? 0 : parseFloat(getFormattedSpeed().split(' ')[0]);
  const maxSpeed = 200; // For speedometer visualization

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
      {/* Header */}
      <header className="px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)]">SpeedX</h1>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* GPS Status */}
          <div className="hidden sm:flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${getGpsStatusColor()}`} />
            <span className="text-xs text-[var(--color-text-secondary)]">{getGpsStatusText()}</span>
          </div>
          
          {/* Accuracy */}
          {currentPosition && (
            <div className="hidden sm:flex items-center space-x-1 text-[var(--color-text-secondary)]">
              <span className="text-xs">Accuracy ±{Math.round(currentPosition.accuracy)}m</span>
            </div>
          )}
          
          {/* Direction Indicator */}
          {compassStatus.active && (
            <div className="hidden sm:flex items-center space-x-1 text-[var(--color-text-secondary)]">
              <span className="text-xs">{directionArrow}</span>
              <span className="text-xs">{cardinalDirection}</span>
              <span className="text-xs">{formattedHeading}</span>
            </div>
          )}
          
          {/* Settings Button */}
          <button
            className="p-2 rounded-lg hover:bg-[var(--color-background-tertiary)] transition-colors"
            aria-label="Settings"
            onClick={() => navigate('/settings')}
          >
            <Icon name="settings" size={20} />
          </button>
          
          {/* Map Toggle Button */}
          <button
            className="p-2 rounded-lg hover:bg-[var(--color-background-tertiary)] transition-colors"
            aria-label="Toggle Map"
            onClick={() => setShowMapPreview(!showMapPreview)}
          >
            <Icon name="location" size={20} />
          </button>
          
          {/* HUD Mode Button */}
          <button
            className="p-2 rounded-lg hover:bg-[var(--color-background-tertiary)] transition-colors"
            aria-label="HUD Mode"
            onClick={() => navigate('/hud')}
          >
            <Icon name="maximize" size={20} />
          </button>
        </div>
      </header>

      {/* Map Preview */}
      {showMapPreview && (
        <div className="px-4 py-2">
          <Card padding="none">
            <div className="relative h-48">
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-secondary)]">
                  <div className="text-[var(--color-text-secondary)]">Loading map...</div>
                </div>
              )}
              <div
                ref={mapContainerRef}
                className="w-full h-full"
                style={{ display: mapLoaded ? 'block' : 'none' }}
              />
            </div>
            <div className="p-2 flex justify-between items-center">
              <span className="text-xs text-[var(--color-text-secondary)]">Live Map</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate('/map')}
              >
                <Icon name="expand" size={16} />
                Open Map
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Error State */}
      {tripState === 'error' && (
        <div className="px-4 py-6">
          <Card padding="md" className="border-[var(--color-accent-error)]">
            <div className="flex items-start space-x-3">
              <Icon name="alert" size={24} className="text-[var(--color-accent-error)] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[var(--color-text-primary)] font-medium mb-2">GPS Error</p>
                <p className="text-[var(--color-text-secondary)] text-sm mb-3">{error}</p>
                <Button onClick={handleRetry} size="sm" isLoading={isStarting}>
                  Retry
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Debug Logs (for Safari debugging) */}
      {debugLogs.length > 0 && (
        <div className="px-4 py-4">
          <Card padding="sm" className="border-[var(--color-border-primary)] bg-[var(--color-background-secondary)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-2 font-medium">Debug Logs:</p>
            <div className="space-y-1">
              {debugLogs.map((log, index) => (
                <p key={index} className="text-xs text-[var(--color-text-tertiary)] font-mono">
                  {log}
                </p>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="px-3 sm:px-4 py-4 sm:py-6 max-w-4xl mx-auto">
        {/* Speedometer Display */}
        <div className="mb-6 sm:mb-8">
          <SpeedometerDisplay
            speed={currentSpeed}
            unit={speedUnit}
            maxSpeed={maxSpeed}
          />
        </div>

        {/* Speed Limit Warning */}
        {speedLimitConfig.enabled && speedLimitState.isActive && (
          <Card 
            padding="md" 
            className={`mb-6 sm:mb-8 ${
              speedLimitState.warningLevel === 'exceeded' 
                ? 'border-[var(--color-accent-error)] bg-[var(--color-background-error)]' 
                : speedLimitState.warningLevel === 'approaching'
                ? 'border-[var(--color-accent-warning)]'
                : 'border-[var(--color-border-primary)]'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Icon 
                name="alert" 
                size={24} 
                className={
                  speedLimitState.warningLevel === 'exceeded'
                    ? 'text-[var(--color-accent-error)]'
                    : speedLimitState.warningLevel === 'approaching'
                    ? 'text-[var(--color-accent-warning)]'
                    : 'text-[var(--color-accent-success)]'
                } 
              />
              <div className="flex-1">
                <p className="text-[var(--color-text-primary)] font-semibold">
                  {getWarningLevelText()}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {getFormattedCurrentSpeed()} • Limit {getFormattedLimit()}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Speed Limit Indicator (Normal State) */}
        {speedLimitConfig.enabled && !speedLimitState.isActive && (
          <Card padding="sm" className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Icon name="gauge" size={16} className="text-[var(--color-accent-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Limit</span>
              </div>
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                {getFormattedLimit()}
              </span>
            </div>
          </Card>
        )}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatisticsCard
            label="AVG SPEED"
            value={getFormattedAverageSpeed().split(' ')[0]}
            unit={speedUnit}
          />
          <StatisticsCard
            label="MAX SPEED"
            value={getFormattedMaxSpeed().split(' ')[0]}
            unit={speedUnit}
          />
          <StatisticsCard
            label="DISTANCE"
            value={getFormattedDistance().split(' ')[0]}
            unit={speedUnit === 'km/h' ? 'km' : 'mi'}
          />
          <StatisticsCard
            label="TRIP TIME"
            value={formatDuration(statistics.duration)}
          />
        </div>

        {/* Trip Controls */}
        <div className="flex flex-col items-center space-y-3 sm:space-y-4">
          <Button
            onClick={tripState === 'idle' || tripState === 'paused' ? (tripState === 'idle' ? handleStartTrip : handleResumeTrip) : handlePauseTrip}
            size="lg"
            variant={getButtonVariant()}
            className="w-full max-w-xs"
            disabled={tripState === 'starting' || tripState === 'stopping' || tripState === 'completed'}
            isLoading={isStarting}
          >
            <div className="flex items-center space-x-2">
              <Icon name={getButtonIcon()} size={20} />
              <span>{getButtonLabel()}</span>
            </div>
          </Button>
          
          {tripState !== 'idle' && tripState !== 'completed' && (
            <Button
              onClick={handleStopTrip}
              size="md"
              variant="danger"
              className="w-full max-w-xs"
              disabled={tripState === 'stopping'}
              isLoading={isStopping}
            >
              <div className="flex items-center space-x-2">
                <Icon name="stop" size={20} />
                <span>STOP TRIP</span>
              </div>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};