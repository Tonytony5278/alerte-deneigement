'use client';

import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';

const STATUS_COLORS: Record<number, string> = {
  0: '#9CA3AF',
  1: '#6B7280',
  2: '#EA580C',
  3: '#DC2626',
  4: '#16A34A',
  5: '#CA8A04',
};

interface Segment {
  id: string;
  nom_voie: string;
  etat: number;
  etat_label?: string;
  geometry: [number, number][] | null;
  cote?: string | null;
  debut_adresse?: number | null;
  fin_adresse?: number | null;
}

interface Props {
  segments: Segment[];
  center: [number, number];
  zoom?: number;
  height?: string;
}

export default function StreetMap({ segments, center, zoom = 15, height = '400px' }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      className="rounded-xl z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
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
                {seg.debut_adresse ? (
                  <div className="text-gray-600">{seg.debut_adresse}&ndash;{seg.fin_adresse}</div>
                ) : null}
                {seg.etat_label && <div style={{ color }}>{seg.etat_label}</div>}
              </div>
            </Popup>
          </Polyline>
        );
      })}
    </MapContainer>
  );
}
