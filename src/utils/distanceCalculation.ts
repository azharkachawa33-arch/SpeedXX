import type { LocationData } from '../models/types';

/**
 * Calculate distance between two points using the Haversine formula
 * @param lat1 Latitude of first point in degrees
 * @param lon1 Longitude of first point in degrees
 * @param lat2 Latitude of second point in degrees
 * @param lon2 Longitude of second point in degrees
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate distance between two LocationData points
 * @param point1 First location point
 * @param point2 Second location point
 * @returns Distance in meters
 */
export function distanceBetweenPoints(
  point1: LocationData,
  point2: LocationData
): number {
  return haversineDistance(
    point1.latitude,
    point1.longitude,
    point2.latitude,
    point2.longitude
  );
}

/**
 * Calculate total distance from an array of location points
 * @param points Array of location points
 * @returns Total distance in meters
 */
export function calculateTotalRouteDistance(points: LocationData[]): number {
  if (points.length < 2) return 0;

  let result = 0;
  for (let i = 1; i < points.length; i++) {
    result += distanceBetweenPoints(points[i - 1], points[i]);
  }

  return result;
}

/**
 * Convert meters to kilometers
 * @param meters Distance in meters
 * @returns Distance in kilometers
 */
export function metersToKilometers(meters: number): number {
  return meters / 1000;
}

/**
 * Convert meters to miles
 * @param meters Distance in meters
 * @returns Distance in miles
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.344;
}

/**
 * Convert meters to nautical miles
 * @param meters Distance in meters
 * @returns Distance in nautical miles
 */
export function metersToNauticalMiles(meters: number): number {
  return meters / 1852;
}

/**
 * Format distance for display
 * @param meters Distance in meters
 * @param unit Unit of measurement ('km', 'mi', or 'nm')
 * @param decimals Number of decimal places
 * @returns Formatted distance string
 */
export function formatDistance(
  meters: number,
  unit: 'km' | 'mi' | 'nm',
  decimals: number = 1
): string {
  if (!isFinite(meters) || meters < 0) {
    return `0 ${unit}`;
  }

  let convertedDistance: number;
  switch (unit) {
    case 'km':
      convertedDistance = metersToKilometers(meters);
      break;
    case 'mi':
      convertedDistance = metersToMiles(meters);
      break;
    case 'nm':
      convertedDistance = metersToNauticalMiles(meters);
      break;
    default:
      convertedDistance = meters;
  }
  
  const roundedDistance = Math.round(convertedDistance * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return `${roundedDistance.toFixed(decimals)} ${unit}`;
}