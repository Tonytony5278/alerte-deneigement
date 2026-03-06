import { fetch } from 'undici';
import { UnifiedStatus, type NormalizedSegment, type SubOperation } from '../../types';
import type { CityAdapter } from './base';

// Layer 1 = line segments, Layer 2 = polygons
// Using layer 1 (lines) for better street-level granularity
const BASE_URL =
  'https://arcgisserver.longueuil.quebec/arcgis/rest/services/Suivi_Deneigement_Diffusion/MapServer/1/query';

// STATUT_* values (observed from live data + Longueuil documentation):
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

// All fields we want from Longueuil
const OUT_FIELDS = [
  'OBJECTID', 'ID_GPS', 'SECTEUR', 'PRIORITE',
  'STATUT_TASSEMENT', 'DT_TASSEMENT',
  'STATUT_TROTTOIR', 'DT_TROTTOIR',
  'STATUT_SOUFFLAGE', 'DT_SOUFFLAGE',
  'STATUT_EPANDAGE', 'DT_EPANDAGE',
  'STATUT_CYCLABLE', 'DT_CYCLABLE',
].join(',');

interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: { paths?: number[][][] };
}

function makeSubOp(
  type: string,
  label: string,
  attrs: Record<string, unknown>,
  statutField: string,
  dateField: string,
): SubOperation | null {
  const statut = typeof attrs[statutField] === 'number' ? (attrs[statutField] as number) : null;
  if (statut === null) return null;
  const dt = attrs[dateField];
  return {
    type,
    label,
    status: statutToUnified(statut),
    date: dt ? new Date(dt as number).toISOString() : null,
  };
}

export class LongueuilAdapter implements CityAdapter {
  cityId = 'longueuil';

  async fetch(): Promise<NormalizedSegment[]> {
    // ArcGIS caps at 2000 records per request — paginate with resultOffset
    const PAGE_SIZE = 2000;
    let offset = 0;
    const allFeatures: ArcGISFeature[] = [];

    while (true) {
      const params = new URLSearchParams({
        where: '1=1',
        outFields: OUT_FIELDS,
        returnGeometry: 'true',
        outSR: '4326',
        f: 'json',
        resultRecordCount: String(PAGE_SIZE),
        resultOffset: String(offset),
      });

      const res = await fetch(`${BASE_URL}?${params}`, {
        headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) throw new Error(`Longueuil ArcGIS responded ${res.status}`);

      const data = (await res.json()) as { features?: ArcGISFeature[]; exceededTransferLimit?: boolean; error?: { message: string } };
      if (data.error) throw new Error(`Longueuil ArcGIS error: ${data.error.message}`);

      const features = data.features ?? [];
      allFeatures.push(...features);

      if (!data.exceededTransferLimit || features.length < PAGE_SIZE) break;
      offset += features.length;
    }

    const segments: NormalizedSegment[] = [];

    for (const f of allFeatures) {
      const attrs = f.attributes;
      const objectId = String(attrs['OBJECTID'] ?? attrs['ID_GPS'] ?? '');
      if (!objectId) continue;

      // Extract midpoint and full path geometry
      let lat: number | null = null;
      let lng: number | null = null;
      let geometry: number[][] | null = null;
      const paths = f.geometry?.paths;
      if (paths && paths.length > 0 && paths[0].length > 0) {
        geometry = paths[0].map(([x, y]) => [x, y]);
        const midIdx = Math.floor(paths[0].length / 2);
        [lng, lat] = paths[0][midIdx] as [number, number];
      }

      const secteur = attrs['SECTEUR'];
      const nomVoie = secteur ? String(secteur) : `Segment Longueuil #${objectId}`;

      // Primary status = tassement (main snow clearing)
      const statutTassement = typeof attrs['STATUT_TASSEMENT'] === 'number' ? attrs['STATUT_TASSEMENT'] as number : null;
      const dtTassement = attrs['DT_TASSEMENT'];

      // Build sub-operations for the 5 operation types
      const subOperations: SubOperation[] = [];
      const ops: Array<[string, string, string, string]> = [
        ['tassement',  'Déneigement',   'STATUT_TASSEMENT', 'DT_TASSEMENT'],
        ['trottoir',   'Trottoir',      'STATUT_TROTTOIR',  'DT_TROTTOIR'],
        ['soufflage',  'Soufflage',     'STATUT_SOUFFLAGE', 'DT_SOUFFLAGE'],
        ['epandage',   'Épandage',      'STATUT_EPANDAGE',  'DT_EPANDAGE'],
        ['cyclable',   'Piste cyclable', 'STATUT_CYCLABLE', 'DT_CYCLABLE'],
      ];
      for (const [type, label, statutField, dateField] of ops) {
        const sub = makeSubOp(type, label, attrs, statutField, dateField);
        if (sub) subOperations.push(sub);
      }

      segments.push({
        externalId: objectId,
        cityId: 'longueuil',
        nomVoie,
        lat,
        lng,
        status: statutToUnified(statutTassement),
        planifStart: dtTassement ? new Date(dtTassement as number).toISOString() : null,
        planifEnd: null,
        geometry,
        subOperations: subOperations.length > 0 ? subOperations : undefined,
      });
    }

    return segments;
  }
}
