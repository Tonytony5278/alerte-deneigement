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
  date_deb_planif: string | null;
  date_fin_planif: string | null;
  updated_at: string | null;
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
  2: { label: 'Planifié',             color: '#EA580C', bg: '#FFF7ED' },
  3: { label: 'En cours — Déplace-toi !', color: '#DC2626', bg: '#FEF2F2' },
  4: { label: 'Terminé',              color: '#16A34A', bg: '#F0FDF4' },
  5: { label: 'Interdit',             color: '#CA8A04', bg: '#FEFCE8' },
};

export async function getCities(): Promise<CityConfig[]> {
  const res = await fetch(`${API_BASE}/api/cities`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const json = await res.json() as { data: CityConfig[] };
  return json.data;
}

export interface SearchResult {
  data: StreetResult[];
  error?: string;
}

export async function searchStreets(q: string, cityId = 'montreal', limit = 8): Promise<SearchResult> {
  try {
    const res = await fetch(
      `${API_BASE}/api/streets/search?q=${encodeURIComponent(q)}&cityId=${encodeURIComponent(cityId)}&limit=${limit}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { data: [], error: `Erreur serveur (${res.status})` };
    const json = await res.json() as { data: StreetResult[] };
    return { data: json.data };
  } catch {
    return { data: [], error: 'Impossible de joindre le serveur. Réessaie dans quelques instants.' };
  }
}

export async function getStreet(id: string): Promise<StreetResult | null> {
  const res = await fetch(`${API_BASE}/api/streets/${encodeURIComponent(id)}`, { next: { revalidate: 120 } });
  if (!res.ok) return null;
  const json = await res.json() as { data: StreetResult };
  return json.data;
}
