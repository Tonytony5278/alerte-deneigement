import type { FastifyInstance } from 'fastify';
import { CITY_CONFIGS } from '../services/cityRegistry';

export async function citiesRoutes(app: FastifyInstance) {
  // GET /api/cities
  app.get('/', async (_req, reply) => {
    return reply.send({ data: CITY_CONFIGS });
  });

  // GET /api/cities/:cityId
  app.get('/:cityId', async (req, reply) => {
    const { cityId } = req.params as { cityId: string };
    const city = CITY_CONFIGS.find((c) => c.id === cityId);
    if (!city) {
      return reply.code(404).send({ error: 'City not found' });
    }
    return reply.send({ data: city });
  });
}
