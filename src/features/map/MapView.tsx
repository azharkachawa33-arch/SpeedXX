import React, { useEffect, useRef, useState } from 'react';
import { MapController } from '../../services/map';
import { useTracking } from '../../hooks/useTracking';
import { useCompass } from '../../hooks/useCompass';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Card } from '../../components/ui/Card';
import { useNotifications } from '../../components/common/NotificationSystem';

export const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<MapController | null>(null);
  const [isFollowing, setIsFollowing] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const { addNotification } = useNotifications();
  
  const {
    state: tripState,
    currentPosition,
    route,
  } = useTracking();

  const {
    heading,
    source: compassSource,
    status: compassStatus,
  } = useCompass();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      const controller = new MapController();
      mapControllerRef.current = controller;
      
      controller.initialize(mapContainerRef.current);
      
      controller.onFollowChange((following) => {
        setIsFollowing(following);
      });

      // Handle map load event
      const handleLoad = () => {
        setMapLoaded(true);
        setMapError(null);
      };
      controller.on('load', handleLoad);

      // Handle map error event
      const handleError = () => {
        setMapError('Map failed to load. Please check your internet connection.');
        setMapLoaded(false);
      };
      controller.on('error', handleError);

      // Increased timeout for map loading (10 seconds for reliable connection)
      const timeoutId = setTimeout(() => {
        if (!mapLoaded && !mapError) {
          if (controller.isLoaded()) {
            setMapLoaded(true);
          } else {
            setMapError('Map took too long to load. Please check your internet connection and refresh.');
          }
        }
      }, 10000); // 10 seconds for reliable map loading

      return () => {
        clearTimeout(timeoutId);
        // Clean up event listeners
        controller.off('error', handleError);
        controller.off('load', handleLoad);
        // Don't destroy map immediately to prevent flickering
        // Only destroy if navigating away
        controller.destroy();
      };
    } catch (error) {
      setMapError('Map could not be loaded. Please check your internet connection.');
      setMapLoaded(false);
    }
  }, [retryKey]); // Re-initialize when retryKey changes

  // Update current position on map
  useEffect(() => {
    if (mapControllerRef.current && currentPosition) {
      const useHeading = compassSource === 'device' ? heading : (currentPosition.heading || undefined);
      mapControllerRef.current.updateCurrentPosition(currentPosition, useHeading);
    }
  }, [currentPosition, heading, compassSource]);

  // Update route during trip
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

  // Clear route when trip is not running
  useEffect(() => {
    if (mapControllerRef.current && tripState !== 'running') {
      mapControllerRef.current.clearRoute();
    }
  }, [tripState]);

  const handleRecenter = () => {
    if (mapControllerRef.current) {
      mapControllerRef.current.recenter();
    }
  };

  const handleRetry = () => {
    setMapError(null);
    setMapLoaded(false);
    // Force re-initialization by incrementing retryKey
    setRetryKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
      <header className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Map</h1>
        {!isFollowing && (
          <Button
            size="sm"
            variant="primary"
            onClick={handleRecenter}
          >
            <Icon name="location" size={16} />
            Recenter
          </Button>
        )}
      </header>

      <div className="relative h-[calc(100vh-64px)]">
        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-primary)]">
            <div className="text-[var(--color-text-secondary)]">Loading map...</div>
          </div>
        )}
        
        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-primary)] p-4">
            <Card padding="md" className="border-[var(--color-accent-error)] max-w-sm w-full">
              <div className="flex items-start space-x-3">
                <Icon name="alert" size={24} className="text-[var(--color-accent-error)] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[var(--color-text-primary)] font-medium mb-2">Map Error</p>
                  <p className="text-[var(--color-text-secondary)] text-sm mb-3">
                    {mapError}
                  </p>
                  <Button onClick={handleRetry} size="sm">
                    Retry
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {!currentPosition && !mapError && mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-primary)] p-4">
            <Card padding="md" className="max-w-sm w-full">
              <div className="flex items-start space-x-3">
                <Icon name="location" size={24} className="text-[var(--color-accent-warning)] flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[var(--color-text-primary)] font-medium mb-2">Waiting for location...</p>
                  <p className="text-[var(--color-text-secondary)] text-sm">
                    Start a trip to see your position on the map.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ display: mapLoaded && !mapError ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
};