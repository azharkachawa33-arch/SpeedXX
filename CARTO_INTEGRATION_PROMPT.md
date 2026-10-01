CARTO Integration Request for SpeedX Project

## Current Setup:
- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **Map Library:** MapLibre GL JS (version 6.7.0)
- **Current Map:** CartoDB Voyager raster tiles
- **Deployment:** Cloudflare Pages
- **API Key:** Have a valid CARTO Basemaps API key

## Current Implementation:
```typescript
// Using CartoDB Voyager raster tiles with API key
getTileUrls: (): string[] => {
  const apiKey = import.meta.env.VITE_CARTO_API_KEY;
  return [
    `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?api_key=${apiKey}`,
    `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?api_key=${apiKey}`,
    `https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?api_key=${apiKey}`
  ];
}
```

## Current Problem:
- Getting "API KEY REQUIRED" watermark in production
- Environment variable `VITE_CARTO_API_KEY` not working in Cloudflare Pages production build
- Works in local development but not in deployed production

## Requirements:
1. Need the correct CARTO integration code for MapLibre GL JS with CartoDB Voyager
2. Need proper environment variable configuration for Cloudflare Pages production
3. Need the exact URL format and authentication method for CARTO Voyager tiles
4. Need to ensure the API key is properly passed in production build

## Questions:
1. What is the correct URL format for CartoDB Voyager tiles with API key?
2. Should I use raster tiles or vector style JSON?
3. What is the correct parameter name for the API key (?key=, ?api_key=, or other)?
4. How should I configure environment variables for Cloudflare Pages production build?
5. Do I need to use any specific CARTO SDK or is MapLibre sufficient?

## Desired Output:
- Exact code implementation for MapLibre GL with CARTO Voyager
- Correct URL format with API key authentication
- Proper environment variable configuration for Cloudflare Pages
- Build configuration if needed

## Current Environment Configuration:
- Local: .env file with VITE_CARTO_API_KEY
- Production: Cloudflare Pages environment variables
- Build: Vite with TypeScript