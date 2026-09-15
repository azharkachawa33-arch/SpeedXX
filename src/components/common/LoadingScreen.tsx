import React, { useEffect, useState } from 'react';
import { Icon } from '../ui/Icon';

export const LoadingScreen: React.FC = () => {
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    // Show message after a short delay
    const timer = setTimeout(() => {
      setShowMessage(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-[var(--color-background-primary)] flex flex-col items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-4">
          <Icon name="gauge" size={64} className="text-[var(--color-accent-primary)]" />
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
          Speedometer
        </h1>
        {showMessage && (
          <p className="text-[var(--color-text-secondary)] text-sm animate-pulse">
            Preparing GPS tools...
          </p>
        )}
      </div>
    </div>
  );
};
