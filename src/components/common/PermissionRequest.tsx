import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

interface PermissionRequestProps {
  permissionType: 'location' | 'notification' | 'orientation';
  onAllow: () => void;
  onDeny: () => void;
  onCancel?: () => void;
}

export const PermissionRequest: React.FC<PermissionRequestProps> = ({
  permissionType,
  onAllow,
  onDeny,
  onCancel,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleAllow = async () => {
    setIsVisible(false);
    await onAllow();
  };

  const handleDeny = () => {
    setIsVisible(false);
    onDeny();
  };

  const handleCancel = () => {
    setIsVisible(false);
    if (onCancel) onCancel();
  };

  const getPermissionDetails = () => {
    switch (permissionType) {
      case 'location':
        return {
          icon: 'location',
          title: 'Location Permission',
          description: 'SpeedX needs access to your location to track your speed, distance, and route. Your location data stays on your device and is never shared.',
          color: 'text-[var(--color-accent-warning)]',
        };
      case 'notification':
        return {
          icon: 'bell',
          title: 'Notification Permission',
          description: 'Enable notifications to receive speed limit alerts and trip updates.',
          color: 'text-[var(--color-accent-info)]',
        };
      case 'orientation':
        return {
          icon: 'compass',
          title: 'Motion Sensors Permission',
          description: 'Access to device orientation and motion sensors for compass and heading information.',
          color: 'text-[var(--color-accent-success)]',
        };
      default:
        return {
          icon: 'alert',
          title: 'Permission Required',
          description: 'This permission is required for the app to function properly.',
          color: 'text-[var(--color-text-primary)]',
        };
    }
  };

  const details = getPermissionDetails();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 safe-area-top safe-area-bottom">
      <Card padding="lg" className="max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 ${details.color}`}>
            <Icon name={details.icon} size={48} />
          </div>
          
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            {details.title}
          </h2>
          
          <p className="text-[var(--color-text-secondary)] text-sm mb-6">
            {details.description}
          </p>
          
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={handleAllow} variant="primary" size="lg">
              Allow
            </Button>
            <Button onClick={handleDeny} variant="secondary" size="lg">
              Don't Allow
            </Button>
            {onCancel && (
              <Button onClick={handleCancel} variant="ghost" size="sm">
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};