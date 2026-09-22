import * as maplibregl from 'maplibre-gl';
import type { Map, LngLatBounds, GeoJSONSource } from 'maplibre-gl';
import type { RoutePoint, GpsPosition } from '../../models/types';
import { MAP_CONFIG } from './mapConfig';

// Custom marker type
class CustomMarker {
  private element: HTMLElement;
  private lngLat: [number, number];
  private map: Map | null = null;

  constructor(element: HTMLElement, lngLat: [number, number]) {
    this.element = element;
    this.lngLat = lngLat;
  }

  addTo(map: Map): this {
    this.map = map;
    map.getContainer().appendChild(this.element);
    this.updatePosition();
    return this;
  }

  remove(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.map = null;
  }

  setLngLat(lngLat: [number, number]): this {
    this.lngLat = lngLat;
    this.updatePosition();
    return this;
  }

  getLngLat(): [number, number] {
    return this.lngLat;
  }

  private updatePosition(): void {
    if (!this.map) return;
    const point = this.map.project(this.lngLat);
    this.element.style.position = 'absolute';
    this.element.style.left = `${point.x}px`;
    this.element.style.top = `${point.y}px`;
    this.element.style.transform = 'translate(-50%, -50%)';
  }
}

export class MapController {
  private map: Map | null = null;
  private container: HTMLElement | null = null;
  private currentMarker: CustomMarker | null = null;
  private startMarker: CustomMarker | null = null;
  private endMarker: CustomMarker | null = null;
  private routeSourceId: string = 'route';
  private isFollowing: boolean = true;
  private onFollowChangeCallback: ((following: boolean) => void) | null = null;

  initialize(container: HTMLElement): void {
    this.container = container;
    
    try {
      // Ensure container has explicit dimensions
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.position = 'relative';

      // Get tile URLs with API key
      let tileUrls: string[];
      try {
        tileUrls = MAP_CONFIG.getTileUrls();
      } catch (error) {
        throw new Error('CARTO map key is not configured');
      }

      // Use raster tiles for better compatibility
      const rasterStyle = {
        version: 8 as const,
        sources: {
          'carto-voyager': {
            type: 'raster' as const,
            tiles: tileUrls,
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO',
          },
        },
        layers: [
          {
            id: 'carto-voyager-layer',
            type: 'raster' as const,
            source: 'carto-voyager',
            minzoom: MAP_CONFIG.minZoom,
            maxzoom: MAP_CONFIG.maxZoom,
          },
        ],
      };

      this.map = new maplibregl.Map({
        container: container,
        style: rasterStyle,
        center: MAP_CONFIG.initialCenter as [number, number],
        zoom: MAP_CONFIG.initialZoom,
        minZoom: MAP_CONFIG.minZoom,
        maxZoom: MAP_CONFIG.maxZoom,
        attributionControl: MAP_CONFIG.attributionControl ? {} : false,
        hash: MAP_CONFIG.hash,
      });

      if (this.map) {
        this.map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
        this.map.addControl(new maplibregl.ScaleControl({ }), 'bottom-left');

        // Add route source on load
        this.map.on('load', () => {
          this.addRouteSource();
        });

        // Handle map errors
        this.map.on('error', (e) => {
          // Map error occurred - handled by UI
        });

        // Handle user interaction to stop follow mode
        this.map.on('dragstart', () => {
          this.setFollowing(false);
        });

        this.map.on('zoomstart', () => {
          this.setFollowing(false);
        });
      }
    } catch (error) {
      throw error;
    }
  }

  private addRouteSource(): void {
    if (!this.map) return;

    // Check if source already exists
    if (this.map.getSource(this.routeSourceId)) {
      return;
    }

    this.map.addSource(this.routeSourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    this.map.addLayer({
      id: 'route-line',
      type: 'line',
      source: this.routeSourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': MAP_CONFIG.routeColor,
        'line-width': MAP_CONFIG.routeWidth,
        'line-opacity': MAP_CONFIG.routeOpacity,
      },
    });
  }

  updateCurrentPosition(position: GpsPosition | null, heading?: number): void {
    if (!this.map || !position) return;

    const lngLat: [number, number] = [position.longitude, position.latitude];

    // Remove existing marker
    if (this.currentMarker) {
      this.currentMarker.remove();
    }

    // Create new marker
    const el = document.createElement('div');
    el.className = 'current-location-marker';
    el.style.width = `${MAP_CONFIG.markerSize}px`;
    el.style.height = `${MAP_CONFIG.markerSize}px`;
    el.style.backgroundColor = MAP_CONFIG.markerColor;
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    
    // Add heading arrow if available
    if (heading !== undefined && heading !== null) {
      const arrow = document.createElement('div');
      arrow.style.position = 'absolute';
      arrow.style.top = '-8px';
      arrow.style.left = '50%';
      arrow.style.transform = `translateX(-50%) rotate(${heading}deg)`;
      arrow.style.width = '0';
      arrow.style.height = '0';
      arrow.style.borderLeft = '6px solid transparent';
      arrow.style.borderRight = '6px solid transparent';
      arrow.style.borderBottom = '12px solid white';
      el.appendChild(arrow);
    }

    this.currentMarker = new CustomMarker(el, lngLat);
    this.currentMarker.addTo(this.map);

    // Follow mode
    if (this.isFollowing) {
      this.map.easeTo({
        center: lngLat,
        duration: 1000,
      });
    }
  }

  updateRoute(routePoints: RoutePoint[]): void {
    if (!this.map || routePoints.length < 2) return;

    const geojson = this.routePointsToGeoJSON(routePoints);

    const source = this.map.getSource(this.routeSourceId);
    if (source && source.type === 'geojson') {
      (source as GeoJSONSource).setData(geojson);
    }
  }

  displayTripRoute(routePoints: RoutePoint[], startLocation?: RoutePoint, endLocation?: RoutePoint): void {
    if (!this.map) return;

    // Clear existing markers
    this.clearMarkers();

    // Display route
    if (routePoints.length >= 2) {
      this.updateRoute(routePoints);
    }

    // Add start marker
    if (startLocation) {
      this.addStartMarker(startLocation);
    }

    // Add end marker
    if (endLocation) {
      this.addEndMarker(endLocation);
    }

    // Fit bounds to route
    if (routePoints.length >= 2) {
      this.fitRouteBounds(routePoints);
    }
  }

  private addStartMarker(location: RoutePoint): void {
    if (!this.map) return;

    const el = document.createElement('div');
    el.className = 'start-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundColor = MAP_CONFIG.startMarkerColor;
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

    this.startMarker = new CustomMarker(el, [location.longitude, location.latitude]);
    this.startMarker.addTo(this.map);
  }

  private addEndMarker(location: RoutePoint): void {
    if (!this.map) return;

    const el = document.createElement('div');
    el.className = 'end-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.backgroundColor = MAP_CONFIG.endMarkerColor;
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

    this.endMarker = new CustomMarker(el, [location.longitude, location.latitude]);
    this.endMarker.addTo(this.map);
  }

  private clearMarkers(): void {
    if (this.currentMarker) {
      this.currentMarker.remove();
      this.currentMarker = null;
    }
    if (this.startMarker) {
      this.startMarker.remove();
      this.startMarker = null;
    }
    if (this.endMarker) {
      this.endMarker.remove();
      this.endMarker = null;
    }
  }

  private routePointsToGeoJSON(routePoints: RoutePoint[]): any {
    const coordinates = routePoints.map(point => [point.longitude, point.latitude]);
    
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates,
          },
        },
      ],
    };
  }

  private fitRouteBounds(routePoints: RoutePoint[]): void {
    if (!this.map || routePoints.length < 2) return;

    const coordinates = routePoints.map(point => [point.longitude, point.latitude] as [number, number]);
    const bounds = coordinates.reduce((bounds, coord) => {
      return bounds.extend(coord);
    }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

    this.map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 16,
    });
  }

  recenter(): void {
    if (!this.map || !this.currentMarker) return;

    const lngLat = this.currentMarker.getLngLat();
    this.map.easeTo({
      center: lngLat,
      zoom: MAP_CONFIG.initialZoom,
      duration: 1000,
    });

    this.setFollowing(true);
  }

  setFollowing(following: boolean): void {
    this.isFollowing = following;
    if (this.onFollowChangeCallback) {
      this.onFollowChangeCallback(following);
    }
  }

  onFollowChange(callback: (following: boolean) => void): void {
    this.onFollowChangeCallback = callback;
  }

  clearRoute(): void {
    if (!this.map) return;

    const source = this.map.getSource(this.routeSourceId);
    if (source && source.type === 'geojson') {
      (source as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }

  destroy(): void {
    this.clearMarkers();
    this.clearRoute();
    
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    
    this.container = null;
    this.onFollowChangeCallback = null;
  }

  isLoaded(): boolean {
    return this.map !== null && this.map.loaded();
  }

  on(event: 'load' | 'error', callback: () => void): void {
    if (this.map) {
      this.map.on(event, callback);
    }
  }

  off(event: 'load' | 'error', callback: () => void): void {
    if (this.map) {
      this.map.off(event, callback);
    }
  }
}