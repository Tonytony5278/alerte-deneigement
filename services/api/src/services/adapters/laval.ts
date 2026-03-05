import { fetch } from 'undici';
import { UnifiedStatus, type NormalizedSegment } from '../../types';
import type { CityAdapter } from './base';

// Laval Info-Stationnement API
// Endpoint: GET https://infostationnement.laval.ca/api/v2/roadsides
// Note: proximity-based endpoint, not a global dump.
// Strategy: tile Laval with a grid of requests at 2km radius.
// Off-season returns HTTP 500 — handle gracefully.

const BASE_URL = 'https://infostationnement.laval.ca/api/v2/roadsides';

// Laval bounding box (approximate)
const LAVAL_BOUNDS = { minLat: 45.49, maxLat: 45.71, minLng: -73.87, maxLng: -73.52 };
const GRID_STEP_DEG = 0.025; // ~2.5km steps
const RADIUS_M = 2000;

// Laval status string → UnifiedStatus
// Based on observed field naming from AngularJS app:
function statusToUnified(status: string | undefined): UnifiedStatus {
  if (!status) return UnifiedStatus.UNKNOWN;
  const s = status.toUpperCase();
  if (s.includes('COURS') || s === 'INPROGRESS') return UnifiedStatus.IN_PROGRESS;
  if (s.includes('TERMIN') || s === 'COMPLETED') return UnifiedStatus.COMPLETED;
  if (s.includes('PLANIF') || s === 'SCHEDULED') return UnifiedStatus.SCHEDULED;
  if (s.includes('AUCUN') || s === 'NORMAL' || s === 'NONE') return UnifiedStatus.NORMAL;
  return UnifiedStatus.UNKNOWN;
}

interface LavalRoadside {
  id?: number | string;
  formattedAddress?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  status?: string;
  etat?: string;
  startDate?: string;
  endDate?: string;
}

export class LavalAdapter implements CityAdapter {
  cityId = 'laval';

  async fetch(): Promise<NormalizedSegment[]> {
    const seen = new Set<string>();
    const segments: NormalizedSegment[] = [];

    // Grid scan over Laval
    for (
      let lat = LAVAL_BOUNDS.minLat;
      lat <= LAVAL_BOUNDS.maxLat;
      lat += GRID_STEP_DEG
    ) {
      for (
        let lng = LAVAL_BOUNDS.minLng;
        lng <= LAVAL_BOUNDS.maxLng;
        lng += GRID_STEP_DEG
      ) {
        try {
          const params = new URLSearchParams({
            Longitude: lng.toFixed(6),
            Latitude: lat.toFixed(6),
            Radius: String(RADIUS_M),
          });

          const res = await fetch(`${BASE_URL}?${params}`, {
            headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
            signal: AbortSignal.timeout(10_000),
          });

          if (!res.ok) {
            // 500 = off-season, skip silently
            if (res.status !== 500) {
              console.warn(`[laval] tile ${lat.toFixed(3)},${lng.toFixed(3)} responded ${res.status}`);
            }
            continue;
          }

          const data = (await res.json()) as LavalRoadside[] | { data?: LavalRoadside[] };
          const items: LavalRoadside[] = Array.isArray(data) ? data : (data.data ?? []);

          for (const item of items) {
            const id = String(item.id ?? '');
            if (!id || seen.has(id)) continue;
            seen.add(id);

            const segLat = item.latitude ?? item.lat ?? null;
            const segLng = item.longitude ?? item.lng ?? null;
            const nomVoie = item.formattedAddress ?? item.address ?? `Rue Laval #${id}`;
            const status = item.status ?? item.etat;

            segments.push({
              externalId: id,
              cityId: 'laval',
              nomVoie,
              lat: segLat ?? null,
              lng: segLng ?? null,
              status: statusToUnified(status),
              planifStart: item.startDate ?? null,
              planifEnd: item.endDate ?? null,
            });
          }
        } catch {
          // Network error on individual tile — skip
        }
      }
    }

    if (segments.length === 0) {
      console.log('[laval] No data returned — likely off-season');
    }

    return segments;
  }
}
