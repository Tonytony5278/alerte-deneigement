'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet';
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
}

function SegmentLayer({ segments }: { segments: MapSeg[] }) {
  return (
    <>
      {segments.map((seg) => {
        if (!seg.geometry || seg.geometry.length < 2) return null;
        const positions: LatLngExpression[] = seg.geometry.map(([lng, lat]) => [lat, lng]);
        const color = STATUS_COLORS[seg.etat ?? 0] ?? '#9CA3AF';
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
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </>
  );
}

function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({
        minLat: b.getSouth(),
        maxLat: b.getNorth(),
        minLng: b.getWest(),
        maxLng: b.getEast(),
      });
    },
  });

  // Initial load
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

export default function MapView() {
  const searchParams = useSearchParams();
  const streetParam = searchParams.get('street');
  const cityParam = searchParams.get('city') ?? 'montreal';

  const [segments, setSegments] = useState<MapSeg[]>([]);
  const [loading, setLoading] = useState(false);
  const [cityId, setCityId] = useState(cityParam);
  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);
  const fetchRef = useRef<AbortController>();
  const isStreetMode = !!streetParam;

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

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 text-sm flex-wrap">
        <span className="text-gray-500 font-medium">Ville:</span>
        {Object.entries(CITY_CENTERS).map(([id, center]) => (
          <button
            key={id}
            onClick={() => {
              setCityId(id);
              setFlyTarget({ center, zoom: 13 });
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              cityId === id
                ? 'bg-brand-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {CITY_LABELS[id] ?? id}
          </button>
        ))}

        {loading && <span className="text-gray-400 ml-2">Chargement...</span>}

        {/* Legend */}
        <div className="ml-auto flex items-center gap-3">
          {[1, 2, 3, 4].map((etat) => {
            const m = STATUS_META[etat];
            return (
              <div key={etat} className="flex items-center gap-1">
                <span className="w-4 h-1.5 rounded" style={{ backgroundColor: STATUS_COLORS[etat] }} />
                <span className="text-gray-500 text-xs hidden sm:inline">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer
          center={initialCenter}
          zoom={isStreetMode ? 15 : 13}
          minZoom={10}
          maxBounds={QUEBEC_BOUNDS}
          maxBoundsViscosity={0.8}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onBoundsChange={fetchMapSegments} />
          {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}
          <SegmentLayer segments={segments} />
        </MapContainer>
      </div>
    </div>
  );
}
