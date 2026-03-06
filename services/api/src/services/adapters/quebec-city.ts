import { fetch } from 'undici';
import { UnifiedStatus, type NormalizedSegment } from '../../types';
import type { CityAdapter } from './base';

// Layer 3 = active operations (polygons: sectors currently being cleared)
const BASE_URL =
  'https://carte.ville.quebec.qc.ca/arcgis/rest/services/CI/Deneigement/MapServer/3/query';

// STATUT field values (from Québec City documentation):
// 1 = in progress (EN COURS)
// 2 = completed (TERMINÉ)
// 0 or null = normal / off-season
function statutToUnified(statut: number | null): UnifiedStatus {
  switch (statut) {
    case 1:  return UnifiedStatus.IN_PROGRESS;
    case 2:  return UnifiedStatus.COMPLETED;
    case 0:  return UnifiedStatus.NORMAL;
    default: return UnifiedStatus.UNKNOWN;
  }
}

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: { rings?: number[][][] };
}

export class QuebecCityAdapter implements CityAdapter {
  cityId = 'quebec';

  async fetch(): Promise<NormalizedSegment[]> {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'OBJECTID,CODE,NOM,STATUT',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'json',
      resultRecordCount: '2000',
    });

    const res = await fetch(`${BASE_URL}?${params}`, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Québec City ArcGIS responded ${res.status}`);

    const data = (await res.json()) as { features?: ArcGISFeature[]; error?: { message: string } };
    if (data.error) throw new Error(`Québec City ArcGIS error: ${data.error.message}`);

    const features = data.features ?? [];
    if (features.length === 0) {
      // Off-season: no active operations — return empty (no sectors to track)
      return [];
    }

    const segments: NormalizedSegment[] = [];

    for (const f of features) {
      const attrs = f.attributes;
      const code = attrs['CODE'] ?? attrs['OBJECTID'];
      if (code == null) continue;

      // Centroid and polygon geometry
      let lat: number | null = null;
      let lng: number | null = null;
      let geometry: number[][] | null = null;
      const rings = f.geometry?.rings;
      if (rings && rings.length > 0 && rings[0].length > 0) {
        const pts = rings[0];
        // Store polygon outline as polyline (closing loop)
        geometry = pts.map(([x, y]) => [x, y]);
        // Compute centroid
        let sumLat = 0;
        let sumLng = 0;
        for (const [x, y] of pts) {
          sumLng += x;
          sumLat += y;
        }
        lng = sumLng / pts.length;
        lat = sumLat / pts.length;
      }

      const nom = attrs['NOM'];
      const statut = typeof attrs['STATUT'] === 'number' ? attrs['STATUT'] : null;

      segments.push({
        externalId: String(code),
        cityId: 'quebec',
        nomVoie: nom ? String(nom) : `Secteur Québec #${code}`,
        lat,
        lng,
        status: statutToUnified(statut),
        planifStart: null,
        planifEnd: null,
        geometry,
      });
    }

    return segments;
  }
}
