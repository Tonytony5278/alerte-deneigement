import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db';

const RegisterSchema = z.object({
  pushToken: z.string().min(10).max(200),
  anonUserId: z.string().uuid(),
});

export async function notificationsRoutes(app: FastifyInstance) {
  // POST /api/notifications/register
  // Called on app startup to update push token for all watches
  app.post('/register', async (req, reply) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }

    const { pushToken, anonUserId } = parsed.data;
    const db = getDb();

    const result = db
      .prepare('UPDATE user_watches SET push_token = ? WHERE anon_user_id = ?')
      .run(pushToken, anonUserId);

    return reply.send({
      updated: result.changes,
      message: result.changes > 0
        ? `Token updated for ${result.changes} watch(es)`
        : 'No watches found for this user — token will be used when creating watches',
    });
  });
}
