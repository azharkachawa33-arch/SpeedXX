// Speed conversion utilities
// Base unit: meters per second (m/s)

/**
 * Convert meters per second to kilometers per hour
 * @param speedMps Speed in meters per second
 * @returns Speed in kilometers per hour
 */
export function mpsToKmh(speedMps: number): number {
  return speedMps * 3.6;
}

/**
 * Convert meters per second to miles per hour
 * @param speedMps Speed in meters per second
 * @returns Speed in miles per hour
 */
export function mpsToMph(speedMps: number): number {
  return speedMps * 2.23694;
}

/**
 * Convert meters per second to knots
 * @param speedMps Speed in meters per second
 * @returns Speed in knots
 */
export function mpsToKnots(speedMps: number): number {
  return speedMps * 1.94384;
}

/**
 * Convert kilometers per hour to meters per second
 * @param speedKmh Speed in kilometers per hour
 * @returns Speed in meters per second
 */
export function kmhToMps(speedKmh: number): number {
  return speedKmh / 3.6;
}

/**
 * Convert miles per hour to meters per second
 * @param speedMph Speed in miles per hour
 * @returns Speed in meters per second
 */
export function mphToMps(speedMph: number): number {
  return speedMph / 2.23694;
}

/**
 * Convert knots to meters per second
 * @param speedKnots Speed in knots
 * @returns Speed in meters per second
 */
export function knotsToMps(speedKnots: number): number {
  return speedKnots / 1.94384;
}

/**
 * Convert speed to specified unit
 * @param speedMps Speed in meters per second (base unit)
 * @param unit Target unit
 * @returns Speed in target unit
 */
export function convertSpeed(
  speedMps: number,
  unit: 'km/h' | 'mph' | 'knots'
): number {
  switch (unit) {
    case 'km/h':
      return mpsToKmh(speedMps);
    case 'mph':
      return mpsToMph(speedMps);
    case 'knots':
      return mpsToKnots(speedMps);
    default:
      return speedMps;
  }
}

/**
 * Format speed for display
 * @param speed Speed value
 * @param unit Unit of measurement
 * @param decimals Number of decimal places
 * @returns Formatted speed string
 */
export function formatSpeed(
  speed: number,
  unit: 'km/h' | 'mph' | 'knots',
  decimals: number = 0
): string {
  if (!isFinite(speed) || speed < 0) {
    return `0 ${unit}`;
  }
  
  const roundedSpeed = Math.round(speed * Math.pow(10, decimals)) / Math.pow(10, decimals);
  return `${roundedSpeed.toFixed(decimals)} ${unit}`;
}