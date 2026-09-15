export type CardinalDirection = 
  | 'N' 
  | 'NE' 
  | 'E' 
  | 'SE' 
  | 'S' 
  | 'SW' 
  | 'W' 
  | 'NW';

export type FullDirection = 
  | 'North' 
  | 'Northeast' 
  | 'East' 
  | 'Southeast' 
  | 'South' 
  | 'Southwest' 
  | 'West' 
  | 'Northwest';

/**
 * Get cardinal direction from degrees
 * @param degrees Heading in degrees (0-359)
 * @returns Cardinal direction abbreviation
 */
export function getCardinalDirection(degrees: number): CardinalDirection {
  const normalizedDegrees = degrees % 360;
  
  if (normalizedDegrees >= 337.5 || normalizedDegrees < 22.5) return 'N';
  if (normalizedDegrees >= 22.5 && normalizedDegrees < 67.5) return 'NE';
  if (normalizedDegrees >= 67.5 && normalizedDegrees < 112.5) return 'E';
  if (normalizedDegrees >= 112.5 && normalizedDegrees < 157.5) return 'SE';
  if (normalizedDegrees >= 157.5 && normalizedDegrees < 202.5) return 'S';
  if (normalizedDegrees >= 202.5 && normalizedDegrees < 247.5) return 'SW';
  if (normalizedDegrees >= 247.5 && normalizedDegrees < 292.5) return 'W';
  return 'NW';
}

/**
 * Get full direction name from degrees
 * @param degrees Heading in degrees (0-359)
 * @returns Full direction name
 */
export function getFullDirection(degrees: number): FullDirection {
  const cardinal = getCardinalDirection(degrees);
  
  const directionMap: Record<CardinalDirection, FullDirection> = {
    'N': 'North',
    'NE': 'Northeast',
    'E': 'East',
    'SE': 'Southeast',
    'S': 'South',
    'SW': 'Southwest',
    'W': 'West',
    'NW': 'Northwest',
  };
  
  return directionMap[cardinal];
}

/**
 * Format heading for display
 * @param degrees Heading in degrees (0-359)
 * @returns Formatted heading string (e.g., "354°")
 */
export function formatHeading(degrees: number): string {
  const normalizedDegrees = Math.round(degrees % 360);
  return `${normalizedDegrees}°`;
}

/**
 * Safe number formatting for heading
 * @param value Number to format
 * @returns Formatted number or 0 if invalid
 */
export function safeFormatHeading(value: number | null | undefined): number {
  if (value === null || value === undefined || !isFinite(value)) {
    return 0;
  }
  return Math.round(value % 360);
}

/**
 * Check if heading is valid
 * @param degrees Heading in degrees
 * @returns True if heading is valid
 */
export function isValidHeading(degrees: number | null | undefined): boolean {
  if (degrees === null || degrees === undefined || !isFinite(degrees)) {
    return false;
  }
  const normalized = degrees % 360;
  return normalized >= 0 && normalized < 360;
}

/**
 * Get direction arrow for heading
 * @param degrees Heading in degrees (0-359)
 * @returns Unicode arrow character pointing in the direction
 */
export function getDirectionArrow(degrees: number): string {
  const cardinal = getCardinalDirection(degrees);
  
  const arrowMap: Record<CardinalDirection, string> = {
    'N': '↑',
    'NE': '↗',
    'E': '→',
    'SE': '↘',
    'S': '↓',
    'SW': '↙',
    'W': '←',
    'NW': '↖',
  };
  
  return arrowMap[cardinal];
}