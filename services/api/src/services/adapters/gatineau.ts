import { fetch } from 'undici';
import { UnifiedStatus, type NormalizedSegment } from '../../types';
import type { CityAdapter } from './base';

// Gatineau Focus511 platform
// Data: GET https://tpgatineau.focus511.com/1216/portal-geojson-165.json
// No authentication required (public static file)
//
// Feature structure (from reverse-engineering pfp_script_desktop.js):
//   feature.properties.street_name     — street name
//   feature.properties.layer_hash      — object keyed by layer ID
//     layer_hash['layer_4180']          — Déneigement layer
//       ['operation_228']               — Réseau Routier
//         .state                        — state ID
//       ['operation_248']               — Réseau piétonnier/cyclable
//         .state                        — state ID
//
// State IDs (from portal-config-165.json texts):
//   state_758 / state_842 → EN COURS  → IN_PROGRESS
//   state_840 / state_964 → TERMINÉ   → COMPLETED
//   state_1987 / state_2506 → AUCUN PASSAGE → NORMAL

const GEOJSON_URL = 'https://tpgatineau.focus511.com/1216/portal-geojson-165.json';

const STATE_TO_UNIFIED: Record<string, UnifiedStatus> = {
  state_758:  UnifiedStatus.IN_PROGRESS,
  state_840:  UnifiedStatus.COMPLETED,
  state_1987: UnifiedStatus.NORMAL,
  state_842:  UnifiedStatus.IN_PROGRESS,
  state_964:  UnifiedStatus.COMPLETED,
  state_2506: UnifiedStatus.NORMAL,
};

interface GatineauFeature {
  id?: string | number;
  properties?: {
    street_name?: string;
    layer_hash?: Record<string, Record<string, { state?: string; level_of_service?: string }>>;
  };
  geometry?: {
    type: string;
    coordinates?: unknown;
  };
}

interface GeoJSON {
  type: string;
  features: GatineauFeature[];
  properties?: { generation_date_gmt?: string };
}

const ROAD_LAYER = 'layer_4180';
const ROAD_OPERATION = 'operation_228';

export class GatineauAdapter implements CityAdapter {
  cityId = 'gatineau';

  async fetch(): Promise<NormalizedSegment[]> {
    const res = await fetch(GEOJSON_URL, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Gatineau Focus511 responded ${res.status}`);

    const data = (await res.json()) as GeoJSON;
    const features = data.features ?? [];

    if (features.length === 0) {
      console.log('[gatineau] No features returned — likely off-season (is_enabled=false)');
      return [];
    }

    const segments: NormalizedSegment[] = [];

    for (const f of features) {
      const id = String(f.id ?? '');
      if (!id) continue;

      const props = f.properties ?? {};
      const streetName = props.street_name ?? `Rue Gatineau #${id}`;
      const layerHash = props.layer_hash ?? {};
      const operationHash = layerHash[ROAD_LAYER]?.[ROAD_OPERATION];
      const stateId = operationHash?.state;
      const status = stateId ? (STATE_TO_UNIFIED[stateId] ?? UnifiedStatus.UNKNOWN) : UnifiedStatus.UNKNOWN;

      // Extract centroid from geometry
      let lat: number | null = null;
      let lng: number | null = null;

      if (f.geometry?.type === 'LineString') {
        const coords = f.geometry.coordinates as number[][];
        if (coords?.length > 0) {
          const mid = coords[Math.floor(coords.length / 2)];
          [lng, lat] = mid;
        }
      } else if (f.geometry?.type === 'MultiLineString') {
        const lines = f.geometry.coordinates as number[][][];
        if (lines?.length > 0 && lines[0].length > 0) {
          const mid = lines[0][Math.floor(lines[0].length / 2)];
          [lng, lat] = mid;
        }
      } else if (f.geometry?.type === 'Point') {
        const coords = f.geometry.coordinates as number[];
        [lng, lat] = coords;
      }

      segments.push({
        externalId: id,
        cityId: 'gatineau',
        nomVoie: streetName,
        lat,
        lng,
        status,
        planifStart: null,
        planifEnd: null,
      });
    }

    return segments;
  }
}
