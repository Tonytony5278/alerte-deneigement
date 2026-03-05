import { Expo, type ExpoPushMessage, type ExpoPushErrorTicket } from 'expo-server-sdk';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import type { UserWatch, NotificationType } from '../types';
import { EtatDeneig, ETAT_LABELS } from '../types';

const expo = new Expo();

interface StreetInfo {
  nom_voie: string;
  arrondissement: string | null;
}

function buildMessage(
  type: NotificationType,
  street: StreetInfo,
  etat?: number,
  dateDebPlanif?: string | null
): { title: string; body: string } {
  const streetName = street.nom_voie !== street.arrondissement ? street.nom_voie : 'ta rue';

  switch (type) {
    case 'status_change': {
      const label = etat !== undefined ? ETAT_LABELS[etat] : 'changé';
      return {
        title: '❄️ Alerte Déneigement',
        body: `${streetName} — statut: ${label}`,
      };
    }
    case 't60': {
      const time = dateDebPlanif ? formatTime(dateDebPlanif) : 'bientôt';
      return {
        title: '⏰ Déplace ton auto — 60 min',
        body: `Chargement prévu à ${time} sur ${streetName}`,
      };
    }
    case 't30': {
      const time = dateDebPlanif ? formatTime(dateDebPlanif) : 'bientôt';
      return {
        title: '🚨 Urgent — 30 min restants',
        body: `Chargement à ${time} sur ${streetName} — dépêche-toi !`,
      };
    }
    case 'in_progress':
      return {
        title: '🚛 Chargement en cours !',
        body: `Opération active sur ${streetName} — déplace-toi maintenant`,
      };
    case 'storm_alert':
      return {
        title: '🌨️ Alerte tempête',
        body: 'Grosse opération ce soir — vérifie ta rue',
      };
    default:
      return { title: '❄️ Alerte Déneigement', body: streetName };
  }
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isInQuietHours(watch: UserWatch): boolean {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const start = watch.quiet_start;
  const end = watch.quiet_end;

  // Handle midnight crossing (e.g., 22:00 → 07:00)
  if (start > end) {
    return hhmm >= start || hhmm < end;
  }
  return hhmm >= start && hhmm < end;
}

function hasRecentNotif(watchId: string, type: NotificationType, windowMinutes: number): boolean {
  const db = getDb();
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const row = db
    .prepare(
      "SELECT 1 FROM notification_logs WHERE watch_id = ? AND type = ? AND sent_at > ? AND status = 'sent' LIMIT 1"
    )
    .get(watchId, type, cutoff) as unknown;
  return !!row;
}

async function sendToTokens(
  messages: ExpoPushMessage[]
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  if (messages.length === 0) return { sent: 0, failed: 0, invalidTokens: [] };

  const chunks = expo.chunkPushNotifications(messages);
  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const chunk of chunks) {
    const receipts = await expo.sendPushNotificationsAsync(chunk);
    for (let i = 0; i < receipts.length; i++) {
      if (receipts[i].status === 'ok') {
        sent++;
      } else {
        failed++;
        const errReceipt = receipts[i] as ExpoPushErrorTicket;
        if (errReceipt.details?.error === 'DeviceNotRegistered') {
          const token = chunk[i]?.to;
          if (typeof token === 'string') invalidTokens.push(token);
        }
      }
    }
  }

  return { sent, failed, invalidTokens };
}

function removeStaleTokens(tokens: string[]): void {
  if (tokens.length === 0) return;
  const db = getDb();
  const placeholders = tokens.map(() => '?').join(',');
  // Blank out the push token so future sends are skipped, but keep the watch record
  db.prepare(`UPDATE user_watches SET push_token = '' WHERE push_token IN (${placeholders})`).run(
    ...tokens
  );
}

function logNotification(watchId: string, type: NotificationType, status: 'sent' | 'failed'): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO notification_logs (id, watch_id, type, sent_at, status) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), watchId, type, new Date().toISOString(), status);
}

/**
 * Send notifications to all watches for changed segments.
 */
export async function notifyStatusChange(
  segmentId: string,
  newEtat: number
): Promise<void> {
  const db = getDb();

  const street = db
    .prepare('SELECT nom_voie, arrondissement FROM street_segments WHERE id = ?')
    .get(segmentId) as StreetInfo | undefined;
  if (!street) return;

  const watches = db
    .prepare(
      "SELECT * FROM user_watches WHERE segment_id = ? AND notify_on_change = 1"
    )
    .all(segmentId) as UserWatch[];

  const messages: Array<{ message: ExpoPushMessage; watchId: string }> = [];

  for (const watch of watches) {
    if (!Expo.isExpoPushToken(watch.push_token)) continue;
    if (isInQuietHours(watch) && newEtat !== EtatDeneig.EN_COURS) continue; // urgent = ignore quiet
    if (hasRecentNotif(watch.id, 'status_change', 5)) continue;

    const { title, body } = buildMessage('status_change', street, newEtat);
    messages.push({
      watchId: watch.id,
      message: {
        to: watch.push_token,
        title,
        body,
        sound: 'default',
        data: { segmentId, type: 'status_change', etat: newEtat },
        channelId: 'deneigement',
      },
    });

    // Also send in_progress if EN_COURS
    if (newEtat === EtatDeneig.EN_COURS) {
      const urgent = buildMessage('in_progress', street);
      messages.push({
        watchId: watch.id,
        message: {
          to: watch.push_token,
          title: urgent.title,
          body: urgent.body,
          sound: 'default',
          data: { segmentId, type: 'in_progress' },
          channelId: 'deneigement-urgent',
        },
      });
    }
  }

  if (messages.length === 0) return;

  const { sent, failed, invalidTokens } = await sendToTokens(messages.map((m) => m.message));
  removeStaleTokens(invalidTokens);

  // Log each
  messages.forEach((m, i) => {
    const status: 'sent' | 'failed' = i < sent ? 'sent' : 'failed';
    logNotification(m.watchId, 'status_change', status);
  });
}

/**
 * Send T-60 or T-30 reminders for segments currently scheduled.
 */
export async function notifyScheduledReminders(): Promise<void> {
  const db = getDb();
  const now = new Date();

  // Get all PLANIFIE / REPLANIFIE segments
  const scheduledSegments = db
    .prepare(
      `SELECT s.id, s.nom_voie, s.arrondissement, os.date_deb_planif
       FROM operation_statuses os
       JOIN street_segments s ON s.id = os.segment_id
       WHERE os.etat IN (2, 3) AND os.date_deb_planif IS NOT NULL`
    )
    .all() as Array<{
    id: string;
    nom_voie: string;
    arrondissement: string | null;
    date_deb_planif: string;
  }>;

  for (const seg of scheduledSegments) {
    const planifDate = new Date(seg.date_deb_planif);
    const msUntil = planifDate.getTime() - now.getTime();
    const minUntil = msUntil / 60_000;

    const watches = db
      .prepare('SELECT * FROM user_watches WHERE segment_id = ?')
      .all(seg.id) as UserWatch[];

    for (const watch of watches) {
      if (!Expo.isExpoPushToken(watch.push_token)) continue;
      if (isInQuietHours(watch)) continue;

      const street: StreetInfo = { nom_voie: seg.nom_voie, arrondissement: seg.arrondissement };

      // T-60: send if within [58, 62] min window
      if (watch.notify_t60 && minUntil >= 58 && minUntil <= 62) {
        if (!hasRecentNotif(watch.id, 't60', 90)) {
          const { title, body } = buildMessage('t60', street, undefined, seg.date_deb_planif);
          try {
            await expo.sendPushNotificationsAsync([
              {
                to: watch.push_token,
                title,
                body,
                sound: 'default',
                data: { segmentId: seg.id, type: 't60' },
                channelId: 'deneigement',
              },
            ]);
            logNotification(watch.id, 't60', 'sent');
          } catch {
            logNotification(watch.id, 't60', 'failed');
          }
        }
      }

      // T-30: send if within [28, 32] min window
      if (watch.notify_t30 && minUntil >= 28 && minUntil <= 32) {
        if (!hasRecentNotif(watch.id, 't30', 45)) {
          const { title, body } = buildMessage('t30', street, undefined, seg.date_deb_planif);
          try {
            await expo.sendPushNotificationsAsync([
              {
                to: watch.push_token,
                title,
                body,
                sound: 'default',
                data: { segmentId: seg.id, type: 't30' },
                channelId: 'deneigement-urgent',
              },
            ]);
            logNotification(watch.id, 't30', 'sent');
          } catch {
            logNotification(watch.id, 't30', 'failed');
          }
        }
      }
    }
  }
}
