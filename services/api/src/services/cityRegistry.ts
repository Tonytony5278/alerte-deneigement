import type { CityConfig } from '../types';
import type { CityAdapter } from './adapters/base';
import { MontrealAdapter }  from './adapters/montreal';
import { LongueuilAdapter } from './adapters/longueuil';
import { QuebecCityAdapter } from './adapters/quebec-city';
import { LavalAdapter }     from './adapters/laval';
import { GatineauAdapter }  from './adapters/gatineau';

export const CITY_CONFIGS: CityConfig[] = [
  {
    id: 'montreal',
    name: 'Montréal',
    nameShort: 'MTL',
    available: true,
    bounds: { minLat: 45.40, maxLat: 45.70, minLng: -73.97, maxLng: -73.47 },
  },
  {
    id: 'longueuil',
    name: 'Longueuil / Brossard',
    nameShort: 'LGL',
    available: true,
    bounds: { minLat: 45.40, maxLat: 45.60, minLng: -73.65, maxLng: -73.40 },
  },
  {
    id: 'laval',
    name: 'Laval',
    nameShort: 'LAV',
    available: true,
    bounds: { minLat: 45.49, maxLat: 45.71, minLng: -73.87, maxLng: -73.52 },
  },
  {
    id: 'quebec',
    name: 'Québec',
    nameShort: 'QC',
    available: true,
    bounds: { minLat: 46.70, maxLat: 46.95, minLng: -71.45, maxLng: -71.05 },
  },
  {
    id: 'gatineau',
    name: 'Gatineau',
    nameShort: 'GAT',
    available: true,
    bounds: { minLat: 45.40, maxLat: 45.60, minLng: -75.95, maxLng: -75.45 },
  },
  {
    id: 'sherbrooke',
    name: 'Sherbrooke',
    nameShort: 'SHE',
    available: false, // Bientôt — no real-time API
    bounds: { minLat: 45.30, maxLat: 45.50, minLng: -71.95, maxLng: -71.75 },
  },
];

export const CITY_ADAPTERS: Record<string, CityAdapter> = {
  montreal:  new MontrealAdapter(),
  longueuil: new LongueuilAdapter(),
  laval:     new LavalAdapter(),
  quebec:    new QuebecCityAdapter(),
  gatineau:  new GatineauAdapter(),
};

export function getCityConfig(cityId: string): CityConfig | undefined {
  return CITY_CONFIGS.find((c) => c.id === cityId);
}
