import React from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';

interface IOSPermissionGuideProps {
  onClose: () => void;
}

export const IOSPermissionGuide: React.FC<IOSPermissionGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 safe-area-top safe-area-bottom">
      <Card padding="lg" className="max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 text-[var(--color-accent-warning)]">
            <Icon name="location" size={48} />
          </div>
          
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
            iOS Location Permission Required
          </h2>
          
          <p className="text-[var(--color-text-secondary)] text-sm mb-4">
            To enable location access in Safari on iOS:
          </p>
          
          <div className="text-left bg-[var(--color-background-tertiary)] p-4 rounded-lg mb-4 text-sm text-[var(--color-text-primary)]">
            <ol className="list-decimal list-inside space-y-2">
              <li>Open iOS <strong>Settings</strong></li>
              <li>Scroll down and tap <strong>Safari</strong></li>
              <li>Tap <strong>Location</strong></li>
              <li>Select <strong>"Ask"</strong> or <strong>"While Using App"</strong></li>
              <li>Return to this app and try again</li>
            </ol>
          </div>
          
          <p className="text-[var(--color-text-secondary)] text-xs mb-4">
            Alternatively, you can tap the "AA" icon in Safari's address bar and select "Allow Location" for this website.
          </p>
          
          <div className="flex flex-col gap-3 w-full">
            <Button onClick={onClose} variant="primary" size="lg">
              I've Enabled Location
            </Button>
            <Button onClick={onClose} variant="secondary" size="lg">
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};