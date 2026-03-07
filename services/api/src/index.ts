import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import 'dotenv/config';

import { config } from './config';
import { getDb } from './db';
import { streetsRoutes } from './routes/streets';
import { watchesRoutes } from './routes/watches';
import { parkingRoutes } from './routes/parking';
import { notificationsRoutes } from './routes/notifications';
import { citiesRoutes } from './routes/cities';
import { reportsRoutes } from './routes/reports';
import { startPoller, getPollerStatus } from './workers/poller';

const app = Fastify({
  logger: {
    level: config.isProduction ? 'warn' : 'info',
    transport: config.isDevelopment
      ? { target: 'pino-pretty' }
      : undefined,
  },
});

async function bootstrap() {
  // CORS
  await app.register(cors, {
    origin: config.isProduction ? config.allowedOrigins : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    errorResponseBuilder: () => ({
      error: 'Too many requests — please slow down',
      statusCode: 429,
    }),
  });

  // Routes
  await app.register(streetsRoutes, { prefix: '/api/streets' });
  await app.register(watchesRoutes, { prefix: '/api/watches' });
  await app.register(parkingRoutes, { prefix: '/api/parking' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(citiesRoutes, { prefix: '/api/cities' });
  await app.register(reportsRoutes, { prefix: '/api/reports' });

  // Health check
  app.get('/api/health', async () => {
    const db = getDb();
    const syncLog = db
      .prepare('SELECT * FROM data_sync_log ORDER BY synced_at DESC LIMIT 1')
      .get() as Record<string, unknown> | undefined;

    return {
      status: 'ok',
      version: '1.0.0',
      env: config.nodeEnv,
      poller: getPollerStatus(),
      lastSync: syncLog ?? null,
    };
  });

  app.get('/api/health/data', async () => {
    const db = getDb();
    const counts = db
      .prepare(`
        SELECT
          (SELECT COUNT(*) FROM street_segments) AS segments,
          (SELECT COUNT(*) FROM operation_statuses) AS statuses,
          (SELECT COUNT(*) FROM user_watches) AS watches,
          (SELECT COUNT(*) FROM street_segments_fts) AS fts_rows
      `)
      .get() as { segments: number; statuses: number; watches: number; fts_rows: number };

    // Quick FTS benchmark
    const t0 = performance.now();
    db.prepare(`SELECT s.id FROM street_segments s
      INNER JOIN street_segments_fts fts ON fts.rowid = s.rowid
      LEFT JOIN operation_statuses os ON os.segment_id = s.id
      WHERE fts.nom_voie MATCH '"fullum"*' LIMIT 5`).all();
    const ftsMs = Math.round(performance.now() - t0);

    const t1 = performance.now();
    db.prepare(`SELECT s.id FROM street_segments s
      LEFT JOIN operation_statuses os ON os.segment_id = s.id
      WHERE s.nom_voie LIKE '%fullum%' COLLATE NOCASE LIMIT 5`).all();
    const likeMs = Math.round(performance.now() - t1);

    const latest = db
      .prepare('SELECT MAX(updated_at) AS latest FROM operation_statuses')
      .get() as { latest: string | null };

    return {
      ...counts,
      latestStatusUpdate: latest.latest,
      poller: getPollerStatus(),
      searchBenchmark: { ftsMs, likeMs },
    };
  });

  // Global error handler
  app.setErrorHandler((error, _req, reply) => {
    app.log.error(error);
    const status = error.statusCode ?? 500;
    return reply.code(status).send({
      error: status === 500 ? 'Internal server error' : error.message,
      statusCode: status,
    });
  });

  // 404 handler
  app.setNotFoundHandler((_req, reply) => {
    return reply.code(404).send({ error: 'Route not found' });
  });

  // Start server
  await app.listen({ port: config.port, host: config.host });
  app.log.info(`Alerte Déneigement API running on ${config.host}:${config.port}`);

  // Start background poller
  startPoller();
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await app.close();
  process.exit(0);
});

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
