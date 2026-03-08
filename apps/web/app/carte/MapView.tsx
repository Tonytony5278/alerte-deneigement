'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, useMapEvents, useMap, CircleMarker } from 'react-leaflet';
import { useSearchParams } from 'next/navigation';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { STATUS_META, STATUS_COLORS } from '@/lib/api';

// Bounding box covering all served regions (MTL, LGL, LAV, QC, GAT) with padding
const QUEBEC_BOUNDS: LatLngBoundsExpression = [
  [44.8, -76.5], // SW corner (south of Gatineau, west)
  [47.5, -70.5], // NE corner (north of Québec City, east)
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.alerteneige.app';

const CITY_CENTERS: Record<string, [number, number]> = {
  montreal: [45.5017, -73.5673],
  longueuil: [45.5312, -73.5183],
  laval: [45.6066, -73.7124],
  quebec: [46.8139, -71.2080],
  gatineau: [45.4765, -75.7013],
};

const CITY_LABELS: Record<string, string> = {
  montreal: 'MTL',
  longueuil: 'LGL',
  laval: 'LAV',
  quebec: 'QC',
  gatineau: 'GAT',
};

interface MapSeg {
  id: string;
  nom_voie: string;
  cote: string | null;
  etat: number;
  etat_label: string;
  geometry: [number, number][] | null;
  city_id?: string;
}

function SegmentLayer({ segments, cityId }: { segments: MapSeg[]; cityId: string }) {
  return (
    <>
      {segments.map((seg) => {
        if (!seg.geometry || seg.geometry.length < 2) return null;
        const positions: LatLngExpression[] = seg.geometry.map(([lng, lat]) => [lat, lng]);
        const color = STATUS_COLORS[seg.etat ?? 0] ?? '#9CA3AF';
        const segCity = seg.city_id ?? cityId;
        return (
          <Polyline
            key={seg.id}
            positions={positions}
            pathOptions={{ color, weight: 5, opacity: 0.85 }}
          >
            <Popup>
              <div className="text-sm">
                <strong>{seg.nom_voie}</strong>
                {seg.cote && <span className="text-gray-500"> ({seg.cote})</span>}
                <div style={{ color }}>{seg.etat_label}</div>
                <a
                  href={`/rue/${encodeURIComponent(seg.nom_voie)}?city=${segCity}`}
                  className="text-blue-600 hover:underline text-xs mt-1 block"
                >
                  Voir les d&eacute;tails &rarr;
                </a>
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const map = useMapEvents({
    moveend: () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        onBoundsChange({
          minLat: b.getSouth(),
          maxLat: b.getNorth(),
          minLng: b.getWest(),
          maxLng: b.getEast(),
        });
      }, 300);
    },
  });

  // Initial load (no debounce)
  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevRef = useRef<string>('');
  useEffect(() => {
    const key = `${center[0]},${center[1]},${zoom}`;
    if (key !== prevRef.current) {
      prevRef.current = key;
      map.flyTo(center, zoom);
    }
  }, [map, center, zoom]);
  return null;
}

function LocateButton({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleLocate() {
    if (!navigator.geolocation) {
      setError('Géolocalisation non supportée');
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onLocate(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        setError('Position refusée');
        setTimeout(() => setError(null), 3000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleLocate}
        disabled={locating}
        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
        title="Ma position"
        aria-label="Trouver ma position"
      >
        {locating ? (
          <svg className="w-4 h-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m0 16v2m10-10h-2M4 12H2" />
          </svg>
        )}
      </button>
      {error && (
        <span className="absolute top-full left-0 mt-1 whitespace-nowrap text-xs text-red-500 bg-white rounded px-1.5 py-0.5 shadow-sm border border-red-100">
          {error}
        </span>
      )}
    </div>
  );
}

function MobileLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        title="Légende"
        aria-label="Afficher la légende des couleurs"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3 min-w-[140px]">
            <p className="text-xs font-semibold text-gray-500 mb-2">Légende</p>
            {[1, 2, 3, 4].map((etat) => {
              const m = STATUS_META[etat];
              return (
                <div key={etat} className="flex items-center gap-2 py-0.5">
                  <span className="w-5 h-1.5 rounded flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[etat] }} />
                  <span className="text-gray-700 text-xs">{m.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface SearchResult {
  nom_voie: string;
  type_voie: string | null;
  city_id: string;
  city_name: string;
  worst_etat: number;
  etat_label: string;
  lat: number;
  lng: number;
}

export default function MapView() {
  const searchParams = useSearchParams();
  const streetParam = searchParams.get('street');
  const cityParam = searchParams.get('city') ?? 'montreal';

  const [segments, setSegments] = useState<MapSeg[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityId, setCityId] = useState(cityParam);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const fetchRef = useRef<AbortController>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedStreet, setSelectedStreet] = useState<string | null>(streetParam);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const searchAbortRef = useRef<AbortController>();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const isStreetMode = !!streetParam || !!selectedStreet;

  const initialCenter = CITY_CENTERS[cityParam] ?? CITY_CENTERS.montreal;

  // If a street is specified, fetch and highlight it
  useEffect(() => {
    if (!streetParam) return;
    fetch(`${API_BASE}/api/streets/by-name?name=${encodeURIComponent(streetParam)}&cityId=${encodeURIComponent(cityParam)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.segments) {
          setSegments(json.data.segments);
          if (json.data.center) {
            setFlyTarget({ center: [json.data.center.lat, json.data.center.lng], zoom: 15 });
          }
        }
      })
      .catch(() => {});
  }, [streetParam, cityParam]);

  const fetchMapSegments = useCallback(
    async (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
      if (isStreetMode) return;

      fetchRef.current?.abort();
      const ctrl = new AbortController();
      fetchRef.current = ctrl;
      setLoading(true);

      try {
        const params = new URLSearchParams({
          minLat: String(bounds.minLat),
          maxLat: String(bounds.maxLat),
          minLng: String(bounds.minLng),
          maxLng: String(bounds.maxLng),
          cityId,
          limit: '3000',
        });
        const res = await fetch(`${API_BASE}/api/streets/map?${params}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        setSegments(json.data ?? []);
      } catch {
        // abort or network error
      } finally {
        setLoading(false);
      }
    },
    [cityId, isStreetMode]
  );

  function handleSearch(text: string) {
    setSearchQuery(text);
    clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();
    if (text.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      try {
        const res = await fetch(`${API_BASE}/api/streets/search-grouped?q=${encodeURIComponent(text)}&limit=5`, { signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        setSearchResults(json.data ?? []);
        setSearchOpen(true);
      } catch { /* aborted or network error */ }
    }, 150);
  }

  function selectSearchResult(r: SearchResult) {
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
    setCityId(r.city_id);
    setSelectedStreet(r.nom_voie);
    setFlyTarget({ center: [r.lat, r.lng], zoom: 15 });

    // Load that street's segments onto the map
    fetch(`${API_BASE}/api/streets/by-name?name=${encodeURIComponent(r.nom_voie)}&cityId=${encodeURIComponent(r.city_id)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.segments) {
          setSegments(json.data.segments);
        }
      })
      .catch(() => {});
  }

  function clearSearch() {
    setSelectedStreet(null);
    setSegments([]);
    // Trigger a viewport reload by fetching current map bounds
    setFlyTarget({ center: CITY_CENTERS[cityId] ?? CITY_CENTERS.montreal, zoom: 13 });
  }

  function handleLocate(lat: number, lng: number) {
    setUserLocation([lat, lng]);
    setSelectedStreet(null);
    setFlyTarget({ center: [lat, lng], zoom: 16 });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="px-3 py-2 bg-white border-b border-gray-100 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          {selectedStreet ? (
            <div className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary pl-3 pr-1 py-1 rounded-lg text-sm font-medium">
              <span className="truncate max-w-[200px]">{selectedStreet}</span>
              <button
                onClick={clearSearch}
                className="p-0.5 hover:bg-brand-primary/20 rounded"
                title="Effacer"
                aria-label="Effacer la recherche"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                placeholder="Chercher une rue..."
                aria-label="Rechercher une rue"
                className="w-44 sm:w-56 pl-3 pr-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              />
              {searchOpen && searchResults.length > 0 && (
                <ul className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  {searchResults.map((r) => {
                    const meta = STATUS_META[r.worst_etat ?? 0] ?? STATUS_META[0];
                    return (
                      <li key={`${r.nom_voie}-${r.city_id}`}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectSearchResult(r)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {r.type_voie ? `${r.type_voie} ` : ''}{r.nom_voie}
                            </p>
                            <p className="text-xs text-gray-400">{r.city_name}</p>
                          </div>
                          <span
                            className="ml-2 flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: meta.color, backgroundColor: meta.bg }}
                          >
                            {meta.label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* City pills */}
          <div className="flex items-center gap-1.5">
            {Object.entries(CITY_CENTERS).map(([id, center]) => (
              <button
                key={id}
                onClick={() => {
                  setCityId(id);
                  setSelectedStreet(null);
                  setFlyTarget({ center, zoom: 13 });
                }}
                className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                  cityId === id
                    ? 'bg-brand-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CITY_LABELS[id] ?? id}
              </button>
            ))}
          </div>

          {/* Locate me */}
          <LocateButton onLocate={handleLocate} />

          {loading && <span className="text-gray-400 ml-1">...</span>}

          {/* Desktop legend */}
          <div className="ml-auto hidden sm:flex items-center gap-3">
            {[1, 2, 3, 4].map((etat) => {
              const m = STATUS_META[etat];
              return (
                <div key={etat} className="flex items-center gap-1">
                  <span className="w-4 h-1.5 rounded" style={{ backgroundColor: STATUS_COLORS[etat] }} />
                  <span className="text-gray-500 text-xs">{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Mobile legend */}
          <div className="ml-auto sm:ml-0">
            <MobileLegend />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={initialCenter}
          zoom={isStreetMode ? 15 : 13}
          minZoom={10}
          maxBounds={QUEBEC_BOUNDS}
          maxBoundsViscosity={1.0}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onBoundsChange={fetchMapSegments} />
          {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}
          <SegmentLayer segments={segments} cityId={cityId} />
          {userLocation && (
            <CircleMarker
              center={userLocation}
              radius={8}
              pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.9, weight: 3 }}
            >
              <Popup>
                <span className="text-sm font-medium">Votre position</span>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
