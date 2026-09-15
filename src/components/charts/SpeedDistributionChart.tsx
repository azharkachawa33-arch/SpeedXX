import React from 'react';
import type { SpeedDistributionBucket } from '../../models/types';

interface SpeedDistributionChartProps {
  distribution: SpeedDistributionBucket[];
  speedUnit: 'km/h' | 'mph' | 'knots';
}

export const SpeedDistributionChart: React.FC<SpeedDistributionChartProps> = ({
  distribution,
  speedUnit,
}) => {
  if (distribution.length === 0) {
    return (
      <div className="bg-[var(--color-background-tertiary)] rounded-lg p-4 text-center">
        <p className="text-[var(--color-text-secondary)] text-sm">Not enough data for distribution</p>
      </div>
    );
  }

  const maxPercentage = Math.max(...distribution.map(d => d.percentage));

  return (
    <div className="bg-[var(--color-background-tertiary)] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">Speed Distribution</h3>
      <div className="space-y-2">
        {distribution.map((bucket, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-16 text-xs text-[var(--color-text-secondary)] text-right">
              {bucket.minSpeed}-{bucket.maxSpeed}
            </div>
            <div className="flex-1 h-4 bg-[var(--color-background-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--color-accent-primary)] rounded-full transition-all duration-300"
                style={{ width: `${(bucket.percentage / maxPercentage) * 100}%` }}
              />
            </div>
            <div className="w-16 text-xs text-[var(--color-text-secondary)]">
              {Math.round(bucket.percentage)}%
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-[var(--color-text-tertiary)] text-center">
        Speed in {speedUnit}
      </div>
    </div>
  );
};
