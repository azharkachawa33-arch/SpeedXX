import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { getTripStorage } from '../../services/storage';
import { MapController } from '../../services/map';
import { SpeedTimelineChart } from '../../components/charts/SpeedTimelineChart';
import { SpeedDistributionChart } from '../../components/charts/SpeedDistributionChart';
import type { Trip } from '../../models/types';
import { getTripSummary, formatTripDateTime } from '../../utils/dataFormatting';
import { calculateAdvancedStatistics, formatDuration, formatSpeed, formatElevation, exportTripAsJSON, exportTripAsCSV, createTripShareText } from '../../utils/tripAnalytics';
import { useNotifications } from '../../components/common/NotificationSystem';

export const TripDetailsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [advancedStats, setAdvancedStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<MapController | null>(null);

  useEffect(() => {
    const loadTrip = async () => {
      if (!id) {
        setError('Trip ID not provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const storage = getTripStorage();
        if (!storage.isAvailable()) {
          throw new Error('Trip storage is unavailable');
        }

        const tripData = await storage.getTrip(id);
        if (!tripData) {
          setError('Trip not found');
        } else {
          setTrip(tripData);
          // Calculate advanced statistics only when viewing details
          const stats = calculateAdvancedStatistics(tripData);
          setAdvancedStats(stats);
        }
      } catch (err) {
        setError('Failed to load trip details');
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [id]);

  // Initialize map when trip is loaded
  useEffect(() => {
    if (!trip || !mapContainerRef.current) return;

    try {
      const controller = new MapController();
      mapControllerRef.current = controller;
      
      controller.initialize(mapContainerRef.current);
      
      setTimeout(() => {
        if (controller.isLoaded()) {
          setMapLoaded(true);
          
          // Display trip route
          if (trip.route && trip.route.length >= 2) {
            controller.displayTripRoute(
              trip.route,
              trip.startLocation ? {
                latitude: trip.startLocation.latitude,
                longitude: trip.startLocation.longitude,
                timestamp: trip.startLocation.timestamp,
                accuracy: trip.startLocation.accuracy,
              } : undefined,
              trip.endLocation ? {
                latitude: trip.endLocation.latitude,
                longitude: trip.endLocation.longitude,
                timestamp: trip.endLocation.timestamp,
                accuracy: trip.endLocation.accuracy,
              } : undefined
            );
          }
        }
      }, 100);

      return () => {
        controller.destroy();
      };
    } catch (error) {
      setMapError('Map could not be loaded');
    }
  }, [trip]);

  const handleDelete = async () => {
    if (!id || !trip) return;

    setDeleting(true);
    try {
      const storage = getTripStorage();
      if (!storage.isAvailable()) {
        throw new Error('Trip storage is unavailable');
      }

      await storage.deleteTrip(id);
      addNotification({
        type: 'success',
        message: 'Trip deleted successfully',
        autoHide: true,
      });
      navigate('/history');
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Failed to delete trip',
        autoHide: true,
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExportJSON = () => {
    if (!trip) return;
    
    try {
      const json = exportTripAsJSON(trip);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trip-${trip.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Trip exported as JSON',
        autoHide: true,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to export trip',
        autoHide: true,
      });
    }
  };

  const handleExportCSV = () => {
    if (!trip) return;
    
    try {
      const csv = exportTripAsCSV(trip);
      if (!csv) {
        addNotification({
          type: 'error',
          message: 'No route data to export',
          autoHide: true,
        });
        return;
      }
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trip-${trip.id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        message: 'Trip exported as CSV',
        autoHide: true,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to export trip',
        autoHide: true,
      });
    }
  };

  const handleShare = async () => {
    if (!trip) return;

    try {
      const shareText = createTripShareText(trip);
      
      if (navigator.share) {
        await navigator.share({
          title: 'Speedometer Trip',
          text: shareText,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareText);
        addNotification({
          type: 'success',
          message: 'Trip summary copied to clipboard',
          autoHide: true,
        });
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        addNotification({
          type: 'error',
          message: 'Failed to share trip',
          autoHide: true,
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top flex items-center justify-center">
        <div className="text-[var(--color-text-secondary)]">Loading trip details...</div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
        <header className="px-4 py-4 flex items-center space-x-3">
          <button
            onClick={() => navigate('/history')}
            className="p-2 hover:bg-[var(--color-background-tertiary)] rounded-lg transition-colors"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Trip Details</h1>
        </header>

        <div className="px-4 py-8">
          <Card padding="md" className="border-[var(--color-accent-error)]">
            <div className="flex items-start space-x-3">
              <Icon name="alert" size={24} className="text-[var(--color-accent-error)] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[var(--color-text-primary)] font-medium mb-2">Error</p>
                <p className="text-[var(--color-text-secondary)] text-sm">{error || 'Trip not found'}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const summary = getTripSummary(trip);

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
      <header className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/history')}
            className="p-2 hover:bg-[var(--color-background-tertiary)] rounded-lg transition-colors"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Trip Details</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleShare}
            aria-label="Share trip"
          >
            <Icon name="check" size={16} />
          </Button>
          <div className="relative">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              aria-label="Export trip"
            >
              <Icon name="check" size={16} />
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 bg-[var(--color-background-secondary)] border border-[var(--color-border-primary)] rounded-lg shadow-lg z-10">
                <button
                  onClick={handleExportJSON}
                  className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)]"
                >
                  Export as JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="block w-full px-4 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-background-tertiary)]"
                >
                  Export as CSV
                </button>
              </div>
            )}
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Icon name="trash" size={16} />
            Delete
          </Button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Trip Info */}
        <Card padding="md">
          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-1">
                {trip.name}
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">{summary.dateTime}</p>
            </div>
          </div>
        </Card>

        {/* Statistics */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Duration</p>
              <p className="text-lg font-medium text-[var(--color-text-primary)]">{summary.duration}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Distance</p>
              <p className="text-lg font-medium text-[var(--color-text-primary)]">{summary.distance}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Average Speed</p>
              <p className="text-lg font-medium text-[var(--color-text-primary)]">{summary.avgSpeed}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Maximum Speed</p>
              <p className="text-lg font-medium text-[var(--color-text-primary)]">{summary.maxSpeed}</p>
            </div>
          </div>
        </Card>

        {/* Advanced Statistics */}
        {advancedStats && (
          <Card padding="md">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Advanced Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Moving Time</p>
                <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatDuration(advancedStats.movingTime)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Stopped Time</p>
                <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatDuration(advancedStats.stoppedTime)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Moving Average</p>
                <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatSpeed(advancedStats.movingAverageSpeed, trip.speedUnit)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Minimum Speed</p>
                <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatSpeed(advancedStats.minimumSpeed, trip.speedUnit)}</p>
              </div>
            </div>
            
            {/* Elevation Statistics */}
            {advancedStats.maxElevation !== undefined && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)]">
                <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Elevation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Highest</p>
                    <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatElevation(advancedStats.maxElevation)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Lowest</p>
                    <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatElevation(advancedStats.minElevation)}</p>
                  </div>
                  {advancedStats.elevationGain !== undefined && (
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Elevation Gain</p>
                      <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatElevation(advancedStats.elevationGain)}</p>
                    </div>
                  )}
                  {advancedStats.elevationLoss !== undefined && (
                    <div>
                      <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Elevation Loss</p>
                      <p className="text-lg font-medium text-[var(--color-text-primary)]">{formatElevation(advancedStats.elevationLoss)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Speed Charts */}
        {trip.route && trip.route.length >= 2 && (
          <>
            <SpeedTimelineChart route={trip.route} speedUnit={trip.speedUnit} />
            {advancedStats && advancedStats.speedDistribution.length > 0 && (
              <SpeedDistributionChart distribution={advancedStats.speedDistribution} speedUnit={trip.speedUnit} />
            )}
          </>
        )}

        {/* Location Info */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Location</h3>
          <div className="space-y-3">
            {trip.startLocation && (
              <div>
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">Start Location</p>
                <p className="text-sm text-[var(--color-text-primary)]">
                  {trip.startLocation.latitude.toFixed(6)}, {trip.startLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Accuracy: ±{Math.round(trip.startLocation.accuracy)}m
                </p>
              </div>
            )}
            {trip.endLocation && (
              <div>
                <p className="text-sm text-[var(--color-text-tertiary)] mb-1">End Location</p>
                <p className="text-sm text-[var(--color-text-primary)]">
                  {trip.endLocation.latitude.toFixed(6)}, {trip.endLocation.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Accuracy: ±{Math.round(trip.endLocation.accuracy)}m
                </p>
              </div>
            )}
            {!trip.startLocation && !trip.endLocation && (
              <p className="text-sm text-[var(--color-text-secondary)]">Location data not available</p>
            )}
          </div>
        </Card>

        {/* Route Map */}
        {trip.route && trip.route.length >= 2 ? (
          <Card padding="none">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Route Map</h3>
            </div>
            <div className="relative h-64">
              {!mapLoaded && !mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-secondary)]">
                  <div className="text-[var(--color-text-secondary)]">Loading map...</div>
                </div>
              )}
              
              {mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-background-secondary)] p-4">
                  <div className="text-center">
                    <Icon name="alert" size={24} className="text-[var(--color-accent-error)] mb-2" />
                    <p className="text-sm text-[var(--color-text-secondary)]">Map could not be loaded</p>
                  </div>
                </div>
              )}

              <div
                ref={mapContainerRef}
                className="w-full h-full"
                style={{ display: mapLoaded && !mapError ? 'block' : 'none' }}
              />
            </div>
          </Card>
        ) : trip.route && trip.route.length > 0 ? (
          <Card padding="md">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Route Info</h3>
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {trip.route.length} GPS point recorded
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Route data available but insufficient for map display
              </p>
            </div>
          </Card>
        ) : (
          <Card padding="md">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Route Info</h3>
            <div className="space-y-2">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Route data is not available for this trip.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Delete this trip?
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              This trip will be permanently removed from your history.
            </p>
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={handleDelete}
                isLoading={deleting}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};