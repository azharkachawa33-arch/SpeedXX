import React from 'react';
import type { RoutePoint } from '../../models/types';
import { downsampleRoutePoints } from '../../utils/tripAnalytics';

interface SpeedTimelineChartProps {
  route: RoutePoint[];
  speedUnit: 'km/h' | 'mph' | 'knots';
  height?: number;
}

export const SpeedTimelineChart: React.FC<SpeedTimelineChartProps> = ({
  route,
  speedUnit,
  height = 200,
}) => {
  const downsampledRoute = downsampleRoutePoints(route, 100);
  
  if (downsampledRoute.length < 2) {
    return (
      <div className="bg-[var(--color-background-tertiary)] rounded-lg p-4 text-center">
        <p className="text-[var(--color-text-secondary)] text-sm">Not enough data for chart</p>
      </div>
    );
  }

  const speeds = downsampledRoute.map(point => point.speed || 0);
  const maxSpeed = Math.max(...speeds);
  const chartWidth = 100;
  const chartHeight = 100;
  const padding = 10;

  const convertSpeed = (speedMps: number): number => {
    switch (speedUnit) {
      case 'km/h':
        return speedMps * 3.6;
      case 'mph':
        return speedMps * 2.23694;
      case 'knots':
        return speedMps * 1.94384;
      default:
        return speedMps * 3.6;
    }
  };

  const points = downsampledRoute.map((point, index) => {
    const x = padding + (index / (downsampledRoute.length - 1)) * (chartWidth - 2 * padding);
    const speed = convertSpeed(point.speed || 0);
    const y = chartHeight - padding - (speed / (convertSpeed(maxSpeed) || 1)) * (chartHeight - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-[var(--color-background-tertiary)] rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Speed Over Time</h3>
        <span className="text-xs text-[var(--color-text-secondary)]">Max: {Math.round(convertSpeed(maxSpeed))} {speedUnit}</span>
      </div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{ height: `${height}px` }}
        preserveAspectRatio="none"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={padding + ratio * (chartHeight - 2 * padding)}
            x2={chartWidth - padding}
            y2={padding + ratio * (chartHeight - 2 * padding)}
            stroke="var(--color-border-primary)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Speed line */}
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-accent-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
