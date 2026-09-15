import { NavigationItem } from '../models/types';

export const APP_NAME = 'Speedometer';
export const APP_VERSION = '1.0.0';

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'speed',
    label: 'Speed',
    icon: 'gauge',
    path: '/',
  },
  {
    id: 'history',
    label: 'History',
    icon: 'clock',
    path: '/history',
  },
  {
    id: 'map',
    label: 'Map',
    icon: 'location',
    path: '/map',
  },
  {
    id: 'compass',
    label: 'Compass',
    icon: 'compass',
    path: '/compass',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    path: '/settings',
  },
];

export const BREAKPOINTS = {
  xs: 320,
  sm: 375,
  md: 390,
  lg: 414,
  xl: 768,
  '2xl': 1024,
  '3xl': 1366,
  '4xl': 1920,
};

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

export const STORAGE_KEYS = {
  SETTINGS: 'speedx_settings',
  TRIPS: 'speedx_trips',
  ACTIVE_TRIP: 'speedx_active_trip',
};