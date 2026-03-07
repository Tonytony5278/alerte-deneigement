import type { MetadataRoute } from 'next';

const CITIES = ['montreal', 'longueuil', 'laval', 'quebec', 'gatineau'];

export default function sitemap(): MetadataRoute.Sitemap {
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

  // City-specific carte URLs for SEO
  const cityMapPages: MetadataRoute.Sitemap = CITIES.map((city) => ({
    url: `https://alerteneige.app/carte?city=${city}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...cityMapPages];
}
