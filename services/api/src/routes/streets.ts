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

const ByNameQuerySchema = z.object({
  name: z.string().min(1).max(100),
  cityId: z.string().min(1).max(20),
});

export async function streetsRoutes(app: FastifyInstance) {
  // GET /api/streets/search-grouped?q=&cityId=&limit=
  // Returns one result per unique street name + city (Google Maps style)
  app.get('/search-grouped', async (req, reply) => {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { q, cityId, limit } = parsed.data;
    const db = getDb();
    const filterCity = cityId && cityId !== 'all';
    const ftsAvailable = !!(db.prepare('SELECT rowid FROM street_segments_fts LIMIT 1').get());

    // Parse address number from query: "4523 Saint-Denis" or "Saint-Denis 4523"
    const leadingNum = q.match(/^(\d+)\s+(.*)/);
    const trailingNum = q.match(/^(.*?)\s+(\d+)$/);
    const addressNum = leadingNum ? Number(leadingNum[1]) : trailingNum ? Number(trailingNum[2]) : null;
    const searchTerm = leadingNum ? leadingNum[2] : trailingNum ? trailingNum[1] : q;

    const worstEtatExpr = `COALESCE(
      MAX(CASE WHEN COALESCE(os.etat, 0) = 3 THEN 3 END),
      MAX(CASE WHEN COALESCE(os.etat, 0) = 5 THEN 5 END),
      MAX(CASE WHEN COALESCE(os.etat, 0) = 2 THEN 2 END),
      MAX(CASE WHEN COALESCE(os.etat, 0) = 4 THEN 4 END),
      MAX(CASE WHEN COALESCE(os.etat, 0) = 1 THEN 1 END),
      0
    )`;

    let rows;
    if (ftsAvailable) {
      const ftsQuery = `"${searchTerm.replace(/"/g, '""')}"*`;
      rows = db.prepare(`
        SELECT s.nom_voie, s.city_id,
               COUNT(*) as segment_count,
               ${worstEtatExpr} as worst_etat,
               AVG(s.lat) as lat, AVG(s.lng) as lng,
               MIN(s.debut_adresse) as min_adresse,
               MAX(s.fin_adresse) as max_adresse,
               MIN(s.type_voie) as type_voie
        FROM street_segments s
        INNER JOIN street_segments_fts fts ON fts.rowid = s.rowid
        LEFT JOIN operation_statuses os ON os.segment_id = s.id
        WHERE fts.nom_voie MATCH @ftsQuery
          ${filterCity ? 'AND s.city_id = @cityId' : ''}
        GROUP BY s.nom_voie, s.city_id
        ORDER BY MIN(rank)
        LIMIT @limit
      `).all({ ftsQuery, ...(filterCity ? { cityId } : {}), limit });
    } else {
      rows = db.prepare(`
        SELECT s.nom_voie, s.city_id,
               COUNT(*) as segment_count,
               ${worstEtatExpr} as worst_etat,
               AVG(s.lat) as lat, AVG(s.lng) as lng,
               MIN(s.debut_adresse) as min_adresse,
               MAX(s.fin_adresse) as max_adresse,
               MIN(s.type_voie) as type_voie
        FROM street_segments s
        LEFT JOIN operation_statuses os ON os.segment_id = s.id
        WHERE ${filterCity ? 's.city_id = @cityId AND' : ''}
          s.nom_voie LIKE @pattern COLLATE NOCASE
        GROUP BY s.nom_voie, s.city_id
        ORDER BY s.nom_voie
        LIMIT @limit
      `).all({ ...(filterCity ? { cityId } : {}), pattern: `%${searchTerm}%`, limit });
    }

    // If address number provided, find the matching segment for each result
    const matchedSegments = new Map<string, Record<string, unknown>>();
    if (addressNum) {
      for (const row of rows as Array<Record<string, unknown>>) {
        const seg = db.prepare(`
          SELECT s.id, s.cote, s.debut_adresse, s.fin_adresse, s.lat, s.lng,
                 COALESCE(os.etat, 0) as etat, os.date_deb_planif
          FROM street_segments s
          LEFT JOIN operation_statuses os ON os.segment_id = s.id
          WHERE s.nom_voie = @name COLLATE NOCASE AND s.city_id = @cityId
            AND s.debut_adresse <= @addr AND s.fin_adresse >= @addr
          ORDER BY ABS(s.debut_adresse - @addr)
          LIMIT 1
        `).get({ name: row.nom_voie, cityId: row.city_id, addr: addressNum }) as Record<string, unknown> | undefined;
        if (seg) {
          matchedSegments.set(`${row.nom_voie}|${row.city_id}`, seg);
        }
      }
    }

    const results = (rows as Array<Record<string, unknown>>).map((row) => {
      const key = `${row.nom_voie}|${row.city_id}`;
      const matched = matchedSegments.get(key);
      return {
        nom_voie: row.nom_voie,
        type_voie: row.type_voie,
        city_id: row.city_id,
        city_name: CITY_NAMES[row.city_id as string] ?? (row.city_id as string),
        segment_count: row.segment_count,
        worst_etat: matched ? matched.etat as number : row.worst_etat,
        etat_label: matched ? etatLabel(matched.etat as number | null) : etatLabel(row.worst_etat as number | null),
        lat: matched?.lat ? matched.lat as number : row.lat as number,
        lng: matched?.lng ? matched.lng as number : row.lng as number,
        ...(addressNum ? { address: addressNum } : {}),
        ...(matched ? {
          matched_segment: {
            id: matched.id,
            cote: matched.cote,
            debut_adresse: matched.debut_adresse,
            fin_adresse: matched.fin_adresse,
            etat: matched.etat,
            etat_label: etatLabel(matched.etat as number | null),
            ...computeTowing(matched.etat as number | null, matched.date_deb_planif as string | null),
          },
        } : {}),
      };
    });

    return reply.send({ data: results, total: results.length });
  });

  // GET /api/streets/by-name?name=Saint-Denis&cityId=montreal
  // Returns all segments for a street with geometry (for map display)
  app.get('/by-name', async (req, reply) => {
    const parsed = ByNameQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { name, cityId } = parsed.data;
    const db = getDb();

    const rows = db.prepare(`
      SELECT s.id, s.nom_voie, s.type_voie, s.city_id, s.debut_adresse, s.fin_adresse,
             s.cote, s.arrondissement, s.lat, s.lng, s.geometry,
             os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
      FROM street_segments s
      LEFT JOIN operation_statuses os ON os.segment_id = s.id
      WHERE s.nom_voie = @name COLLATE NOCASE AND s.city_id = @cityId
      ORDER BY s.debut_adresse
    `).all({ name, cityId }) as Array<Record<string, unknown>>;

    if (rows.length === 0) {
      return reply.code(404).send({ error: 'Street not found' });
    }

    const segments = rows.map((row) => ({
      id: row.id,
      nom_voie: row.nom_voie,
      type_voie: row.type_voie,
      cote: row.cote,
      debut_adresse: row.debut_adresse,
      fin_adresse: row.fin_adresse,
      lat: row.lat,
      lng: row.lng,
      geometry: row.geometry ? JSON.parse(row.geometry as string) : null,
      etat: (row.etat as number) ?? 0,
      etat_label: etatLabel(row.etat as number | null),
      date_deb_planif: row.date_deb_planif,
      date_fin_planif: row.date_fin_planif,
      updated_at: row.updated_at,
      ...computeTowing(row.etat as number | null, row.date_deb_planif as string | null),
    }));

    const validSegs = segments.filter((s) => s.lat && s.lng);
    const center = validSegs.length > 0
      ? {
          lat: validSegs.reduce((sum, s) => sum + (s.lat as number), 0) / validSegs.length,
          lng: validSegs.reduce((sum, s) => sum + (s.lng as number), 0) / validSegs.length,
        }
      : { lat: 45.5017, lng: -73.5673 };

    const etats = segments.map((s) => s.etat);
    const worstEtat = [3, 5, 2, 4, 1, 0].find((e) => etats.includes(e)) ?? 0;

    return reply.send({
      data: {
        nom_voie: rows[0].nom_voie as string,
        type_voie: rows[0].type_voie as string | null,
        city_id: cityId,
        city_name: CITY_NAMES[cityId] ?? cityId,
        worst_etat: worstEtat,
        etat_label: etatLabel(worstEtat),
        segment_count: segments.length,
        center,
        segments,
      },
    });
  });

  // GET /api/streets/search?q=&cityId=&limit=
  app.get('/search', async (req, reply) => {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }

    const { q, cityId, limit } = parsed.data;
    const db = getDb();
    const filterCity = cityId && cityId !== 'all';

    // Quick existence check (LIMIT 1 is instant vs COUNT(*) which scans entire FTS table)
    const ftsAvailable = !!(db.prepare('SELECT rowid FROM street_segments_fts LIMIT 1').get());

    const numMatch = q.match(/^(\d+)\s+(.*)/);
    let rows;

    if (numMatch) {
      const [, numStr, streetName] = numMatch;
      const num = parseInt(numStr, 10);
      if (ftsAvailable) {
        // FTS search with address range filter
        const ftsQuery = `"${streetName.replace(/"/g, '""')}"*`;
        const sql = `SELECT s.id, s.city_id, s.nom_voie, s.type_voie, s.debut_adresse, s.fin_adresse,
                    s.cote, s.arrondissement, s.lat, s.lng,
                    os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
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
        const sql = `SELECT s.id, s.city_id, s.nom_voie, s.type_voie, s.debut_adresse, s.fin_adresse,
                    s.cote, s.arrondissement, s.lat, s.lng,
                    os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
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
        const sql = `SELECT s.id, s.city_id, s.nom_voie, s.type_voie, s.debut_adresse, s.fin_adresse,
                    s.cote, s.arrondissement, s.lat, s.lng,
                    os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
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
        const sql = `SELECT s.id, s.city_id, s.nom_voie, s.type_voie, s.debut_adresse, s.fin_adresse,
                    s.cote, s.arrondissement, s.lat, s.lng,
                    os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
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

  // ── Sitemap: all unique street names grouped by city ─────────────
  app.get('/sitemap-urls', async (_request, reply) => {
    const db = getDb();

    const rows = db.prepare(`
      SELECT nom_voie, city_id
      FROM street_segments
      WHERE nom_voie IS NOT NULL AND nom_voie != ''
      GROUP BY nom_voie, city_id
      ORDER BY city_id, nom_voie
    `).all() as { nom_voie: string; city_id: string }[];

    return reply.send({ data: rows });
  });
}
