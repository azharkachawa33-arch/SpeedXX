// Map configuration
// Uses CartoDB Voyager raster tiles with API key (Google Maps-like appearance)

export const MAP_CONFIG = {
  // CartoDB Voyager raster tiles with API key
  getTileUrls: (): string[] => {
    const apiKey = import.meta.env.VITE_CARTO_API_KEY;
    
    // For development, allow fallback if API key is missing
    if (!apiKey && import.meta.env.DEV) {
      return [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
      ];
    }
    
    // In production, API key is required
    if (!apiKey) {
      throw new Error('CARTO map key is not configured. Please add VITE_CARTO_API_KEY to Cloudflare Pages environment variables.');
    }
    
    return [
      `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?api_key=${apiKey}`,
      `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?api_key=${apiKey}`,
      `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?api_key=${apiKey}`
    ];
  },
  
  // Alternative styles (commented out, can be switched in production)
  // OpenStreetMap: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  // CartoDB Positron: 'https://basemaps.cartocdn.com/positron/positron_tiles.json',
  // CartoDB Dark: 'https://basemaps.cartocdn.com/dark_all/dark_all.json',
  
  // Initial view
  initialZoom: 3, // Lower zoom for better initial visibility
  initialCenter: [0, 40], // Default to visible location (longitude 0, latitude 40 - Mediterranean Sea)
  
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
  
  // Chrome-optimized settings
  attributionControl: true,
  hash: false,
} as const;