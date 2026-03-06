import { fetch } from 'undici';
import type Database from 'better-sqlite3';
import { config } from '../config';
import { getDb } from '../db';
import type { PlanifNeigeRecord, GeobaseEntry } from '../types';
import type { CityAdapter } from './adapters/base';

export interface FetchResult {
  records: PlanifNeigeRecord[];
  lastUpdate: string;
  recordCount: number;
}

export interface GeobaseMap {
  [coteRueId: string]: GeobaseEntry;
}

let geobaseCache: GeobaseMap | null = null;
let geobaseLastFetch = 0;
const GEOBASE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export async function fetchPlanifNeige(): Promise<FetchResult> {
  const res = await fetch(config.planifNeigeJsonUrl, {
    headers: { 'User-Agent': 'AlerteDeneigement/1.0 (contact@alerteneige.app)' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Planif-Neige API responded ${res.status}`);
  }

  const raw = (await res.json()) as PlanifNeigeRecord[] | { data?: PlanifNeigeRecord[]; records?: PlanifNeigeRecord[] };

  let records: PlanifNeigeRecord[];
  if (Array.isArray(raw)) {
    records = raw;
  } else if (raw.data) {
    records = raw.data;
  } else if (raw.records) {
    records = raw.records;
  } else {
    throw new Error('Unexpected Planif-Neige response shape');
  }

  return {
    records,
    lastUpdate: new Date().toISOString(),
    recordCount: records.length,
  };
}

export async function fetchGeobaseMap(): Promise<GeobaseMap> {
  const now = Date.now();
  if (geobaseCache && now - geobaseLastFetch < GEOBASE_TTL_MS) {
    return geobaseCache;
  }

  const res = await fetch(config.geobaseMapUrl, {
    headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Geobase map API responded ${res.status}`);
  }

  const map = (await res.json()) as GeobaseMap;
  geobaseCache = map;
  geobaseLastFetch = now;
  return map;
}

export interface SyncResult {
  total: number;
  changed: number;
  errors: number;
}

/**
 * Syncs Planif-Neige data into DB and returns changed segment IDs.
 */
export async function syncPlanifNeige(): Promise<{ result: SyncResult; changedSegmentIds: string[] }> {
  const db = getDb();
  const { records } = await fetchPlanifNeige();

  const upsertStatus = db.prepare(`
    INSERT INTO operation_statuses (segment_id, etat, date_deb_planif, date_fin_planif, updated_at, source_ts)
    VALUES (@segment_id, @etat, @date_deb_planif, @date_fin_planif, @updated_at, @source_ts)
    ON CONFLICT(segment_id) DO UPDATE SET
      etat            = excluded.etat,
      date_deb_planif = excluded.date_deb_planif,
      date_fin_planif = excluded.date_fin_planif,
      updated_at      = excluded.updated_at,
      source_ts       = excluded.source_ts
    WHERE excluded.etat != operation_statuses.etat
       OR excluded.date_deb_planif != COALESCE(operation_statuses.date_deb_planif, '')
       OR excluded.date_fin_planif != COALESCE(operation_statuses.date_fin_planif, '')
  `);

  const getExistingStatus = db.prepare(
    'SELECT etat FROM operation_statuses WHERE segment_id = ?'
  ) as Database.Statement<[string]>;

  const ensureSegment = db.prepare(`
    INSERT OR IGNORE INTO street_segments (id, nom_voie, type_voie, debut_adresse, fin_adresse, cote, arrondissement)
    VALUES (@id, @nom_voie, @type_voie, @debut_adresse, @fin_adresse, @cote, @arrondissement)
  `);

  const changedSegmentIds: string[] = [];
  let errors = 0;

  const syncAll = db.transaction(() => {
    for (const record of records) {
      try {
        const existing = getExistingStatus.get(record.cote_rue_id) as { etat: number } | undefined;
        const hasChanged = !existing || existing.etat !== record.etat_deneig;

        // Ensure street segment exists (minimal — geobase enrichment runs separately)
        ensureSegment.run({
          id: record.cote_rue_id,
          nom_voie: record.cote_rue_id, // will be enriched by geobase sync
          type_voie: null,
          debut_adresse: null,
          fin_adresse: null,
          cote: null,
          arrondissement: record.mun_id,
        });

        const info = upsertStatus.run({
          segment_id: record.cote_rue_id,
          etat: record.etat_deneig,
          date_deb_planif: record.date_deb_planif ?? null,
          date_fin_planif: record.date_fin_planif ?? null,
          updated_at: new Date().toISOString(),
          source_ts: record.date_maj,
        });

        if (hasChanged && info.changes > 0) {
          changedSegmentIds.push(record.cote_rue_id);
        }
      } catch {
        errors++;
      }
    }
  });

  syncAll();

  return {
    result: {
      total: records.length,
      changed: changedSegmentIds.length,
      errors,
    },
    changedSegmentIds,
  };
}

/**
 * Enriches street segments with geobase name / address data.
 * Runs once on startup and once per week.
 */
export async function syncGeobase(): Promise<void> {
  const db = getDb();
  const geobase = await fetchGeobaseMap();

  const updateSegment = db.prepare(`
    UPDATE street_segments
    SET nom_voie      = @nom_voie,
        type_voie     = @type_voie,
        debut_adresse = @debut_adresse,
        fin_adresse   = @fin_adresse,
        cote          = @cote
    WHERE id = @id
  `);

  const enrich = db.transaction(() => {
    for (const [id, entry] of Object.entries(geobase)) {
      updateSegment.run({
        id,
        nom_voie: entry.nom_voie ?? 'Rue inconnue',
        type_voie: entry.type_voie ?? null,
        debut_adresse: entry.debut_adresse ?? null,
        fin_adresse: entry.fin_adresse ?? null,
        cote: entry.cote ?? null,
      });
    }
  });

  enrich();
}

/**
 * Enriches Montreal street segments with polyline geometry.
 *
 * Sources (tried in order):
 *   1. GEOBASE_GEOMETRY_URL env var (pre-built JSON map or local file)
 *   2. Montreal Open Data "Géobase double" GeoJSON (~75MB, processed in-memory)
 *
 * The Open Data source contains ~91,000 features with COTE_RUE_ID + LineString geometry.
 */
const GEOBASE_GEOJSON_URL =
  'https://donnees.montreal.ca/dataset/88493b16-220f-4709-b57b-1ea57c5ba405/resource/16f7fa0a-9ce6-4b29-a7fc-00842c593927/download/gbdouble.json';

export async function syncGeobaseGeometry(): Promise<void> {
  const db = getDb();
  let geoMap: Record<string, number[][]>;

  if (config.geobaseGeometryUrl) {
    // Use pre-built geometry map (URL or local file)
    if (config.geobaseGeometryUrl.startsWith('http')) {
      const res = await fetch(config.geobaseGeometryUrl, {
        headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        throw new Error(`Geobase geometry API responded ${res.status}`);
      }
      const raw = (await res.json()) as Record<string, number[][] | { coordinates: number[][] }>;
      geoMap = {};
      for (const [id, value] of Object.entries(raw)) {
        geoMap[id] = Array.isArray(value) ? value : value.coordinates;
      }
    } else {
      const fs = await import('fs');
      const raw = fs.readFileSync(config.geobaseGeometryUrl, 'utf-8');
      geoMap = JSON.parse(raw);
    }
  } else {
    // Download and process Montreal Open Data GeoJSON directly
    console.log('[Geobase] Downloading Montreal Géobase double GeoJSON...');
    const res = await fetch(GEOBASE_GEOJSON_URL, {
      headers: { 'User-Agent': 'AlerteDeneigement/1.0' },
      signal: AbortSignal.timeout(180_000), // 3 min — large file
    });
    if (!res.ok) {
      throw new Error(`Géobase GeoJSON download failed: ${res.status}`);
    }

    const geojson = (await res.json()) as {
      features?: Array<{
        properties?: Record<string, unknown>;
        geometry?: { type: string; coordinates: unknown };
      }>;
    };
    const features = geojson.features ?? [];
    console.log(`[Geobase] Processing ${features.length} GeoJSON features...`);

    geoMap = {};
    for (const feature of features) {
      const props = feature.properties ?? {};
      const coteRueId = String(props['COTE_RUE_ID'] ?? props['cote_rue_id'] ?? '');
      if (!coteRueId) continue;

      const geom = feature.geometry;
      if (!geom?.coordinates) continue;

      let coords: number[][] | undefined;
      if (geom.type === 'LineString') {
        coords = geom.coordinates as number[][];
      } else if (geom.type === 'MultiLineString') {
        coords = (geom.coordinates as number[][][]).flat();
      }

      if (!coords || coords.length < 2) continue;

      // Round to 6 decimal places (~11cm precision)
      geoMap[coteRueId] = coords.map(([lng, lat]) => [
        Math.round(lng * 1e6) / 1e6,
        Math.round(lat * 1e6) / 1e6,
      ]);
    }
    console.log(`[Geobase] Extracted geometry for ${Object.keys(geoMap).length} segments`);
  }

  const updateGeometry = db.prepare(`
    UPDATE street_segments
    SET geometry = @geometry,
        lat = COALESCE(lat, @lat),
        lng = COALESCE(lng, @lng)
    WHERE id = @id
  `);

  const enrich = db.transaction(() => {
    for (const [id, coords] of Object.entries(geoMap)) {
      if (!coords || coords.length === 0) continue;

      // Compute centroid for lat/lng
      const midIdx = Math.floor(coords.length / 2);
      const [lng, lat] = coords[midIdx];

      updateGeometry.run({
        id,
        geometry: JSON.stringify(coords),
        lat,
        lng,
      });
    }
  });

  enrich();
}

/**
 * Generic city sync: fetches NormalizedSegments from an adapter and upserts them into DB.
 * Returns changed segment DB IDs for notification dispatch.
 */
export async function syncCity(adapter: CityAdapter): Promise<{ result: SyncResult; changedSegmentIds: string[] }> {
  const db = getDb();
  const segments = await adapter.fetch();

  if (segments.length === 0) {
    return { result: { total: 0, changed: 0, errors: 0 }, changedSegmentIds: [] };
  }

  const upsertSegment = db.prepare(`
    INSERT INTO street_segments (id, city_id, nom_voie, lat, lng, geometry, created_at)
    VALUES (@id, @city_id, @nom_voie, @lat, @lng, @geometry, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      nom_voie = CASE WHEN excluded.nom_voie != id THEN excluded.nom_voie ELSE street_segments.nom_voie END,
      lat      = COALESCE(excluded.lat, street_segments.lat),
      lng      = COALESCE(excluded.lng, street_segments.lng),
      geometry = COALESCE(excluded.geometry, street_segments.geometry)
  `);

  const upsertStatus = db.prepare(`
    INSERT INTO operation_statuses (segment_id, etat, date_deb_planif, date_fin_planif, updated_at, source_ts, sub_operations)
    VALUES (@segment_id, @etat, @date_deb_planif, @date_fin_planif, @updated_at, @source_ts, @sub_operations)
    ON CONFLICT(segment_id) DO UPDATE SET
      etat            = excluded.etat,
      date_deb_planif = excluded.date_deb_planif,
      date_fin_planif = excluded.date_fin_planif,
      updated_at      = excluded.updated_at,
      source_ts       = excluded.source_ts,
      sub_operations  = excluded.sub_operations
    WHERE excluded.etat != operation_statuses.etat
       OR excluded.date_deb_planif IS NOT operation_statuses.date_deb_planif
       OR excluded.date_fin_planif IS NOT operation_statuses.date_fin_planif
       OR excluded.sub_operations IS NOT operation_statuses.sub_operations
  `);

  const getExisting = db.prepare('SELECT etat FROM operation_statuses WHERE segment_id = ?') as Database.Statement<[string]>;

  const changedSegmentIds: string[] = [];
  let errors = 0;
  const now = new Date().toISOString();

  // Montreal keeps raw externalId (backward compat); all others get prefixed
  const toDbId = (seg: { externalId: string; cityId: string }) =>
    seg.cityId === 'montreal' ? seg.externalId : `${seg.cityId}_${seg.externalId}`;

  const syncAll = db.transaction(() => {
    for (const seg of segments) {
      try {
        const dbId = toDbId(seg);
        const existing = getExisting.get(dbId) as { etat: number } | undefined;
        const hasChanged = !existing || existing.etat !== seg.status;

        upsertSegment.run({
          id: dbId,
          city_id: seg.cityId,
          nom_voie: seg.nomVoie,
          lat: seg.lat,
          lng: seg.lng,
          geometry: seg.geometry ? JSON.stringify(seg.geometry) : null,
        });

        const info = upsertStatus.run({
          segment_id: dbId,
          etat: seg.status,
          date_deb_planif: seg.planifStart,
          date_fin_planif: seg.planifEnd,
          updated_at: now,
          source_ts: null,
          sub_operations: seg.subOperations ? JSON.stringify(seg.subOperations) : null,
        });

        if (hasChanged && info.changes > 0) {
          changedSegmentIds.push(dbId);
        }
      } catch {
        errors++;
      }
    }
  });

  syncAll();

  return {
    result: { total: segments.length, changed: changedSegmentIds.length, errors },
    changedSegmentIds,
  };
}

