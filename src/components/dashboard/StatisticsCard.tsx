import React from 'react';
import { Card } from '../ui/Card';

interface StatisticsCardProps {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
}

export const StatisticsCard: React.FC<StatisticsCardProps> = ({
  label,
  value,
  unit,
  icon,
}) => {
  return (
    <Card hover className="flex flex-col items-center justify-center text-center">
      {icon && (
        <div className="mb-2 text-[var(--color-accent-primary)]">
          {icon}
        </div>
      )}
      <p className="text-[var(--color-text-tertiary)] text-sm font-medium uppercase tracking-wider mb-1">
        {label}
      </p>
      <div className="flex items-baseline">
        <span className="text-2xl md:text-3xl font-bold text-[var(--color-text-primary)]">
          {value}
        </span>
        {unit && (
          <span className="text-[var(--color-text-secondary)] text-sm ml-1">
            {unit}
          </span>
        )}
      </div>
    </Card>
  );
};