import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  host: optional('HOST', '0.0.0.0'),
  nodeEnv: optional('NODE_ENV', 'development'),

  dbPath: optional('DB_PATH', './data/alerte.db'),

  // Planif-Neige unofficial JSON API (fallback / MVP)
  planifNeigeJsonUrl: optional(
    'PLANIF_NEIGE_JSON_URL',
    'https://raw.githubusercontent.com/ludodefgh/planif-neige-public-api/main/data/planif-neige.json'
  ),
  geobaseMapUrl: optional(
    'GEOBASE_MAP_URL',
    'https://raw.githubusercontent.com/ludodefgh/planif-neige-public-api/main/data/geobase-map.json'
  ),
  // Optional: JSON mapping cote_rue_id → [[lng, lat], ...] for Montreal polyline geometry
  geobaseGeometryUrl: optional('GEOBASE_GEOMETRY_URL', ''),

  // Official SOAP API (optional — requires token from Ville de MTL)
  officialApiToken: optional('PLANIF_NEIGE_TOKEN', ''),
  officialApiUrl: optional(
    'PLANIF_NEIGE_WSDL',
    'https://servicesenligne2.ville.montreal.qc.ca/api/infoneige/InfoneigeWebService'
  ),

  // Cron intervals
  pollIntervalMinutes: parseInt(optional('POLL_INTERVAL_MINUTES', '2'), 10),
  t60CheckIntervalMinutes: parseInt(optional('T60_CHECK_INTERVAL_MINUTES', '5'), 10),

  // Expo push
  // No token needed for Expo Push API — it's public

  // CORS
  allowedOrigins: optional('ALLOWED_ORIGINS', 'https://alertneige.app,https://www.alertneige.app,http://localhost:3001,http://localhost:8081,http://localhost:19006').split(','),

  // Rate limiting
  rateLimit: {
    max: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
    timeWindow: optional('RATE_LIMIT_WINDOW', '1 minute'),
  },

  // Sentry
  sentryDsn: optional('SENTRY_DSN', ''),

  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDevelopment: optional('NODE_ENV', 'development') === 'development',
} as const;
