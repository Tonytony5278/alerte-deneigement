import type { FastifyInstance } from 'fastify';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { UnifiedStatus, UNIFIED_STATUS_LABELS } from '../types';

const CreateWatchSchema = z.object({
  segmentId: z.string().min(1).max(100),
  cityId: z.string().min(1).max(20).default('montreal'),
  pushToken: z.string().min(10).max(200),
  anonUserId: z.string().uuid(),
  label: z.string().max(50).optional(),
  config: z
    .object({
      notifyOnChange: z.boolean().default(true),
      notifyT60: z.boolean().default(true),
      notifyT30: z.boolean().default(true),
      quietStart: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .default('22:00'),
      quietEnd: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .default('07:00'),
    })
    .optional(),
});

const UpdateWatchSchema = z.object({
  label: z.string().max(50).optional(),
  config: z
    .object({
      notifyOnChange: z.boolean().optional(),
      notifyT60: z.boolean().optional(),
      notifyT30: z.boolean().optional(),
      quietStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      quietEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    })
    .optional(),
});

export async function watchesRoutes(app: FastifyInstance) {
  // POST /api/watches
  app.post('/', async (req, reply) => {
    const parsed = CreateWatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }

    const { segmentId, cityId, pushToken, anonUserId, label, config: cfg } = parsed.data;
    const db = getDb();

    // Verify segment exists
    const segment = db.prepare('SELECT id FROM street_segments WHERE id = ?').get(segmentId);
    if (!segment) {
      return reply.code(404).send({ error: 'Segment not found' });
    }

    // Check for existing watch (same user + segment)
    const existing = db
      .prepare('SELECT id FROM user_watches WHERE anon_user_id = ? AND segment_id = ?')
      .get(anonUserId, segmentId) as { id: string } | undefined;

    if (existing) {
      return reply.code(409).send({
        error: 'Watch already exists for this segment',
        watchId: existing.id,
      });
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO user_watches
         (id, anon_user_id, segment_id, city_id, push_token, label,
          notify_on_change, notify_t60, notify_t30, quiet_start, quiet_end, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      anonUserId,
      segmentId,
      cityId,
      pushToken,
      label ?? null,
      cfg?.notifyOnChange !== false ? 1 : 0,
      cfg?.notifyT60 !== false ? 1 : 0,
      cfg?.notifyT30 !== false ? 1 : 0,
      cfg?.quietStart ?? '22:00',
      cfg?.quietEnd ?? '07:00',
      new Date().toISOString()
    );

    const watch = db.prepare('SELECT * FROM user_watches WHERE id = ?').get(id);
    return reply.code(201).send({ data: watch });
  });

  // GET /api/watches?userId=
  app.get('/', async (req, reply) => {
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      return reply.code(400).send({ error: 'userId required' });
    }

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT w.*, s.nom_voie, s.type_voie, s.cote, s.arrondissement,
                os.etat, os.date_deb_planif, os.date_fin_planif, os.updated_at
         FROM user_watches w
         LEFT JOIN street_segments s ON s.id = w.segment_id
         LEFT JOIN operation_statuses os ON os.segment_id = w.segment_id
         WHERE w.anon_user_id = ?
         ORDER BY w.created_at DESC`
      )
      .all(userId) as Array<Record<string, unknown>>;

    const watches = rows.map((row) => {
      const etat = row.etat as number | null;
      const dateDebPlanif = row.date_deb_planif as string | null;
      const etatLabel = etat !== null
        ? (UNIFIED_STATUS_LABELS[etat as UnifiedStatus] ?? 'Inconnu')
        : 'Inconnu';

      let towingStatus: 'active' | 'imminent' | 'none' = 'none';
      let towingLabel: string | null = null;
      if (etat === UnifiedStatus.IN_PROGRESS || etat === UnifiedStatus.RESTRICTED) {
        towingStatus = 'active';
        towingLabel = 'Remorquage actif — déplace ton auto !';
      } else if (etat === UnifiedStatus.SCHEDULED && dateDebPlanif) {
        const planifTime = new Date(dateDebPlanif).getTime();
        const now = Date.now();
        if (now >= planifTime) {
          towingStatus = 'active';
          towingLabel = 'Remorquage actif — déplace ton auto !';
        } else if ((planifTime - now) / 3_600_000 <= 12) {
          towingStatus = 'imminent';
          towingLabel = 'Remorquage imminent — panneaux installés';
        }
      }

      return { ...row, etat_label: etatLabel, towing_status: towingStatus, towing_label: towingLabel };
    });

    return reply.send({ data: watches });
  });

  // PUT /api/watches/:watchId
  app.put('/:watchId', async (req, reply) => {
    const { watchId } = req.params as { watchId: string };
    const parsed = UpdateWatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }

    const db = getDb();
    const watch = db.prepare('SELECT id FROM user_watches WHERE id = ?').get(watchId);
    if (!watch) {
      return reply.code(404).send({ error: 'Watch not found' });
    }

    const { label, config: cfg } = parsed.data;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (label !== undefined) { updates.push('label = ?'); values.push(label); }
    if (cfg?.notifyOnChange !== undefined) { updates.push('notify_on_change = ?'); values.push(cfg.notifyOnChange ? 1 : 0); }
    if (cfg?.notifyT60 !== undefined) { updates.push('notify_t60 = ?'); values.push(cfg.notifyT60 ? 1 : 0); }
    if (cfg?.notifyT30 !== undefined) { updates.push('notify_t30 = ?'); values.push(cfg.notifyT30 ? 1 : 0); }
    if (cfg?.quietStart !== undefined) { updates.push('quiet_start = ?'); values.push(cfg.quietStart); }
    if (cfg?.quietEnd !== undefined) { updates.push('quiet_end = ?'); values.push(cfg.quietEnd); }

    if (updates.length > 0) {
      values.push(watchId);
      db.prepare(`UPDATE user_watches SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM user_watches WHERE id = ?').get(watchId);
    return reply.send({ data: updated });
  });

  // DELETE /api/watches/:watchId
  app.delete('/:watchId', async (req, reply) => {
    const { watchId } = req.params as { watchId: string };
    const db = getDb();

    const watch = db.prepare('SELECT id FROM user_watches WHERE id = ?').get(watchId);
    if (!watch) {
      return reply.code(404).send({ error: 'Watch not found' });
    }

    db.prepare('DELETE FROM user_watches WHERE id = ?').run(watchId);
    return reply.code(204).send();
  });
}
