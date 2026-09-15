import type { Trip, RoutePoint, AdvancedTripStatistics, SpeedDistributionBucket } from '../models/types';

const MOVING_SPEED_THRESHOLD_MPS = 1.0; // 1 m/s ≈ 3.6 km/h
const ELEVATION_SMOOTHING_THRESHOLD = 5; // meters

export function calculateAdvancedStatistics(trip: Trip): AdvancedTripStatistics {
  const route = trip.route || [];
  
  if (route.length < 2) {
    return {
      movingTime: 0,
      stoppedTime: trip.statistics.duration,
      movingAverageSpeed: 0,
      overallAverageSpeed: trip.statistics.averageSpeed,
      maximumSpeed: trip.statistics.maxSpeed,
      minimumSpeed: 0,
      distance: trip.statistics.distance,
      duration: trip.statistics.duration,
      speedDistribution: [],
    };
  }

  let movingTime = 0;
  let stoppedTime = 0;
  let totalMovingSpeed = 0;
  let movingPointCount = 0;
  let minSpeed = Infinity;
  let maxSpeed = 0;
  
  // Elevation tracking
  let elevationGain = 0;
  let elevationLoss = 0;
  let maxElevation = -Infinity;
  let minElevation = Infinity;
  let lastElevation: number | null = null;

  // Speed distribution tracking
  const speedBuckets: { [key: string]: number } = {};
  const bucketSize = 10; // km/h

  for (let i = 0; i < route.length; i++) {
    const point = route[i];
    const speed = point.speed || 0;
    const altitude = point.altitude;

    // Track speed statistics
    if (speed > maxSpeed) {
      maxSpeed = speed;
    }
    if (speed > 0 && speed < minSpeed) {
      minSpeed = speed;
    }

    // Moving vs stopped time
    if (speed >= MOVING_SPEED_THRESHOLD_MPS) {
      movingTime += 1; // Each point represents ~1 second
      totalMovingSpeed += speed;
      movingPointCount++;
    } else {
      stoppedTime += 1;
    }

    // Elevation tracking
    if (altitude !== undefined && altitude !== null && !isNaN(altitude)) {
      if (maxElevation === -Infinity || altitude > maxElevation) {
        maxElevation = altitude;
      }
      if (minElevation === Infinity || altitude < minElevation) {
        minElevation = altitude;
      }

      if (lastElevation !== null) {
        const elevationDiff = altitude - lastElevation;
        if (Math.abs(elevationDiff) > ELEVATION_SMOOTHING_THRESHOLD) {
          if (elevationDiff > 0) {
            elevationGain += elevationDiff;
          } else {
            elevationLoss += Math.abs(elevationDiff);
          }
        }
      }
      lastElevation = altitude;
    }

    // Speed distribution
    const speedKmh = speed * 3.6; // Convert to km/h
    const bucketKey = Math.floor(speedKmh / bucketSize) * bucketSize;
    const bucketRange = `${bucketKey}-${bucketKey + bucketSize}`;
    speedBuckets[bucketRange] = (speedBuckets[bucketRange] || 0) + 1;
  }

  const movingAverageSpeed = movingPointCount > 0 ? totalMovingSpeed / movingPointCount : 0;
  const overallAverageSpeed = trip.statistics.averageSpeed;

  // Calculate speed distribution
  const speedDistribution: SpeedDistributionBucket[] = Object.entries(speedBuckets)
    .map(([range, timeSpent]) => {
      const [minStr, maxStr] = range.split('-');
      return {
        minSpeed: parseFloat(minStr),
        maxSpeed: parseFloat(maxStr),
        timeSpent,
        percentage: (timeSpent / route.length) * 100,
      };
    })
    .sort((a, b) => a.minSpeed - b.minSpeed);

  return {
    movingTime,
    stoppedTime,
    movingAverageSpeed,
    overallAverageSpeed,
    maximumSpeed: maxSpeed,
    minimumSpeed: minSpeed === Infinity ? 0 : minSpeed,
    distance: trip.statistics.distance,
    duration: trip.statistics.duration,
    elevationGain: elevationGain > 0 ? elevationGain : undefined,
    elevationLoss: elevationLoss > 0 ? elevationLoss : undefined,
    maxElevation: maxElevation > -Infinity ? maxElevation : undefined,
    minElevation: minElevation < Infinity ? minElevation : undefined,
    speedDistribution,
  };
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatSpeed(value: number, unit: 'km/h' | 'mph' | 'knots'): string {
  return `${Math.round(value)} ${unit}`;
}

export function formatElevation(value: number, unit: 'm' | 'ft' = 'm'): string {
  if (unit === 'ft') {
    return `${Math.round(value * 3.28084)} ft`;
  }
  return `${Math.round(value)} m`;
}

export function downsampleRoutePoints(route: RoutePoint[], maxPoints: number = 100): RoutePoint[] {
  if (route.length <= maxPoints) {
    return route;
  }

  const step = Math.ceil(route.length / maxPoints);
  const downsampled: RoutePoint[] = [];

  for (let i = 0; i < route.length; i += step) {
    downsampled.push(route[i]);
  }

  // Always include the last point
  if (downsampled[downsampled.length - 1] !== route[route.length - 1]) {
    downsampled.push(route[route.length - 1]);
  }

  return downsampled;
}

export function exportTripAsJSON(trip: Trip): string {
  const exportData = {
    id: trip.id,
    name: trip.name,
    date: trip.date,
    startTime: trip.startTime,
    endTime: trip.endTime,
    duration: trip.statistics.duration,
    distance: trip.statistics.distance,
    averageSpeed: trip.statistics.averageSpeed,
    maxSpeed: trip.statistics.maxSpeed,
    speedUnit: trip.speedUnit,
    distanceUnit: trip.distanceUnit,
    startLocation: trip.startLocation,
    endLocation: trip.endLocation,
    route: trip.route,
    advancedStatistics: trip.advancedStatistics,
  };

  return JSON.stringify(exportData, null, 2);
}

export function exportTripAsCSV(trip: Trip): string {
  if (!trip.route || trip.route.length === 0) {
    return '';
  }

  const headers = ['timestamp', 'latitude', 'longitude', 'speed', 'accuracy', 'altitude', 'heading'];
  const rows = trip.route.map(point => [
    point.timestamp,
    point.latitude,
    point.longitude,
    point.speed !== undefined ? point.speed : '',
    point.accuracy,
    point.altitude !== undefined ? point.altitude : '',
    point.heading !== undefined ? point.heading : '',
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

export function createTripShareText(trip: Trip): string {
  const stats = trip.advancedStatistics || trip.statistics;
  
  const distance = trip.distanceUnit === 'km' 
    ? `${(trip.statistics.distance / 1000).toFixed(1)} km`
    : `${(trip.statistics.distance / 1609.34).toFixed(1)} mi`;
  
  const duration = formatDuration(trip.statistics.duration);
  const avgSpeed = formatSpeed(trip.statistics.averageSpeed, trip.speedUnit);
  const maxSpeed = formatSpeed(trip.statistics.maxSpeed, trip.speedUnit);

  return `Speedometer Trip

Distance: ${distance}
Duration: ${duration}
Average: ${avgSpeed}
Maximum: ${maxSpeed}`;
}
