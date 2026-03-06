import { fetch } from 'undici';
import { UnifiedStatus, type NormalizedSegment } from '../../types';
import type { CityAdapter } from './base';

// Quebec City ArcGIS layers:
//   Layer 3  = "Opération déneigement en cours" (polygons, only during active ops)
//   Layers 7/8/9 = "Niveau 1/2/3" road zones (polygons, permanent inventory)
//
// Strategy:
//   1. Always fetch road zones from layers 7+8+9 (12,000+ zones, always available)
//   2. Fetch active operations from layer 3 (0 off-season, populated during ops)
//   3. Overlay: zones with active ops get IN_PROGRESS/COMPLETED status

const SERVICE_BASE =
  'https://carte.ville.quebec.qc.ca/arcgis/rest/services/CI/Deneigement/MapServer';

// Road zone layers (permanent inventory)
const ROAD_ZONE_LAYERS = [7, 8, 9]; // Niveau 1, 2, 3

// Active operation layer
const ACTIVE_OPS_LAYER = 3;

// STATUT on layer 3 is a string:
function operationStatutToUnified(statut: string | null | undefined): UnifiedStatus {
  if (!statut) return UnifiedStatus.UNKNOWN;
  const s = statut.toUpperCase();
  if (s.includes('COURS')) return UnifiedStatus.IN_PROGRESS;
  if (s.includes('TERMIN')) return UnifiedStatus.COMPLETED;
  return UnifiedStatus.UNKNOWN;
}

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
}

interface ArcGISResponse {
  features?: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  error?: { message: string };
}

async function queryLayer(layer: number, fields: string, pageSize = 2000): Promise<ArcGISFeature[]> {
  const allFeatures: ArcGISFeature[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: fields,
      returnGeometry: 'true',
      outSR: '4326',
      f: 'json',
      resultRecordCount: String(pageSize),
      resultOffset: String(offset),
    });

    const res = await fetch(`${SERVICE_BASE}/${layer}/query?${params}`, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Québec City layer ${layer} responded ${res.status}`);

    const data = (await res.json()) as ArcGISResponse;
    if (data.error) throw new Error(`Québec City layer ${layer} error: ${data.error.message}`);

    const features = data.features ?? [];
    allFeatures.push(...features);

    if (!data.exceededTransferLimit || features.length < pageSize) break;
    offset += features.length;
  }

  return allFeatures;
}

function extractGeometry(rings: number[][][] | undefined): { lat: number | null; lng: number | null; geometry: number[][] | null } {
  if (!rings || rings.length === 0 || rings[0].length === 0) {
    return { lat: null, lng: null, geometry: null };
  }
  const pts = rings[0];
  const geometry = pts.map(([x, y]) => [x, y]);
  let sumLat = 0;
  let sumLng = 0;
  for (const [x, y] of pts) {
    sumLng += x;
    sumLat += y;
  }
  return {
    lat: sumLat / pts.length,
    lng: sumLng / pts.length,
    geometry,
  };
}

export class QuebecCityAdapter implements CityAdapter {
  cityId = 'quebec';

  async fetch(): Promise<NormalizedSegment[]> {
    // Fetch road zones and active ops in parallel
    const [zoneFeatures, opsFeatures] = await Promise.all([
      Promise.all(
        ROAD_ZONE_LAYERS.map((layer) =>
          queryLayer(layer, 'OBJECTID,ZONE_CODE,DESCRIPTION_SERVICE,DENEIGE,SERVICE_CODE')
        )
      ).then((arrays) => arrays.flat()),
      queryLayer(ACTIVE_OPS_LAYER, 'OBJECTID,CODE,NOM,STATUT').catch(() => [] as ArcGISFeature[]),
    ]);

    // Build active ops lookup by CODE (zone code)
    const activeOps = new Map<string, UnifiedStatus>();
    for (const f of opsFeatures) {
      const code = f.attributes['CODE'];
      if (code) {
        const statut = f.attributes['STATUT'] as string | null;
        activeOps.set(String(code), operationStatutToUnified(statut));
      }
    }

    const segments: NormalizedSegment[] = [];

    for (const f of zoneFeatures) {
      const attrs = f.attributes;
      const objectId = attrs['OBJECTID'];
      if (objectId == null) continue;

      const zoneCode = attrs['ZONE_CODE'] ? String(attrs['ZONE_CODE']) : null;
      const serviceDesc = attrs['DESCRIPTION_SERVICE'] ? String(attrs['DESCRIPTION_SERVICE']) : null;
      const deneige = attrs['DENEIGE'] ? String(attrs['DENEIGE']) : null;
      const serviceCode = attrs['SERVICE_CODE'] ? String(attrs['SERVICE_CODE']) : null;

      // Determine status: active op overlay > base zone status
      let status: UnifiedStatus;
      if (zoneCode && activeOps.has(zoneCode)) {
        status = activeOps.get(zoneCode)!;
      } else if (deneige?.toUpperCase() === 'OUI') {
        status = UnifiedStatus.NORMAL; // Zone is serviced but no active op
      } else {
        status = UnifiedStatus.UNKNOWN;
      }

      const { lat, lng, geometry } = extractGeometry(f.geometry?.rings);

      // Build a descriptive name from service info
      let nomVoie = `Zone ${zoneCode ?? objectId}`;
      if (serviceDesc) {
        // Shorten: "Chaussée, Niveau 1, Transporté, Délai P1 : ..." → "Chaussée Niv.1"
        const match = serviceDesc.match(/Niveau\s*(\d)/i);
        if (match) {
          nomVoie = `Zone ${zoneCode ?? objectId} — Niv.${match[1]}`;
        }
      }

      segments.push({
        externalId: String(objectId),
        cityId: 'quebec',
        nomVoie,
        lat,
        lng,
        status,
        planifStart: null,
        planifEnd: null,
        geometry,
      });
    }

    return segments;
  }
}
