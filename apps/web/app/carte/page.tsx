import type { Metadata } from 'next';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), { ssr: false });

export const metadata: Metadata = {
  title: 'Carte - Alerte Neige',
  description: 'Carte interactive du d\u00e9neigement en temps r\u00e9el.',
};

export default function CartePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-gray-400">Chargement de la carte...</div>}>
      <MapView />
    </Suspense>
  );
}
