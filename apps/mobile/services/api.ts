import Constants from 'expo-constants';

const API_BASE =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new ApiError(res.status, body.error ?? 'Erreur réseau');
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Types ---

export interface CityConfig {
  id: string;
  name: string;
  nameShort: string;
  available: boolean;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

export interface StreetResult {
  id: string;
  city_id: string;
  nom_voie: string;
  type_voie: string | null;
  debut_adresse: number | null;
  fin_adresse: number | null;
  cote: string | null;
  arrondissement: string | null;
  lat: number | null;
  lng: number | null;
  etat: number | null;
  etat_label: string;
  date_deb_planif: string | null;
  date_fin_planif: string | null;
  updated_at: string | null;
}

export interface WatchResult {
  id: string;
  anon_user_id: string;
  segment_id: string;
  city_id: string;
  push_token: string;
  label: string | null;
  notify_on_change: number;
  notify_t60: number;
  notify_t30: number;
  quiet_start: string;
  quiet_end: string;
  created_at: string;
  // Joined fields from street segment
  nom_voie?: string;
  cote?: string | null;
  arrondissement?: string | null;
  etat?: number | null;
  etat_label?: string;
  date_deb_planif?: string | null;
  date_fin_planif?: string | null;
  updated_at?: string | null;
}

export interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number | null;
  notes: string | null;
  distanceM?: number;
}

// --- Cities ---

export async function getCities(): Promise<CityConfig[]> {
  const data = await apiFetch<{ data: CityConfig[] }>('/api/cities');
  return data.data;
}

// --- Streets ---

export async function searchStreets(q: string, cityId = 'montreal', limit = 10): Promise<StreetResult[]> {
  const data = await apiFetch<{ data: StreetResult[] }>(
    `/api/streets/search?q=${encodeURIComponent(q)}&cityId=${encodeURIComponent(cityId)}&limit=${limit}`
  );
  return data.data;
}

export async function getNearbyStreets(lat: number, lng: number, cityId = 'montreal', radius = 300): Promise<StreetResult[]> {
  const data = await apiFetch<{ data: StreetResult[] }>(
    `/api/streets/nearby?lat=${lat}&lng=${lng}&cityId=${encodeURIComponent(cityId)}&radius=${radius}`
  );
  return data.data;
}

export async function getStreet(segmentId: string): Promise<StreetResult> {
  const data = await apiFetch<{ data: StreetResult }>(`/api/streets/${encodeURIComponent(segmentId)}`);
  return data.data;
}

export async function getStreetStatus(segmentId: string): Promise<StreetResult['etat']> {
  const data = await apiFetch<{ data: { etat: number } }>(`/api/streets/${encodeURIComponent(segmentId)}/status`);
  return data.data.etat;
}

// --- Map ---

export interface MapSegment {
  id: string;
  nom_voie: string;
  cote: string | null;
  lat: number;
  lng: number;
  etat: number;
  etat_label: string;
  date_deb_planif: string | null;
  /** Polyline coordinates [[lng, lat], ...] or null for point-only segments */
  geometry: number[][] | null;
}

export async function getMapSegments(
  minLat: number, maxLat: number, minLng: number, maxLng: number,
  cityId = 'montreal', limit = 2000,
): Promise<MapSegment[]> {
  const data = await apiFetch<{ data: MapSegment[] }>(
    `/api/streets/map?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}&cityId=${encodeURIComponent(cityId)}&limit=${limit}`
  );
  return data.data;
}

// --- Watches ---

export async function createWatch(payload: {
  segmentId: string;
  cityId?: string;
  pushToken: string;
  anonUserId: string;
  label?: string;
  config?: {
    notifyOnChange?: boolean;
    notifyT60?: boolean;
    notifyT30?: boolean;
    quietStart?: string;
    quietEnd?: string;
  };
}): Promise<WatchResult> {
  const data = await apiFetch<{ data: WatchResult }>('/api/watches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.data;
}

export async function getWatches(userId: string): Promise<WatchResult[]> {
  const data = await apiFetch<{ data: WatchResult[] }>(`/api/watches?userId=${encodeURIComponent(userId)}`);
  return data.data;
}

export interface WatchConfig {
  notifyOnChange?: boolean;
  notifyT60?: boolean;
  notifyT30?: boolean;
  quietStart?: string;
  quietEnd?: string;
}

export async function updateWatch(
  watchId: string,
  payload: Partial<{ label: string; config: WatchConfig }>
): Promise<WatchResult> {
  const data = await apiFetch<{ data: WatchResult }>(`/api/watches/${encodeURIComponent(watchId)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.data;
}

export async function deleteWatch(watchId: string): Promise<void> {
  await apiFetch<void>(`/api/watches/${encodeURIComponent(watchId)}`, { method: 'DELETE' });
}

// --- Parking ---

export async function getIncentiveParking(lat?: number, lng?: number, radius = 3000): Promise<ParkingSpot[]> {
  const params = lat !== undefined && lng !== undefined
    ? `?lat=${lat}&lng=${lng}&radius=${radius}`
    : '';
  const data = await apiFetch<{ data: ParkingSpot[] }>(`/api/parking/incentive${params}`);
  return data.data;
}

// --- Notifications ---

export async function registerPushToken(pushToken: string, anonUserId: string): Promise<void> {
  await apiFetch<void>('/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ pushToken, anonUserId }),
  });
}

// --- Reports ---

export async function submitReport(payload: {
  segmentId: string;
  anonUserId?: string;
  type?: 'wrong_status' | 'wrong_address' | 'other';
  notes?: string;
}): Promise<{ id: string }> {
  const data = await apiFetch<{ data: { id: string } }>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.data;
}

// --- Health ---

export async function checkHealth(): Promise<{ status: string; lastSync: { synced_at: string } | null }> {
  return apiFetch('/api/health');
}
