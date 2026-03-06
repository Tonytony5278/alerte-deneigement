import { fetch } from 'undici';
import { UnifiedStatus, type NormalizedSegment, type SubOperation } from '../../types';
import type { CityAdapter } from './base';

// Gatineau Focus511 platform
// Data: GET https://tpgatineau.focus511.com/1216/portal-geojson-165.json
// No authentication required (public static file)
//
// Feature structure (from portal-config-165.json):
//   feature.properties.street_name     — street name
//   feature.properties.layer_hash      — object keyed by layer ID
//     layer_hash[LAYER_KEY]
//       [ROAD_OPERATION]              — Réseau Routier
//         .state                      — state ID
//       [PEDESTRIAN_OPERATION]        — Réseau piétonnier / cyclable
//         .state                      — state ID
//
// State IDs (from portal-config-165.json):
//   operation_228 (Réseau Routier):
//     state_758  → EN COURS   → IN_PROGRESS
//     state_840  → TERMINÉ    → COMPLETED
//     state_1987 → AUCUN PASSAGE → NORMAL
//   operation_248 (Réseau piétonnier/cyclable):
//     state_842  → EN COURS   → IN_PROGRESS
//     state_964  → TERMINÉ    → COMPLETED
//     state_2506 → AUCUN PASSAGE → NORMAL

const GEOJSON_URL = 'https://tpgatineau.focus511.com/1216/portal-geojson-165.json';

const STATE_TO_UNIFIED: Record<string, UnifiedStatus> = {
  // Road
  state_758:  UnifiedStatus.IN_PROGRESS,
  state_840:  UnifiedStatus.COMPLETED,
  state_1987: UnifiedStatus.NORMAL,
  // Pedestrian/bike
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

// The portal config shows layer_list = ['layer_62'] but the text key is 'layer_4180'.
// The GeoJSON features may use either. We try both.
const LAYER_KEYS = ['layer_4180', 'layer_62'];
const ROAD_OPERATION = 'operation_228';
const PEDESTRIAN_OPERATION = 'operation_248';

function findLayerOps(layerHash: Record<string, Record<string, { state?: string }>>): Record<string, { state?: string }> | null {
  for (const key of LAYER_KEYS) {
    if (layerHash[key]) return layerHash[key];
  }
  return null;
}

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
      console.log('[gatineau] No features returned — likely off-season');
      return [];
    }

    const segments: NormalizedSegment[] = [];

    for (const f of features) {
      const id = String(f.id ?? '');
      if (!id) continue;

      const props = f.properties ?? {};
      const streetName = props.street_name ?? `Rue Gatineau #${id}`;
      const layerHash = props.layer_hash ?? {};
      const ops = findLayerOps(layerHash);

      // Road operation (primary)
      const roadOp = ops?.[ROAD_OPERATION];
      const roadStateId = roadOp?.state;
      const roadStatus = roadStateId ? (STATE_TO_UNIFIED[roadStateId] ?? UnifiedStatus.UNKNOWN) : UnifiedStatus.UNKNOWN;

      // Pedestrian/bike operation
      const pedOp = ops?.[PEDESTRIAN_OPERATION];
      const pedStateId = pedOp?.state;
      const pedStatus = pedStateId ? (STATE_TO_UNIFIED[pedStateId] ?? UnifiedStatus.UNKNOWN) : UnifiedStatus.UNKNOWN;

      // Build sub-operations
      const subOperations: SubOperation[] = [];
      if (roadStateId) {
        subOperations.push({
          type: 'routier',
          label: 'Réseau routier',
          status: roadStatus,
          date: null,
        });
      }
      if (pedStateId) {
        subOperations.push({
          type: 'pieton',
          label: 'Piétonnier / cyclable',
          status: pedStatus,
          date: null,
        });
      }

      // Extract centroid and full geometry
      let lat: number | null = null;
      let lng: number | null = null;
      let geometry: number[][] | null = null;

      if (f.geometry?.type === 'LineString') {
        const coords = f.geometry.coordinates as number[][];
        if (coords?.length > 0) {
          geometry = coords.map(([x, y]) => [x, y]);
          const mid = coords[Math.floor(coords.length / 2)];
          [lng, lat] = mid;
        }
      } else if (f.geometry?.type === 'MultiLineString') {
        const lines = f.geometry.coordinates as number[][][];
        if (lines?.length > 0 && lines[0].length > 0) {
          geometry = lines.flat().map(([x, y]) => [x, y]);
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
        status: roadStatus, // Primary = road status
        planifStart: null,
        planifEnd: null,
        geometry,
        subOperations: subOperations.length > 0 ? subOperations : undefined,
      });
    }

    return segments;
  }
}
