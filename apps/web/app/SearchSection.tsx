'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { searchStreets, STATUS_META, type CityConfig, type StreetResult } from '@/lib/api';

const DEFAULT_CITIES: CityConfig[] = [
  { id: 'montreal', name: 'Montréal', nameShort: 'MTL', available: true },
  { id: 'longueuil', name: 'Longueuil / Brossard', nameShort: 'LGL', available: true },
  { id: 'laval', name: 'Laval', nameShort: 'LAV', available: true },
  { id: 'quebec', name: 'Québec', nameShort: 'QC', available: true },
  { id: 'gatineau', name: 'Gatineau', nameShort: 'GAT', available: true },
];

interface Props {
  cities: CityConfig[];
}

export function SearchSection({ cities }: Props) {
  const effectiveCities = cities.length > 0 ? cities : DEFAULT_CITIES;
  const availableCities = effectiveCities.filter((c) => c.available);
  const [cityId, setCityId] = useState(availableCities[0]?.id ?? 'montreal');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StreetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = useCallback((text: string) => {
    setQuery(text);
    setError(null);
    clearTimeout(timerRef.current);
    if (text.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchStreets(text, cityId, 8);
        setResults(result.data);
        setError(result.error ?? null);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [cityId]);

  const handleCityChange = (id: string) => {
    setCityId(id);
    setError(null);
    if (query.length >= 2) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setLoading(true);
        try {
          const result = await searchStreets(query, id, 8);
          setResults(result.data);
          setError(result.error ?? null);
          setSearched(true);
        } finally {
          setLoading(false);
        }
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* City selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {availableCities.map((city) => (
          <button
            key={city.id}
            onClick={() => handleCityChange(city.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              cityId === city.id
                ? 'bg-brand-primary border-brand-primary text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-brand-primary hover:text-brand-primary'
            }`}
          >
            {city.nameShort}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          {loading ? (
            <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Ex: Rue Saint-Denis, Boul. Laurier…"
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent shadow-sm"
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
          {results.map((r) => {
            const meta = STATUS_META[r.etat ?? 0] ?? STATUS_META[0];
            return (
              <li key={r.id}>
                <Link
                  href={`/rue/${r.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-primary">
                      {r.nom_voie}
                      {r.debut_adresse ? ` (${r.debut_adresse}–${r.fin_adresse})` : ''}
                    </p>
                    {r.arrondissement && (
                      <p className="text-xs text-gray-400 mt-0.5">{r.arrondissement}</p>
                    )}
                  </div>
                  <span
                    className="ml-3 flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: meta.color, backgroundColor: meta.bg }}
                  >
                    {meta.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {searched && results.length === 0 && !loading && !error && (
        <p className="text-center text-sm text-gray-400">Aucun résultat pour « {query} ».</p>
      )}
    </div>
  );
}
