import type { FastifyInstance } from 'fastify';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const CreateReportSchema = z.object({
  segmentId: z.string().min(1).max(100),
  anonUserId: z.string().uuid().optional(),
  type: z.enum(['wrong_status', 'wrong_address', 'other']).default('wrong_status'),
  notes: z.string().max(500).optional(),
});

export async function reportsRoutes(app: FastifyInstance) {
  // POST /api/reports
  app.post('/', async (req, reply) => {
    const parsed = CreateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }

    const { segmentId, anonUserId, type, notes } = parsed.data;
    const db = getDb();

    const segment = db.prepare('SELECT id FROM street_segments WHERE id = ?').get(segmentId);
    if (!segment) {
      return reply.code(404).send({ error: 'Segment not found' });
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO user_reports (id, segment_id, anon_user_id, type, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, segmentId, anonUserId ?? null, type, notes ?? null, new Date().toISOString());

    return reply.code(201).send({ data: { id } });
  });

  // GET /api/reports (internal — for reviewing reports)
  app.get('/', async (req, reply) => {
    const db = getDb();
    const reports = db
      .prepare(
        `SELECT r.*, s.nom_voie, s.city_id
         FROM user_reports r
         LEFT JOIN street_segments s ON s.id = r.segment_id
         ORDER BY r.created_at DESC
         LIMIT 200`
      )
      .all();
    return reply.send({ data: reports });
  });
}
