// Map configuration
// Uses OpenStreetMap tiles through CartoDB (free, no API key required)

export const MAP_CONFIG = {
  // Map style URL - CartoDB Positron (light theme, more reliable)
  // Safari compatibility: using HTTPS and simpler style URL
  styleUrl: 'https://basemaps.cartocdn.com/positron/positron_tiles.json',
  
  // Alternative styles (commented out, can be switched in production)
  // Dark Matter: 'https://basemaps.cartocdn.com/dark_all/dark_all.json',
  // Voyager: 'https://basemaps.cartocdn.com/voyager/voyager_tiles.json',
  
  // Initial view
  initialZoom: 15,
  initialCenter: [0, 0], // Will be overridden by user's location
  
  // Map controls
  showScale: true,
  showCompass: true,
  showZoom: true,
  
  // Performance settings
  maxZoom: 19,
  minZoom: 3,
  
  // Route styling
  routeColor: '#3b82f6', // Accent color from design tokens
  routeWidth: 4,
  routeOpacity: 0.8,
  
  // Current location marker
  markerColor: '#ef4444', // Error/accent color
  markerSize: 20,
  
  // Start marker
  startMarkerColor: '#22c55e', // Success color
  
  // End marker
  endMarkerColor: '#f59e0b', // Warning color
  
  // Performance optimization
  simplifyRoute: true,
  simplifyTolerance: 0.00001, // Coordinate simplification tolerance
  minRoutePointDistance: 5, // Minimum distance between route points in meters
  minRoutePointTime: 1000, // Minimum time between route points in milliseconds
  
  // Safari compatibility settings
  attributionControl: true,
  hash: false,
} as const;