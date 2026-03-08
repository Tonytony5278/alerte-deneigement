'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { searchStreetsGrouped, STATUS_META, type GroupedStreetResult } from '@/lib/api';

export function SearchSection() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GroupedStreetResult[]>([]);
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
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const result = await searchStreetsGrouped(text);
        setResults(result.data);
        setError(result.error ?? null);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  return (
    <div className="space-y-4">
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
          placeholder="Ex: Fullum, Saint-Denis, Boul. Laurier..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent shadow-sm"
        />
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
          {results.map((r) => {
            const meta = STATUS_META[r.worst_etat ?? 0] ?? STATUS_META[0];
            const addressParam = r.address ? `&address=${r.address}` : '';
            const streetUrl = `/rue/${encodeURIComponent(r.nom_voie)}?city=${r.city_id}${addressParam}`;
            const hasMatch = r.matched_segment;
            return (
              <li key={`${r.nom_voie}-${r.city_id}`}>
                <Link
                  href={streetUrl}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-brand-primary">
                      {r.address && <span className="text-gray-500 font-normal">{r.address} </span>}
                      {r.type_voie ? `${r.type_voie} ` : ''}{r.nom_voie}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {r.city_name}
                      {hasMatch?.cote && <> &middot; c&ocirc;t&eacute; {hasMatch.cote.toLowerCase()}</>}
                    </p>
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
        <p className="text-center text-sm text-gray-400">Aucun r&eacute;sultat pour &laquo; {query} &raquo;.</p>
      )}
    </div>
  );
}
