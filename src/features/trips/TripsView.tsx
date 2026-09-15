import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../components/dashboard/EmptyState';

export const TripsView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)] safe-area-top">
      <header className="px-4 py-4">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Trips</h1>
      </header>

      <div className="px-4 py-8">
        <EmptyState
          icon="route"
          title="No active trip"
          description="Start a trip to begin tracking your journey."
          action={{
            label: 'Start Trip',
            onClick: () => navigate('/'),
          }}
        />
      </div>
    </div>
  );
};