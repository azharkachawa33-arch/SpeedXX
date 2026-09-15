import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OnlineStatus: React.FC = () => {
  const { isOnline, showStatus } = useOnlineStatus();

  if (!showStatus) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all duration-300">
      <div className={`inline-block px-4 py-2 rounded-full ${
        isOnline 
          ? 'bg-[var(--color-accent-success)] text-white' 
          : 'bg-[var(--color-accent-warning)] text-white'
      }`}>
        {isOnline ? 'Back online' : "You're offline"}
      </div>
    </div>
  );
};
