import type { Trip, SpeedUnit, DistanceUnit } from '../models/types';
import { metersToKilometers, metersToMiles, metersToNauticalMiles } from './distanceCalculation';
import { mpsToKmh, mpsToMph, mpsToKnots } from './speedConversion';

/**
 * Format duration in seconds to human-readable format
 * @param seconds Duration in seconds
 * @returns Formatted duration string (e.g., "32 min 18 sec" or "1h 32m 18s")
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0 sec';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes} min ${secs} sec`;
  }
  return `${secs} sec`;
}

/**
 * Format distance from meters to human-readable format
 * @param meters Distance in meters
 * @param unit Unit to convert to ('km', 'mi', or 'nm')
 * @param decimals Number of decimal places
 * @returns Formatted distance string (e.g., "18.4 km")
 */
export function formatDistanceForDisplay(
  meters: number,
  unit: DistanceUnit,
  decimals: number = 1
): string {
  if (!isFinite(meters) || meters < 0) return `0 ${unit}`;
  
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

/**
 * Format speed from m/s to human-readable format
 * @param speedMps Speed in meters per second
 * @param unit Unit to convert to ('km/h', 'mph', or 'knots')
 * @param decimals Number of decimal places
 * @returns Formatted speed string (e.g., "34 km/h")
 */
export function formatSpeedForDisplay(
  speedMps: number,
  unit: SpeedUnit,
  decimals: number = 0
): string {
  if (!isFinite(speedMps) || speedMps < 0) return `0 ${unit}`;
  
  let convertedSpeed: number;
  switch (unit) {
    case 'km/h':
      convertedSpeed = mpsToKmh(speedMps);
      break;
    case 'mph':
      convertedSpeed = mpsToMph(speedMps);
      break;
    case 'knots':
      convertedSpeed = mpsToKnots(speedMps);
      break;
    default:
      convertedSpeed = speedMps;
  }
  
  const roundedSpeed = Math.round(convertedSpeed * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return `${roundedSpeed.toFixed(decimals)} ${unit}`;
}

/**
 * Format trip date to human-readable format
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Today", "Yesterday", or "Jan 15, 2026")
 */
export function formatTripDate(timestamp: number): string {
  if (!isFinite(timestamp) || timestamp <= 0) return 'Unknown date';
  
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const tripDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (tripDate.getTime() === today.getTime()) {
    return 'Today';
  }
  
  if (tripDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  
  // Format: Jan 15, 2026
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Format trip time to human-readable format
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTripTime(timestamp: number): string {
  if (!isFinite(timestamp) || timestamp <= 0) return 'Unknown time';
  
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  };
  return date.toLocaleTimeString('en-US', options);
}

/**
 * Format trip date and time together
 * @param timestamp Unix timestamp in milliseconds
 * @returns Formatted date and time string (e.g., "Today, 2:30 PM")
 */
export function formatTripDateTime(timestamp: number): string {
  if (!isFinite(timestamp) || timestamp <= 0) return 'Unknown';
  
  return `${formatTripDate(timestamp)}, ${formatTripTime(timestamp)}`;
}

/**
 * Safe number formatting to avoid NaN/Infinity/null/undefined
 * @param value Number to format
 * @param decimals Number of decimal places
 * @returns Formatted number string or "0" if invalid
 */
export function safeFormatNumber(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined || !isFinite(value) || value < 0) {
    return '0';
  }
  
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return rounded.toFixed(decimals);
}

/**
 * Get formatted trip summary for history card
 * @param trip Trip object
 * @returns Object with formatted strings for display
 */
export function getTripSummary(trip: Trip) {
  const duration = formatDuration(trip.statistics.duration);
  const distance = formatDistanceForDisplay(
    trip.statistics.distance,
    trip.distanceUnit,
    1
  );
  const avgSpeed = formatSpeedForDisplay(
    trip.statistics.averageSpeed,
    trip.speedUnit,
    0
  );
  const maxSpeed = formatSpeedForDisplay(
    trip.statistics.maxSpeed,
    trip.speedUnit,
    0
  );
  const date = formatTripDate(trip.startTime);
  const dateTime = formatTripDateTime(trip.startTime);
  
  return {
    duration,
    distance,
    avgSpeed,
    maxSpeed,
    date,
    dateTime,
  };
}