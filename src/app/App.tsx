import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SpeedometerView } from '../features/speedometer/SpeedometerView';
import { TripsView } from '../features/trips/TripsView';
import { HistoryView } from '../features/history/HistoryView';
import { TripDetailsView } from '../features/history/TripDetailsView';
import { MapView } from '../features/map/MapView';
import { CompassView } from '../features/compass/CompassView';
import { SettingsView } from '../features/settings/SettingsView';
import { HudView } from '../features/hud/HudView';
import { BottomNavigation } from '../components/navigation/BottomNavigation';
import { NotificationProvider, NotificationDisplay } from '../components/common/NotificationSystem';
import { OnlineStatus } from '../components/common/OnlineStatus';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { PermissionRequest } from '../components/common/PermissionRequest';
import { IOSPermissionGuide } from '../components/common/IOSPermissionGuide';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { usePWA } from '../hooks/usePWA';
import { usePermissions } from '../hooks/usePermissions';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

export const App: React.FC = () => {
  const { isWaiting, updateServiceWorker } = useServiceWorker();
  const { showIOSPrompt, dismissIOSPrompt } = usePWA();
  const { permissions, requestLocationPermission } = usePermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
  }, []);

  useEffect(() => {
    // Check if location permission is needed
    if (!permissionRequested && permissions.location.status === 'prompt') {
      setShowPermissionRequest(true);
    }
  }, [permissions.location.status, permissionRequested]);

  const handleLocationPermission = async (granted: boolean) => {
    setPermissionRequested(true);
    setShowPermissionRequest(false);
    
    if (!granted && isIOS) {
      // Show iOS guide if permission denied on iOS
      setShowIOSGuide(true);
    }
  };

  useEffect(() => {
    // Hide loading screen after initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NotificationProvider>
      <Router>
        <div className="min-h-screen bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
          <OnlineStatus />
          
          {showPermissionRequest && (
            <PermissionRequest
              permissionType="location"
              onAllow={async () => {
                const granted = await requestLocationPermission();
                handleLocationPermission(granted);
              }}
              onDeny={() => handleLocationPermission(false)}
            />
          )}
          
          {showIOSGuide && (
            <IOSPermissionGuide onClose={() => setShowIOSGuide(false)} />
          )}
          
          {isWaiting && (
            <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium bg-[var(--color-accent-primary)] text-white">
              <div className="inline-flex items-center space-x-2">
                <span>New version available</span>
                <button
                  onClick={updateServiceWorker}
                  className="px-3 py-1 bg-white text-[var(--color-accent-primary)] rounded-full font-semibold hover:bg-gray-100 transition-colors"
                >
                  Update
                </button>
              </div>
            </div>
          )}

          {showIOSPrompt && (
            <div className="fixed bottom-16 left-4 right-4 z-50 sm:bottom-20">
              <Card padding="md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-[var(--color-text-primary)] font-semibold mb-1">
                      Add Speedometer to Home Screen
                    </h3>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-2">
                      1. Tap the Share button
                    </p>
                    <p className="text-[var(--color-text-secondary)] text-sm mb-2">
                      2. Select "Add to Home Screen"
                    </p>
                    <p className="text-[var(--color-text-secondary)] text-sm">
                      3. Tap "Add"
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={dismissIOSPrompt}
                    aria-label="Dismiss"
                  >
                    <Icon name="x" size={16} />
                  </Button>
                </div>
              </Card>
            </div>
          )}
          
          <main className="pb-14 sm:pb-16 safe-area-bottom">
            <Routes>
              <Route path="/" element={<SpeedometerView />} />
              <Route path="/trips" element={<TripsView />} />
              <Route path="/history" element={<HistoryView />} />
              <Route path="/trip/:id" element={<TripDetailsView />} />
              <Route path="/map" element={<MapView />} />
              <Route path="/compass" element={<CompassView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/hud" element={<HudView />} />
            </Routes>
          </main>
          <BottomNavigation />
          <NotificationDisplay />
        </div>
      </Router>
    </NotificationProvider>
  );
};