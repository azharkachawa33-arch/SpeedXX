import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { useTripHistory } from '../../hooks/useTripHistory';
import { getTripSummary } from '../../utils/dataFormatting';
import { useNotifications } from '../../components/common/NotificationSystem';

export const HistoryView: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const { trips, loading, error, storageAvailable, deleteTrip, clearAllTrips } = useTripHistory();
  const [selectedTrip, setSelectedTrip] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const handleTripClick = (tripId: string) => {
    setSelectedTrip(tripId);
    // For now, just navigate to trip details
    navigate(`/trip/${tripId}`);
  };

  const handleDeleteTrip = async (tripId: string) => {
    setDeletingTripId(tripId);
    try {
      await deleteTrip(tripId);
      addNotification({
        type: 'success',
        message: 'Trip deleted successfully',
        autoHide: true,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to delete trip',
        autoHide: true,
      });
    } finally {
      setDeletingTripId(null);
      setShowDeleteDialog(false);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllTrips();
      addNotification({
        type: 'success',
        message: 'All trips cleared successfully',
        autoHide: true,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Failed to clear trip history',
        autoHide: true,
      });
    } finally {
      setShowClearDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
      <header className="px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">History</h1>
        {trips.length > 0 && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowClearDialog(true)}
          >
            <Icon name="trash" size={16} />
            Clear All
          </Button>
        )}
      </header>

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-[var(--color-text-secondary)]">Loading trip history...</div>
          </div>
        ) : error ? (
          <Card padding="md" className="border-[var(--color-accent-error)]">
            <div className="flex items-start space-x-3">
              <Icon name="alert" size={24} className="text-[var(--color-accent-error)] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[var(--color-text-primary)] font-medium mb-2">Error Loading History</p>
                <p className="text-[var(--color-text-secondary)] text-sm">{error}</p>
              </div>
            </div>
          </Card>
        ) : !storageAvailable ? (
          <Card padding="md" className="border-[var(--color-accent-warning)]">
            <div className="flex items-start space-x-3">
              <Icon name="alert" size={24} className="text-[var(--color-accent-warning)] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[var(--color-text-primary)] font-medium mb-2">Storage Unavailable</p>
                <p className="text-[var(--color-text-secondary)] text-sm">
                  Trip history is not available in this browser. Please use a modern browser with IndexedDB support.
                </p>
              </div>
            </div>
          </Card>
        ) : trips.length === 0 ? (
          <EmptyState
            icon="clock"
            title="No trips recorded yet"
            description="Start your first trip to see your driving history here."
            action={{
              label: 'Start Trip',
              onClick: () => navigate('/'),
            }}
          />
        ) : (
          <div className="space-y-3">
            {trips
              .sort((a, b) => b.date - a.date) // Newest first
              .map((trip) => {
              const summary = getTripSummary(trip);
              return (
                <Card
                  key={trip.id}
                  padding="md"
                  className="hover:bg-[var(--color-background-tertiary)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleTripClick(trip.id)}>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                          {trip.name}
                        </h3>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {summary.date}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Duration: </span>
                          <span className="text-[var(--color-text-primary)]">{summary.duration}</span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Distance: </span>
                          <span className="text-[var(--color-text-primary)]">{summary.distance}</span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Avg Speed: </span>
                          <span className="text-[var(--color-text-primary)]">{summary.avgSpeed}</span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-tertiary)]">Max Speed: </span>
                          <span className="text-[var(--color-text-primary)]">{summary.maxSpeed}</span>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      className="p-2 text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-error)] transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTrip(trip.id);
                        setShowDeleteDialog(true);
                      }}
                      aria-label="Delete trip"
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Trip Dialog */}
      {showDeleteDialog && selectedTrip && (
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
                onClick={() => handleDeleteTrip(selectedTrip)}
                isLoading={deletingTripId === selectedTrip}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Clear All Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="max-w-sm w-full">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
              Clear all trip history?
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-4">
              This will permanently delete all saved trips from this device.
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
                onClick={handleClearAll}
              >
                Clear History
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};