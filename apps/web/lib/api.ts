const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.alerteneige.app';

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
  city_name?: string;
  date_deb_planif: string | null;
  date_fin_planif: string | null;
  updated_at: string | null;
  geometry?: [number, number][] | null;
}

export interface GroupedStreetResult {
  nom_voie: string;
  type_voie: string | null;
  city_id: string;
  city_name: string;
  segment_count: number;
  worst_etat: number;
  etat_label: string;
  lat: number;
  lng: number;
  address?: number;
  matched_segment?: {
    id: string;
    cote: string | null;
    debut_adresse: number | null;
    fin_adresse: number | null;
    etat: number;
    etat_label: string;
    towing_status: string;
    towing_label: string | null;
  };
}

export interface StreetDetail {
  nom_voie: string;
  type_voie: string | null;
  city_id: string;
  city_name: string;
  worst_etat: number;
  etat_label: string;
  segment_count: number;
  center: { lat: number; lng: number };
  segments: StreetSegment[];
}

export interface StreetSegment {
  id: string;
  nom_voie: string;
  type_voie: string | null;
  cote: string | null;
  debut_adresse: number | null;
  fin_adresse: number | null;
  lat: number;
  lng: number;
  geometry: [number, number][] | null;
  etat: number;
  etat_label: string;
  date_deb_planif: string | null;
  date_fin_planif: string | null;
  updated_at: string | null;
  towing_status: string;
  towing_label: string | null;
}

export interface CityConfig {
  id: string;
  name: string;
  nameShort: string;
  available: boolean;
}

export const STATUS_META: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: 'Inconnu',              color: '#6B7280', bg: '#F3F4F6' },
  1: { label: 'Normal',               color: '#374151', bg: '#F9FAFB' },
  2: { label: 'Planifi\u00e9',        color: '#EA580C', bg: '#FFF7ED' },
  3: { label: 'En cours',             color: '#DC2626', bg: '#FEF2F2' },
  4: { label: 'Termin\u00e9',         color: '#16A34A', bg: '#F0FDF4' },
  5: { label: 'Interdit',             color: '#CA8A04', bg: '#FEFCE8' },
};

export const STATUS_COLORS: Record<number, string> = {
  0: '#94A3B8',
  1: '#3B82F6',
  2: '#EA580C',
  3: '#DC2626',
  4: '#16A34A',
  5: '#CA8A04',
};

export async function getCities(): Promise<CityConfig[]> {
  const res = await fetch(`${API_BASE}/api/cities`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json() as { data: CityConfig[] };
  return json.data;
}

export async function searchStreetsGrouped(q: string, limit = 10): Promise<{ data: GroupedStreetResult[]; error?: string }> {
  try {
    const res = await fetch(
      `${API_BASE}/api/streets/search-grouped?q=${encodeURIComponent(q)}&limit=${limit}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { data: [], error: `Erreur serveur (${res.status})` };
    const json = await res.json() as { data: GroupedStreetResult[] };
    return { data: json.data };
  } catch {
    return { data: [], error: 'Impossible de joindre le serveur.' };
  }
}

export async function getStreet(id: string): Promise<StreetResult | null> {
  const res = await fetch(`${API_BASE}/api/streets/${encodeURIComponent(id)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json() as { data: StreetResult };
  return json.data;
}

export async function getStreetByName(name: string, cityId: string): Promise<StreetDetail | null> {
  const res = await fetch(
    `${API_BASE}/api/streets/by-name?name=${encodeURIComponent(name)}&cityId=${encodeURIComponent(cityId)}`,
    { cache: 'no-store' }
  );
  if (!res.ok) return null;
  const json = await res.json() as { data: StreetDetail };
  return json.data;
}

export interface MapSegment {
  id: string;
  nom_voie: string;
  cote: string | null;
  lat: number;
  lng: number;
  geometry: [number, number][] | null;
  etat: number;
  etat_label: string;
}

export async function getMapSegments(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  cityId = 'montreal'
): Promise<MapSegment[]> {
  const params = new URLSearchParams({
    minLat: String(bounds.minLat),
    maxLat: String(bounds.maxLat),
    minLng: String(bounds.minLng),
    maxLng: String(bounds.maxLng),
    cityId,
    limit: '3000',
  });
  const res = await fetch(`${API_BASE}/api/streets/map?${params}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json() as { data: MapSegment[] };
  return json.data;
}
