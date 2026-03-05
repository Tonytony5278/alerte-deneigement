import cron from 'node-cron';
import { config } from '../config';
import { syncCity, syncGeobase } from '../services/dataFetcher';
import { notifyStatusChange, notifyScheduledReminders } from '../services/notificationService';
import { CITY_ADAPTERS } from '../services/cityRegistry';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

let isPolling = false;
let lastSuccessAt: Date | null = null;
let lastRecordCount = 0;

export function getPollerStatus() {
  return {
    running: isPolling,
    lastSuccessAt: lastSuccessAt?.toISOString() ?? null,
    lastRecordCount,
  };
}

async function poll() {
  if (isPolling) {
    console.log('[Poller] Skipping — previous poll still running');
    return;
  }
  isPolling = true;

  const syncId = uuidv4();
  const db = getDb();
  let totalRecords = 0;
  let totalChanged = 0;
  const allChangedIds: string[] = [];

  try {
    console.log(`[Poller] Starting multi-city sync ${syncId}`);

    const results = await Promise.allSettled(
      Object.values(CITY_ADAPTERS).map(async (adapter) => {
        try {
          const { result, changedSegmentIds } = await syncCity(adapter);
          console.log(`[Poller] [${adapter.cityId}] ${result.total} records, ${result.changed} changed`);
          return { result, changedSegmentIds };
        } catch (err) {
          console.error(`[Poller] [${adapter.cityId}] error:`, err instanceof Error ? err.message : String(err));
          throw err;
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        totalRecords += r.value.result.total;
        totalChanged += r.value.result.changed;
        allChangedIds.push(...r.value.changedSegmentIds);
      }
    }

    lastSuccessAt = new Date();
    lastRecordCount = totalRecords;

    db.prepare(
      'INSERT INTO data_sync_log (id, synced_at, record_count, changed_count, status) VALUES (?, ?, ?, ?, ?)'
    ).run(syncId, new Date().toISOString(), totalRecords, totalChanged, 'ok');

    console.log(`[Poller] Done: ${totalRecords} total, ${totalChanged} changed`);

    if (allChangedIds.length > 0) {
      const statusRows = db
        .prepare(
          `SELECT segment_id, etat FROM operation_statuses WHERE segment_id IN (${allChangedIds.map(() => '?').join(',')})`
        )
        .all(...allChangedIds) as Array<{ segment_id: string; etat: number }>;

      await Promise.all(
        statusRows.map((row) =>
          notifyStatusChange(row.segment_id, row.etat).catch((err) =>
            console.error(`[Poller] Notification error for ${row.segment_id}:`, err)
          )
        )
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Poller] Fatal error:', msg);
    db.prepare(
      'INSERT INTO data_sync_log (id, synced_at, status, error_message) VALUES (?, ?, ?, ?)'
    ).run(syncId, new Date().toISOString(), 'error', msg);
  } finally {
    isPolling = false;
  }
}

async function checkReminders() {
  try {
    await notifyScheduledReminders();
  } catch (err) {
    console.error('[Poller] Reminder check error:', err);
  }
}

let geobaseSynced = false;

async function initGeobase() {
  if (geobaseSynced) return;
  try {
    console.log('[Geobase] Syncing Montreal street names...');
    await syncGeobase();
    geobaseSynced = true;
    console.log('[Geobase] Done');
  } catch (err) {
    console.error('[Geobase] Sync error (non-fatal):', err);
  }
}

export function startPoller() {
  const pollExpression = `*/${config.pollIntervalMinutes} * * * *`;
  const reminderExpression = `*/${config.t60CheckIntervalMinutes} * * * *`;

  // Poll first so segments exist in DB, then enrich with street names
  void poll().then(() => initGeobase());

  cron.schedule(pollExpression, () => { void poll(); });
  cron.schedule(reminderExpression, () => { void checkReminders(); });

  cron.schedule('0 3 * * 0', () => {
    geobaseSynced = false;
    void initGeobase();
  });

  console.log(`[Poller] Started — ${Object.keys(CITY_ADAPTERS).length} cities, poll every ${config.pollIntervalMinutes}min`);
}
