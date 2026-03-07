import type { FastifyInstance } from 'fastify';
import { getDb } from '../db';
import { UNIFIED_STATUS_LABELS, UnifiedStatus } from '../types';
import { z } from 'zod';

function etatLabel(etat: number | null): string {
  if (etat === null) return 'Inconnu';
  return UNIFIED_STATUS_LABELS[etat as UnifiedStatus] ?? 'Inconnu';
}

type TowingStatus = 'active' | 'imminent' | 'none';

interface TowingInfo {
  towing_status: TowingStatus;
  towing_label: string | null;
}

function computeTowing(etat: number | null, dateDebPlanif: string | null): TowingInfo {
  if (etat === UnifiedStatus.IN_PROGRESS || etat === UnifiedStatus.RESTRICTED) {
    return { towing_status: 'active', towing_label: 'Remorquage actif — déplace ton auto !' };
  }
  if (etat === UnifiedStatus.SCHEDULED && dateDebPlanif) {
    const planifTime = new Date(dateDebPlanif).getTime();
    const now = Date.now();
    if (now >= planifTime) {
      return { towing_status: 'active', towing_label: 'Remorquage actif — déplace ton auto !' };
    }
    const hoursUntil = (planifTime - now) / 3_600_000;
    if (hoursUntil <= 12) {
      return { towing_status: 'imminent', towing_label: 'Remorquage imminent — panneaux installés' };
    }
  }
  return { towing_status: 'none', towing_label: null };
}

const CITY_NAMES: Record<string, string> = {
  montreal: 'Montréal',
  longueuil: 'Longueuil',
  laval: 'Laval',
  quebec: 'Québec',
  gatineau: 'Gatineau',
};

const SearchQuerySchema = z.object({
  q: z.string().min(2).max(100),
  cityId: z.string().max(20).default(''),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

const NearbyQuerySchema = z.object({
  lat: z.coerce.number().min(44).max(48),
  lng: z.coerce.number().min(-76).max(-71),
  radius: z.coerce.number().int().min(50).max(2000).default(300),
  cityId: z.string().min(1).max(20).default('montreal'),
});

const MapQuerySchema = z.object({
  minLat: z.coerce.number().min(44).max(48),
  maxLat: z.coerce.number().min(44).max(48),
  minLng: z.coerce.number().min(-76).max(-71),
  maxLng: z.coerce.number().min(-76).max(-71),
  cityId: z.string().min(1).max(20).default('montreal'),
  limit: z.coerce.number().int().min(1).max(5000).default(2000),
});

export async function streetsRoutes(app: FastifyInstance) {
  // GET /api/streets/search?q=&cityId=&limit=
  app.get('/search', async (req, reply) => {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { q, cityId, limit } = parsed.data;
    const db = getDb();
    const filterCity = cityId && cityId !== 'all';

    // Check if FTS table has data
    const ftsCount = (db.prepare('SELECT COUNT(*) as c FROM street_segments_fts').get() as { c: number }).c;
    const ftsAvailable = ftsCount > 0;

    const numMatch = q.match(/^(\d+)\s+(.*)/);
    let rows;

    if (numMatch) {
      const [, numStr, streetName] = numMatch;
      const num = parseInt(numStr, 10);
      if (ftsAvailable) {
        // FTS search with address range filter
        const ftsQuery = `"${streetName.replace(/"/g, '""')}"*`;
        const sql = `SELECT s.*, os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
             FROM street_segments s
             INNER JOIN street_segments_fts fts ON fts.rowid = s.rowid
             LEFT JOIN operation_statuses os ON os.segment_id = s.id
             WHERE fts.nom_voie MATCH @ftsQuery
               ${filterCity ? 'AND s.city_id = @cityId' : ''}
               AND (s.debut_adresse IS NULL OR s.debut_adresse <= @num)
               AND (s.fin_adresse IS NULL OR s.fin_adresse >= @num)
             ORDER BY rank
             LIMIT @limit`;
        rows = db.prepare(sql).all({
          ftsQuery,
          ...(filterCity ? { cityId } : {}),
          num,
          limit,
        });
      } else {
        // Fallback to LIKE
        const sql = `SELECT s.*, os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
             FROM street_segments s
             LEFT JOIN operation_statuses os ON os.segment_id = s.id
             WHERE ${filterCity ? 's.city_id = @cityId AND' : ''}
               s.nom_voie LIKE @pattern COLLATE NOCASE
               AND (s.debut_adresse IS NULL OR s.debut_adresse <= @num)
               AND (s.fin_adresse IS NULL OR s.fin_adresse >= @num)
             ORDER BY s.nom_voie
             LIMIT @limit`;
        rows = db.prepare(sql).all({
          ...(filterCity ? { cityId } : {}),
          pattern: `%${streetName}%`,
          num,
          limit,
        });
      }
    } else {
      if (ftsAvailable) {
        // FTS search — append * for prefix matching
        const ftsQuery = `"${q.replace(/"/g, '""')}"*`;
        const sql = `SELECT s.*, os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
             FROM street_segments s
             INNER JOIN street_segments_fts fts ON fts.rowid = s.rowid
             LEFT JOIN operation_statuses os ON os.segment_id = s.id
             WHERE fts.nom_voie MATCH @ftsQuery
               ${filterCity ? 'AND s.city_id = @cityId' : ''}
             ORDER BY rank
             LIMIT @limit`;
        rows = db.prepare(sql).all({
          ftsQuery,
          ...(filterCity ? { cityId } : {}),
          limit,
        });
      } else {
        // Fallback to LIKE
        const sql = `SELECT s.*, os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
             FROM street_segments s
             LEFT JOIN operation_statuses os ON os.segment_id = s.id
             WHERE ${filterCity ? 's.city_id = @cityId AND' : ''}
               s.nom_voie LIKE @pattern COLLATE NOCASE
             ORDER BY s.nom_voie
             LIMIT @limit`;
        rows = db.prepare(sql).all({
          ...(filterCity ? { cityId } : {}),
          pattern: `%${q}%`,
          limit,
        });
      }
    }

    const results = (rows as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      etat_label: etatLabel(row.etat as number | null),
      city_name: CITY_NAMES[row.city_id as string] ?? (row.city_id as string),
      ...computeTowing(row.etat as number | null, row.date_deb_planif as string | null),
    }));

    return reply.send({ data: results, total: results.length });
  });

  // GET /api/streets/nearby?lat=&lng=&radius=&cityId=
  app.get('/nearby', async (req, reply) => {
    const parsed = NearbyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { lat, lng, radius, cityId } = parsed.data;
    const db = getDb();

    const latDelta = radius / 111_000;
    const lngDelta = radius / 74_000;

    const rows = db
      .prepare(
        `SELECT s.*, os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at,
                ABS(s.lat - ?) * 111000 AS dist_m
         FROM street_segments s
         LEFT JOIN operation_statuses os ON os.segment_id = s.id
         WHERE s.city_id = ?
           AND s.lat BETWEEN ? AND ?
           AND s.lng BETWEEN ? AND ?
           AND s.lat IS NOT NULL
         ORDER BY dist_m
         LIMIT 20`
      )
      .all(lat, cityId, lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta) as Array<Record<string, unknown>>;

    const results = rows.map((row) => ({
      ...row,
      etat_label: etatLabel(row.etat as number | null),
      ...computeTowing(row.etat as number | null, row.date_deb_planif as string | null),
    }));

    return reply.send({ data: results });
  });

  // GET /api/streets/map?minLat=&maxLat=&minLng=&maxLng=&cityId=&limit=
  app.get('/map', async (req, reply) => {
    const parsed = MapQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { minLat, maxLat, minLng, maxLng, cityId, limit } = parsed.data;
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT s.id, s.nom_voie, s.lat, s.lng, s.geometry, s.cote,
                os.etat, os.date_deb_planif, os.date_fin_planif, os.sub_operations
         FROM street_segments s
         LEFT JOIN operation_statuses os ON os.segment_id = s.id
         WHERE s.city_id = ?
           AND s.lat BETWEEN ? AND ?
           AND s.lng BETWEEN ? AND ?
           AND s.lat IS NOT NULL
         ORDER BY s.id
         LIMIT ?`
      )
      .all(cityId, minLat, maxLat, minLng, maxLng, limit) as Array<Record<string, unknown>>;

    const segments = rows.map((row) => ({
      id: row.id,
      nom_voie: row.nom_voie,
      cote: row.cote,
      lat: row.lat,
      lng: row.lng,
      etat: row.etat ?? 0,
      etat_label: etatLabel(row.etat as number | null),
      date_deb_planif: row.date_deb_planif,
      geometry: row.geometry ? JSON.parse(row.geometry as string) : null,
      sub_operations: row.sub_operations ? JSON.parse(row.sub_operations as string) : null,
      ...computeTowing(row.etat as number | null, row.date_deb_planif as string | null),
    }));

    return reply.send({ data: segments, total: segments.length });
  });

  // GET /api/streets/:segmentId
  app.get('/:segmentId', async (req, reply) => {
    const { segmentId } = req.params as { segmentId: string };
    const db = getDb();

    const row = db
      .prepare(
        `SELECT s.*, os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at, os.source_ts, os.sub_operations
         FROM street_segments s
         LEFT JOIN operation_statuses os ON os.segment_id = s.id
         WHERE s.id = ?`
      )
      .get(segmentId) as Record<string, unknown> | undefined;

    if (!row) {
      return reply.code(404).send({ error: 'Segment not found' });
    }

    const sub = row.sub_operations ? JSON.parse(row.sub_operations as string) : null;
    return reply.send({
      data: {
        ...row,
        etat_label: etatLabel(row.etat as number | null),
        sub_operations: sub,
        ...computeTowing(row.etat as number | null, row.date_deb_planif as string | null),
      },
    });
  });

  // GET /api/streets/:segmentId/status
  app.get('/:segmentId/status', async (req, reply) => {
    const { segmentId } = req.params as { segmentId: string };
    const db = getDb();

    const status = db
      .prepare('SELECT * FROM operation_statuses WHERE segment_id = ?')
      .get(segmentId) as Record<string, unknown> | undefined;

    if (!status) {
      return reply.code(404).send({ error: 'Status not found for this segment' });
    }

    return reply.send({
      data: { ...status, etat_label: etatLabel(status.etat as number | null) },
    });
  });
}
