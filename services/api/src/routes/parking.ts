import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import NodeCache from 'node-cache';
import { fetch } from 'undici';

// Cache incentive parking for 1 hour (rarely changes)
const parkingCache = new NodeCache({ stdTTL: 3600 });

// Montreal open data: stationnements incitatifs
// Dataset: https://donnees.montreal.ca/dataset/stationnements-incitatifs
const PARKING_API_URL =
  'https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=b38a38db-89b8-48aa-bc66-72a20c5e4ef2&limit=100';

interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number | null;
  notes: string | null;
  distanceM?: number;
}

const NearbyQuerySchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().int().min(100).max(10_000).default(3000),
});

export async function parkingRoutes(app: FastifyInstance) {
  // GET /api/parking/incentive?lat=&lng=&radius=
  app.get('/incentive', async (req, reply) => {
    const parsed = NearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query' });
    }

    const { lat, lng, radius } = parsed.data;

    let spots = parkingCache.get<ParkingSpot[]>('incentive');

    if (!spots) {
      try {
        const res = await fetch(PARKING_API_URL, {
          signal: AbortSignal.timeout(10_000),
        });

        if (res.ok) {
          const json = (await res.json()) as {
            result?: { records?: Array<Record<string, unknown>> };
          };
          const records = json?.result?.records ?? [];

          spots = records
            .map((r) => ({
              id: String(r._id ?? r.id ?? ''),
              name: String(r.NOM ?? r.nom ?? r.NAME ?? ''),
              address: String(r.ADRESSE ?? r.adresse ?? ''),
              lat: parseFloat(String(r.LAT ?? r.lat ?? r.LATITUDE ?? '0')) || 0,
              lng: parseFloat(String(r.LNG ?? r.lng ?? r.LONGITUDE ?? '0')) || 0,
              capacity: r.CAPACITE ? parseInt(String(r.CAPACITE), 10) : null,
              notes: r.NOTES ? String(r.NOTES) : null,
            }))
            .filter((s) => s.lat !== 0 && s.lng !== 0);

          parkingCache.set('incentive', spots);
        } else {
          spots = getFallbackParking();
          parkingCache.set('incentive', spots, 300); // shorter TTL for fallback
        }
      } catch {
        spots = getFallbackParking();
      }
    }

    // Filter by proximity if lat/lng provided
    let result = spots;
    if (lat !== undefined && lng !== undefined) {
      result = spots
        .map((spot) => ({
          ...spot,
          distanceM: haversineM(lat, lng, spot.lat, spot.lng),
        }))
        .filter((spot) => spot.distanceM <= radius)
        .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0));
    }

    return reply.send({ data: result, total: result.length });
  });
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Hardcoded fallback for known Montreal incentive parking locations
function getFallbackParking(): ParkingSpot[] {
  return [
    { id: 'cremazie', name: 'Stationnement Métro Crémazie', address: '400 Rue Jarry E', lat: 45.538, lng: -73.657, capacity: 200, notes: 'Gratuit pendant les opérations de déneigement' },
    { id: 'jean-talon', name: 'Stationnement Métro Jean-Talon', address: '900 Rue Jean-Talon E', lat: 45.534, lng: -73.624, capacity: 350, notes: 'Gratuit pendant les opérations' },
    { id: 'langelier', name: 'Stationnement Métro Langelier', address: '5350 Boul. des Grandes-Prairies', lat: 45.578, lng: -73.568, capacity: 300, notes: null },
    { id: 'radisson', name: 'Stationnement Métro Radisson', address: '4380 Boul. Lacordaire', lat: 45.573, lng: -73.535, capacity: 250, notes: null },
    { id: 'fabre', name: 'Stationnement Métro Fabre', address: '3955 Rue Fabre', lat: 45.552, lng: -73.585, capacity: 150, notes: null },
    { id: 'viau', name: 'Stationnement Métro Viau', address: '4600 Boul. Pie-IX', lat: 45.556, lng: -73.567, capacity: 200, notes: null },
    { id: 'snowdon', name: 'Stationnement Métro Snowdon', address: '5145 Chemin de la Côte-des-Neiges', lat: 45.493, lng: -73.629, capacity: 100, notes: null },
    { id: 'namur', name: 'Stationnement Métro Namur', address: '7780 Boul. Cavendish', lat: 45.488, lng: -73.655, capacity: 180, notes: null },
  ];
}
