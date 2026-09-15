import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useCompass } from '../../hooks/useCompass';
import { useNotifications } from '../../components/common/NotificationSystem';

export const CompassView: React.FC = () => {
  const { addNotification } = useNotifications();
  const {
    heading,
    cardinalDirection,
    fullDirection,
    formattedHeading,
    directionArrow,
    source,
    status,
    requestPermission,
    startCompass,
    stopCompass,
    permissionRequested,
  } = useCompass();

  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const handleEnableCompass = async () => {
    setIsRequestingPermission(true);
    try {
      const permission = await requestPermission();
      if (permission === 'granted') {
        startCompass();
        addNotification({
          type: 'success',
          message: 'Compass enabled successfully',
          autoHide: true,
        });
      } else {
        addNotification({
          type: 'error',
          message: 'Compass permission was denied',
          autoHide: true,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to enable compass',
        autoHide: true,
      });
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const getStatusText = () => {
    if (!status.available) return 'Compass Unavailable';
    if (status.permission === 'denied') return 'Compass Permission Denied';
    if (status.permission === 'prompt') return 'Compass Permission Required';
    if (status.active) return 'Compass Active';
    return 'Compass Inactive';
  };

  const getStatusColor = () => {
    if (!status.available) return 'bg-[var(--color-accent-error)]';
    if (status.permission === 'denied') return 'bg-[var(--color-accent-error)]';
    if (status.permission === 'prompt') return 'bg-[var(--color-accent-warning)]';
    if (status.active) return 'bg-[var(--color-accent-success)]';
    return 'bg-[var(--color-accent-secondary)]';
  };

  const getSourceText = () => {
    if (source === 'device') return 'Device Sensor';
    if (source === 'gps') return 'GPS';
    return 'Unavailable';
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
      <header className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Compass</h1>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs text-[var(--color-text-secondary)]">{getStatusText()}</span>
        </div>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Permission Required State */}
        {status.available && status.permission === 'prompt' && !permissionRequested && (
          <Card padding="md">
            <div className="text-center space-y-4">
              <Icon name="location" size={48} className="text-[var(--color-accent-primary)] mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  Enable Compass
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Allow motion and orientation access to use the live compass.
                </p>
              </div>
              <Button
                onClick={handleEnableCompass}
                size="lg"
                isLoading={isRequestingPermission}
              >
                Enable Compass
              </Button>
            </div>
          </Card>
        )}

        {/* Permission Denied State */}
        {status.permission === 'denied' && (
          <Card padding="md" className="border-[var(--color-accent-error)]">
            <div className="text-center space-y-4">
              <Icon name="alert" size={48} className="text-[var(--color-accent-error)] mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  Compass Permission Denied
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Motion and orientation access was denied. You can enable it in your browser settings.
                </p>
              </div>
              <Button
                onClick={handleEnableCompass}
                size="lg"
                variant="secondary"
                isLoading={isRequestingPermission}
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Unsupported Browser State */}
        {!status.available && (
          <Card padding="md" className="border-[var(--color-accent-error)]">
            <div className="text-center space-y-4">
              <Icon name="alert" size={48} className="text-[var(--color-accent-error)] mx-auto" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  Compass Unavailable
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Compass isn't available on this browser or device.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Active Compass */}
        {status.active && (
          <Card padding="lg">
            <div className="flex flex-col items-center space-y-6">
              {/* Compass Dial */}
              <div className="relative w-64 h-64">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-[var(--color-border-primary)] bg-[var(--color-background-tertiary)]" />
                
                {/* Cardinal directions */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* N */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[var(--color-accent-primary)] font-bold text-lg">N</div>
                    {/* E */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] font-bold text-lg">E</div>
                    {/* S */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[var(--color-text-secondary)] font-bold text-lg">S</div>
                    {/* W */}
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] font-bold text-lg">W</div>
                    
                    {/* Intermediate directions */}
                    <div className="absolute top-8 right-8 text-[var(--color-text-tertiary)] text-sm">NE</div>
                    <div className="absolute bottom-8 right-8 text-[var(--color-text-tertiary)] text-sm">SE</div>
                    <div className="absolute bottom-8 left-8 text-[var(--color-text-tertiary)] text-sm">SW</div>
                    <div className="absolute top-8 left-8 text-[var(--color-text-tertiary)] text-sm">NW</div>
                  </div>
                </div>

                {/* Needle */}
                <div 
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${heading}deg)` }}
                >
                  <div className="relative w-1 h-32">
                    {/* North needle */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[32px] border-b-[var(--color-accent-primary)]" />
                    {/* South needle */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[32px] border-t-[var(--color-text-secondary)]" />
                    {/* Center dot */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--color-text-primary)]" />
                  </div>
                </div>
              </div>

              {/* Heading Display */}
              <div className="text-center space-y-2">
                <div className="text-5xl font-bold text-[var(--color-text-primary)]">
                  {formattedHeading}
                </div>
                <div className="text-2xl font-semibold text-[var(--color-accent-primary)]">
                  {fullDirection}
                </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-[var(--color-text-secondary)]">
                  <span>{directionArrow}</span>
                  <span>{cardinalDirection}</span>
                </div>
              </div>

              {/* Source Indicator */}
              <div className="flex items-center space-x-2 text-sm text-[var(--color-text-tertiary)]">
                <Icon name="gauge" size={16} />
                <span>Source: {getSourceText()}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Calibration Guidance */}
        {status.active && status.calibrationNeeded && (
          <Card padding="md" className="border-[var(--color-accent-warning)]">
            <div className="flex items-start space-x-3">
              <Icon name="alert" size={24} className="text-[var(--color-accent-warning)] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[var(--color-text-primary)] font-medium mb-1">Calibration Needed</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Move your phone slowly in a figure-eight motion to improve compass calibration.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Disable Compass Button */}
        {status.active && (
          <Button
            onClick={stopCompass}
            variant="secondary"
            className="w-full"
          >
            Disable Compass
          </Button>
        )}
      </div>
    </div>
  );
};