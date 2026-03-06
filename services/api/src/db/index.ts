import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(config.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    initSchema(db);
    applyMigrations(db);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS street_segments (
      id            TEXT PRIMARY KEY,
      city_id       TEXT NOT NULL DEFAULT 'montreal',
      nom_voie      TEXT NOT NULL,
      type_voie     TEXT,
      debut_adresse INTEGER,
      fin_adresse   INTEGER,
      cote          TEXT,
      arrondissement TEXT,
      lat           REAL,
      lng           REAL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_segments_nom_voie
      ON street_segments(nom_voie COLLATE NOCASE);

    CREATE INDEX IF NOT EXISTS idx_segments_city
      ON street_segments(city_id);

    CREATE TABLE IF NOT EXISTS operation_statuses (
      segment_id       TEXT PRIMARY KEY,
      etat             INTEGER NOT NULL,
      date_deb_planif  TEXT,
      date_fin_planif  TEXT,
      updated_at       TEXT NOT NULL,
      source_ts        TEXT,
      FOREIGN KEY (segment_id) REFERENCES street_segments(id)
    );

    CREATE TABLE IF NOT EXISTS user_watches (
      id               TEXT PRIMARY KEY,
      anon_user_id     TEXT NOT NULL,
      segment_id       TEXT NOT NULL,
      city_id          TEXT NOT NULL DEFAULT 'montreal',
      push_token       TEXT NOT NULL,
      label            TEXT,
      notify_on_change INTEGER NOT NULL DEFAULT 1,
      notify_t60       INTEGER NOT NULL DEFAULT 1,
      notify_t30       INTEGER NOT NULL DEFAULT 1,
      quiet_start      TEXT NOT NULL DEFAULT '22:00',
      quiet_end        TEXT NOT NULL DEFAULT '07:00',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (segment_id) REFERENCES street_segments(id)
    );

    CREATE TABLE IF NOT EXISTS cities (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_watches_segment
      ON user_watches(segment_id);

    CREATE INDEX IF NOT EXISTS idx_watches_anon_user
      ON user_watches(anon_user_id);

    CREATE TABLE IF NOT EXISTS notification_logs (
      id        TEXT PRIMARY KEY,
      watch_id  TEXT NOT NULL,
      type      TEXT NOT NULL,
      sent_at   TEXT NOT NULL DEFAULT (datetime('now')),
      status    TEXT NOT NULL DEFAULT 'sent',
      FOREIGN KEY (watch_id) REFERENCES user_watches(id)
    );

    CREATE INDEX IF NOT EXISTS idx_notif_watch
      ON notification_logs(watch_id, type, sent_at);

    CREATE TABLE IF NOT EXISTS data_sync_log (
      id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(8)))),
      synced_at     TEXT NOT NULL DEFAULT (datetime('now')),
      record_count  INTEGER,
      changed_count INTEGER,
      status        TEXT NOT NULL DEFAULT 'ok',
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS user_reports (
      id           TEXT PRIMARY KEY,
      segment_id   TEXT NOT NULL,
      anon_user_id TEXT,
      type         TEXT NOT NULL DEFAULT 'wrong_status',
      notes        TEXT,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (segment_id) REFERENCES street_segments(id)
    );

    CREATE INDEX IF NOT EXISTS idx_reports_segment
      ON user_reports(segment_id);
  `);
}

/** Idempotent migrations for existing databases. */
function applyMigrations(db: Database.Database): void {
  const segCols = (db.pragma('table_info(street_segments)') as Array<{ name: string }>).map((c) => c.name);
  if (!segCols.includes('city_id')) {
    db.exec(`ALTER TABLE street_segments ADD COLUMN city_id TEXT NOT NULL DEFAULT 'montreal'`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_segments_city ON street_segments(city_id)`);
  }

  const watchCols = (db.pragma('table_info(user_watches)') as Array<{ name: string }>).map((c) => c.name);
  if (!watchCols.includes('city_id')) {
    db.exec(`ALTER TABLE user_watches ADD COLUMN city_id TEXT NOT NULL DEFAULT 'montreal'`);
  }

  // Geometry column for polyline map data (JSON: [[lng,lat], ...])
  if (!segCols.includes('geometry')) {
    db.exec(`ALTER TABLE street_segments ADD COLUMN geometry TEXT`);
  }

  // Sub-operations JSON column (sidewalk, snow blowing, salt, etc.)
  const opCols = (db.pragma('table_info(operation_statuses)') as Array<{ name: string }>).map((c) => c.name);
  if (!opCols.includes('sub_operations')) {
    db.exec(`ALTER TABLE operation_statuses ADD COLUMN sub_operations TEXT`);
  }

  // Spatial-ish index for bounding box queries
  db.exec(`CREATE INDEX IF NOT EXISTS idx_segments_lat_lng ON street_segments(city_id, lat, lng)`);

  db.exec(`CREATE TABLE IF NOT EXISTS cities (id TEXT PRIMARY KEY, name TEXT NOT NULL, available INTEGER NOT NULL DEFAULT 1)`);
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
