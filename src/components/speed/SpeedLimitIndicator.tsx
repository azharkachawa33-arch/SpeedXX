import React from 'react';
import { Card } from '../ui/Card';
import { Icon } from '../ui/Icon';
import type { SpeedLimitState, WarningLevel } from '../../models/types';

interface SpeedLimitIndicatorProps {
  enabled: boolean;
  state: SpeedLimitState;
  formattedLimit: string;
  formattedCurrentSpeed: string;
  warningLevelText: string;
}

export const SpeedLimitIndicator: React.FC<SpeedLimitIndicatorProps> = ({
  enabled,
  state,
  formattedLimit,
  formattedCurrentSpeed,
  warningLevelText,
}) => {
  if (!enabled) return null;

  const getWarningColor = (level: WarningLevel) => {
    switch (level) {
      case 'exceeded':
        return 'text-[var(--color-accent-error)]';
      case 'approaching':
        return 'text-[var(--color-accent-warning)]';
      default:
        return 'text-[var(--color-accent-success)]';
    }
  };

  const getWarningBgColor = (level: WarningLevel) => {
    switch (level) {
      case 'exceeded':
        return 'bg-[var(--color-background-error)]';
      case 'approaching':
        return 'bg-[var(--color-background-warning)]';
      default:
        return 'bg-[var(--color-background-primary)]';
    }
  };

  const getWarningBorderColor = (level: WarningLevel) => {
    switch (level) {
      case 'exceeded':
        return 'border-[var(--color-accent-error)]';
      case 'approaching':
        return 'border-[var(--color-accent-warning)]';
      default:
        return 'border-[var(--color-border-primary)]';
    }
  };

  if (!state.isActive) {
    return (
      <Card padding="sm">
        <div 
          className="flex items-center justify-between"
          role="status"
          aria-label={`Speed limit: ${formattedLimit}`}
        >
          <div className="flex items-center space-x-2">
            <Icon name="gauge" size={16} className="text-[var(--color-accent-primary)]" aria-hidden="true" />
            <span className="text-sm text-[var(--color-text-secondary)]">Limit</span>
          </div>
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {formattedLimit}
          </span>
        </div>
      </Card>
    );
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Speed warning: ${warningLevelText}. Current speed: ${formattedCurrentSpeed}. Limit: ${formattedLimit}`}
    >
      <Card 
        padding="md" 
        className={`border-2 ${getWarningBorderColor(state.warningLevel)} ${getWarningBgColor(state.warningLevel)}`}
      >
        <div className="flex items-center space-x-3">
          <Icon 
            name="alert" 
            size={24} 
            className={getWarningColor(state.warningLevel)}
            aria-hidden="true"
          />
          <div className="flex-1">
            <p className="text-[var(--color-text-primary)] font-semibold">
              {warningLevelText}
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {formattedCurrentSpeed} • Limit {formattedLimit}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};