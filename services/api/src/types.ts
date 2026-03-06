// ─── Unified status (all cities) ──────────────────────────────────────────
export enum UnifiedStatus {
  UNKNOWN     = 0,
  NORMAL      = 1,   // Snow present, no operation imminent
  SCHEDULED   = 2,   // Operation planned
  IN_PROGRESS = 3,   // Currently clearing — MOVE YOUR CAR
  COMPLETED   = 4,   // Clearing done
  RESTRICTED  = 5,   // Parking prohibited
}

export const UNIFIED_STATUS_LABELS: Record<UnifiedStatus, string> = {
  [UnifiedStatus.UNKNOWN]:     'Inconnu',
  [UnifiedStatus.NORMAL]:      'Normal',
  [UnifiedStatus.SCHEDULED]:   'Planifié',
  [UnifiedStatus.IN_PROGRESS]: 'En cours — Déplace-toi !',
  [UnifiedStatus.COMPLETED]:   'Terminé',
  [UnifiedStatus.RESTRICTED]:  'Interdit',
};

export interface CityConfig {
  id: string;
  name: string;
  nameShort: string;
  available: boolean;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
}

export interface NormalizedSegment {
  externalId: string;
  cityId: string;
  nomVoie: string;
  lat: number | null;
  lng: number | null;
  status: UnifiedStatus;
  planifStart: string | null;
  planifEnd: string | null;
  /** Polyline geometry: array of [lng, lat] coordinate pairs (GeoJSON order) */
  geometry?: number[][] | null;
}

// ─── Montreal-specific (legacy) ────────────────────────────────────────────
export enum EtatDeneig {
  ENNEIGE = 0,
  DENEIGE = 1,
  PLANIFIE = 2,
  REPLANIFIE = 3,
  ATTENTE_REPLANIFICATION = 4,
  EN_COURS = 5,
  ENTRE_OPERATIONS = 10,
}

export const ETAT_LABELS: Record<number, string> = {
  [EtatDeneig.ENNEIGE]: 'Enneigé',
  [EtatDeneig.DENEIGE]: 'Déneigé',
  [EtatDeneig.PLANIFIE]: 'Planifié',
  [EtatDeneig.REPLANIFIE]: 'Replanifié',
  [EtatDeneig.ATTENTE_REPLANIFICATION]: 'En attente de replanification',
  [EtatDeneig.EN_COURS]: 'En cours',
  [EtatDeneig.ENTRE_OPERATIONS]: 'Entre opérations',
};

export interface StreetSegment {
  id: string;
  nom_voie: string;
  type_voie: string | null;
  debut_adresse: number | null;
  fin_adresse: number | null;
  cote: string | null;
  arrondissement: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface OperationStatus {
  segment_id: string;
  etat: number;
  date_deb_planif: string | null;
  date_fin_planif: string | null;
  updated_at: string;
  source_ts: string | null;
}

export interface StreetWithStatus extends StreetSegment {
  status: OperationStatus | null;
  etat_label: string;
}

export interface UserWatch {
  id: string;
  anon_user_id: string;
  segment_id: string;
  push_token: string;
  label: string | null;
  notify_on_change: 0 | 1;
  notify_t60: 0 | 1;
  notify_t30: 0 | 1;
  quiet_start: string;
  quiet_end: string;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  watch_id: string;
  type: 'status_change' | 't60' | 't30' | 'in_progress' | 'storm_alert';
  sent_at: string;
  status: 'sent' | 'failed';
}

// Planif-Neige raw record from unofficial API
export interface PlanifNeigeRecord {
  mun_id: string;
  cote_rue_id: string;
  etat_deneig: number;
  date_deb_planif: string | null;
  date_fin_planif: string | null;
  date_maj: string;
}

// Geobase map entry
export interface GeobaseEntry {
  nom_voie: string;
  type_voie: string;
  debut_adresse: number;
  fin_adresse: number;
  cote: string;
  nom_ville: string;
}

export interface NotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
  channelId?: string;
}

export type NotificationType = 'status_change' | 't60' | 't30' | 'in_progress' | 'storm_alert';
