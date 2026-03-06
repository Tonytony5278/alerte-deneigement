import type { CityConfig } from '@/services/api';

export const FALLBACK_CITIES: CityConfig[] = [
  { id: 'montreal',   name: 'Montr\u00e9al',            nameShort: 'MTL', available: true,  bounds: { minLat: 45.4, maxLat: 45.7, minLng: -73.97, maxLng: -73.47 } },
  { id: 'longueuil',  name: 'Longueuil / Brossard', nameShort: 'LGU', available: true,  bounds: { minLat: 45.43, maxLat: 45.62, minLng: -73.6, maxLng: -73.38 } },
  { id: 'laval',      name: 'Laval',               nameShort: 'LAV', available: true,  bounds: { minLat: 45.49, maxLat: 45.71, minLng: -73.87, maxLng: -73.52 } },
  { id: 'quebec',     name: 'Qu\u00e9bec',              nameShort: 'QC',  available: true,  bounds: { minLat: 46.7, maxLat: 46.9, minLng: -71.43, maxLng: -71.1 } },
  { id: 'gatineau',   name: 'Gatineau',            nameShort: 'GAT', available: true,  bounds: { minLat: 45.39, maxLat: 45.56, minLng: -75.92, maxLng: -75.62 } },
  { id: 'sherbrooke', name: 'Sherbrooke',          nameShort: 'SHE', available: false, bounds: { minLat: 45.35, maxLat: 45.45, minLng: -71.98, maxLng: -71.83 } },
];
