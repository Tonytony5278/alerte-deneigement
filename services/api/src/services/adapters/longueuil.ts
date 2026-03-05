import { fetch } from 'undici';
import { UnifiedStatus, type NormalizedSegment } from '../../types';
import type { CityAdapter } from './base';

// Layer 1 = line segments, Layer 2 = polygons
// Using layer 1 (lines) for better street-level granularity
const BASE_URL =
  'https://arcgisserver.longueuil.quebec/arcgis/rest/services/Suivi_Deneigement_Diffusion/MapServer/1/query';

// STATUT_TASSEMENT values (observed from live data + Longueuil documentation):
// 0 = not serviced / off-season (NORMAL)
// 1 = planned (SCHEDULED)
// 2 = in progress (IN_PROGRESS)
// 3 = completed (COMPLETED)
function statutToUnified(statut: number | null): UnifiedStatus {
  switch (statut) {
    case 0:  return UnifiedStatus.NORMAL;
    case 1:  return UnifiedStatus.SCHEDULED;
    case 2:  return UnifiedStatus.IN_PROGRESS;
    case 3:  return UnifiedStatus.COMPLETED;
    default: return UnifiedStatus.UNKNOWN;
  }
}

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: { paths?: number[][][] };
}

export class LongueuilAdapter implements CityAdapter {
  cityId = 'longueuil';

  async fetch(): Promise<NormalizedSegment[]> {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: 'OBJECTID,ID_GPS,STATUT_TASSEMENT,SECTEUR,DT_TASSEMENT',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'json',
      resultRecordCount: '5000',
    });

    const res = await fetch(`${BASE_URL}?${params}`, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Longueuil ArcGIS responded ${res.status}`);

    const data = (await res.json()) as { features?: ArcGISFeature[]; error?: { message: string } };
    if (data.error) throw new Error(`Longueuil ArcGIS error: ${data.error.message}`);

    const features = data.features ?? [];
    const segments: NormalizedSegment[] = [];

    for (const f of features) {
      const attrs = f.attributes;
      const objectId = String(attrs['OBJECTID'] ?? attrs['ID_GPS'] ?? '');
      if (!objectId) continue;

      // Extract first point of first path as representative coordinate
      let lat: number | null = null;
      let lng: number | null = null;
      const paths = f.geometry?.paths;
      if (paths && paths.length > 0 && paths[0].length > 0) {
        const midIdx = Math.floor(paths[0].length / 2);
        [lng, lat] = paths[0][midIdx] as [number, number];
      }

      const secteur = attrs['SECTEUR'];
      const nomVoie = secteur ? String(secteur) : `Segment Longueuil #${objectId}`;
      const statut = typeof attrs['STATUT_TASSEMENT'] === 'number' ? attrs['STATUT_TASSEMENT'] : null;
      const dtTassement = attrs['DT_TASSEMENT'];

      segments.push({
        externalId: objectId,
        cityId: 'longueuil',
        nomVoie,
        lat,
        lng,
        status: statutToUnified(statut),
        planifStart: dtTassement ? new Date(dtTassement as number).toISOString() : null,
        planifEnd: null,
      });
    }

    return segments;
  }
}
