import type { MetadataRoute } from 'next';

// Force dynamic rendering so it fetches street URLs at request time
export const dynamic = 'force-dynamic';
export const revalidate = 86400;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.alerteneige.app';
const CITIES = ['montreal', 'longueuil', 'laval', 'quebec', 'gatineau'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: 'https://alerteneige.app',
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://alerteneige.app/carte',
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
  ];

  const cityMapPages: MetadataRoute.Sitemap = CITIES.map((city) => ({
    url: `https://alerteneige.app/carte?city=${city}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.7,
  }));

  // Fetch all unique street names for dynamic sitemap
  let streetPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/api/streets/sitemap-urls`, {
      next: { revalidate: 86400 }, // revalidate daily
    });
    if (res.ok) {
      const json = await res.json() as { data: { nom_voie: string; city_id: string }[] };
      streetPages = json.data.map((s) => ({
        url: `https://alerteneige.app/rue/${encodeURIComponent(s.nom_voie)}?city=${s.city_id}`,
        lastModified: now,
        changeFrequency: 'hourly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // API unavailable — serve sitemap without street pages
  }

  return [...staticPages, ...cityMapPages, ...streetPages];
}
