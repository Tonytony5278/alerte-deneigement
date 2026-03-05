# 03 — Architecture Technique

_Alerte Déneigement — Stack & Data Pipeline_

---

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTS MOBILES                          │
│   iOS (Expo/RN)              Android (Expo/RN)             │
│   ┌──────────┐               ┌──────────┐                  │
│   │  App UI  │               │  App UI  │                  │
│   │  Widget  │               │  Widget  │                  │
│   └────┬─────┘               └────┬─────┘                  │
└────────┼────────────────────────┼──────────────────────────┘
         │ HTTPS REST             │ HTTPS REST
         ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API                              │
│   Fastify + TypeScript  (Railway / Fly.io)                  │
│   ┌─────────────┐  ┌────────────┐  ┌──────────────────┐   │
│   │  /streets   │  │  /watches  │  │  /notifications  │   │
│   └──────┬──────┘  └─────┬──────┘  └────────┬─────────┘   │
│          │               │                  │              │
│   ┌──────▼───────────────▼──────────────────▼──────────┐  │
│   │              SQLite (better-sqlite3)                 │  │
│   │  streets | statuses | watches | notif_logs          │  │
│   └──────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │         POLLER CRON (node-cron, every 2 min)        │  │
│   │  1. Fetch Planif-Neige JSON                         │  │
│   │  2. Diff avec statuts en DB                         │  │
│   │  3. Déclencher notifications ciblées                │  │
│   └─────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼──────────────┐
         ▼             ▼              ▼
┌──────────────┐ ┌──────────┐ ┌───────────────────┐
│ Planif-Neige │ │  Expo    │ │  APNs / FCM       │
│ JSON API     │ │  Push    │ │  (Apple / Google) │
│ (open data)  │ │  Service │ │                   │
└──────────────┘ └──────────┘ └───────────────────┘
```

---

## Stack technique

### Mobile (apps/mobile)

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Framework | **React Native + Expo SDK 52** | Cross-platform, rapide à déployer, OTA updates |
| Navigation | **Expo Router v3** (file-based) | Simplicité, deep linking natif |
| Carte | **React Native Maps** + Google Maps | Mature, géré par Expo |
| State | **Zustand** | Léger, simple, pas de boilerplate |
| Data fetching | **TanStack Query v5** | Cache, background refetch, offline |
| Notifications | **Expo Notifications** | Abstraction APNs/FCM |
| Localisation | **Expo Location** | Permission gérée |
| Storage | **Expo SecureStore + AsyncStorage** | anonId sécurisé |
| Widgets | **react-native-widget-extension** | iOS 16+ lock screen |
| Tests | **Jest + Testing Library** | |

### Backend (services/api)

| Composant | Choix | Justification |
|-----------|-------|---------------|
| Runtime | **Node.js 20 LTS + TypeScript** | Stable, ecosystem |
| Framework | **Fastify v4** | Performances, schema validation |
| ORM / DB | **better-sqlite3** (SQLite) | Zero-config, parfait pour V1 |
| Cache | **node-cache** (in-memory) | Pas de Redis pour MVP |
| Scheduler | **node-cron** | Simple, intégré |
| Push | **expo-server-sdk** | Gère APNs + FCM via Expo |
| HTTP client | **undici** | Rapide, natif Node 18+ |
| Validation | **Zod** | Runtime type safety |
| Tests | **Vitest** | Rapide, compatible TypeScript |
| Monitoring | **Sentry** (SDK Node) | Erreurs + perf |

### Infrastructure

| Service | Provider | Coût estimé MVP |
|---------|----------|-----------------|
| API hosting | **Railway** (hobby) | 5$/mois |
| DB backup | Railway volumes | Inclus |
| Push notifications | **Expo Push API** | Gratuit (< 1M/mois) |
| DNS / TLS | Railway + Cloudflare | Gratuit |
| CI/CD | **GitHub Actions** | Gratuit |
| Monitoring | **Sentry free** | Gratuit |
| App Store | Apple Developer | 99$/an |
| Play Store | Google Developer | 25$ one-time |

---

## Modèle de données

### Table : `street_segments`
```sql
CREATE TABLE street_segments (
  id            TEXT PRIMARY KEY,    -- cote_rue_id
  nom_voie      TEXT NOT NULL,
  type_voie     TEXT,
  debut_adresse INTEGER,
  fin_adresse   INTEGER,
  cote          TEXT,               -- 'gauche' | 'droite'
  arrondissement TEXT,
  lat           REAL,               -- centroid
  lng           REAL,
  created_at    TEXT NOT NULL
);
CREATE INDEX idx_segments_nom_voie ON street_segments(nom_voie COLLATE NOCASE);
```

### Table : `operation_statuses`
```sql
CREATE TABLE operation_statuses (
  segment_id       TEXT PRIMARY KEY,
  etat             INTEGER NOT NULL,  -- 0..10
  date_deb_planif  TEXT,
  date_fin_planif  TEXT,
  updated_at       TEXT NOT NULL,
  source_ts        TEXT,
  FOREIGN KEY (segment_id) REFERENCES street_segments(id)
);
```

### Table : `user_watches`
```sql
CREATE TABLE user_watches (
  id               TEXT PRIMARY KEY,
  anon_user_id     TEXT NOT NULL,
  segment_id       TEXT NOT NULL,
  push_token       TEXT NOT NULL,
  label            TEXT,            -- "Devant chez moi"
  notify_on_change INTEGER DEFAULT 1,
  notify_t60       INTEGER DEFAULT 1,
  notify_t30       INTEGER DEFAULT 1,
  quiet_start      TEXT DEFAULT '22:00',
  quiet_end        TEXT DEFAULT '07:00',
  created_at       TEXT NOT NULL,
  FOREIGN KEY (segment_id) REFERENCES street_segments(id)
);
CREATE INDEX idx_watches_segment   ON user_watches(segment_id);
CREATE INDEX idx_watches_anon_user ON user_watches(anon_user_id);
```

### Table : `notification_logs`
```sql
CREATE TABLE notification_logs (
  id        TEXT PRIMARY KEY,
  watch_id  TEXT NOT NULL,
  type      TEXT NOT NULL,   -- 'status_change'|'t60'|'t30'|'in_progress'
  sent_at   TEXT NOT NULL,
  status    TEXT NOT NULL,   -- 'sent'|'failed'
  FOREIGN KEY (watch_id) REFERENCES user_watches(id)
);
CREATE INDEX idx_notif_watch ON notification_logs(watch_id, type, sent_at);
```

---

## Codes de statut (étatDéneig)

| Code | Label FR | Couleur | Action notification |
|------|----------|---------|---------------------|
| 0 | Enneigé | Gris | — |
| 1 | Déneigé | Vert | — |
| 2 | Planifié | Orange | Notif immédiate |
| 3 | Replanifié | Orange foncé | Notif immédiate |
| 4 | En attente de replanification | Jaune | — |
| 5 | En cours | Rouge | Notif URGENTE |
| 10 | Entre opérations | Bleu clair | — |

---

## Data Pipeline — Séquence

```
[Cron : toutes les 2 min]
         │
         ▼
  Fetch planif-neige.json
  (URL GitHub raw / officiel)
         │
         ▼
  Pour chaque segment dans JSON :
    1. Lire statut précédent en DB
    2. Si statut changé :
       a. UPDATE operation_statuses
       b. Query user_watches WHERE segment_id = ?
       c. Pour chaque watch :
          - Si notify_on_change = 1 → queue notif "Statut changé"
          - Si nouvel état = 5 → queue notif "URGENT : en cours"
    3. Si statut = 2 ou 3 (Planifié) :
       - Calculer T-60 = date_deb_planif - 60 min
       - Calculer T-30 = date_deb_planif - 30 min
         │
         ▼
  [Cron : toutes les 5 min]
  Pour chaque segment PLANIFIÉ :
    - Si now ∈ [T-60 - 2min, T-60 + 2min] → envoyer notif T-60
    - Si now ∈ [T-30 - 2min, T-30 + 2min] → envoyer notif T-30
    - Vérifier notif_logs pour éviter doublon (fenêtre 2h)
         │
         ▼
  Expo Push API → APNs / FCM
```

---

## API REST — Endpoints

### Streets
```
GET  /api/streets/search?q={address}&limit=10
GET  /api/streets/:segmentId
GET  /api/streets/:segmentId/status
GET  /api/streets/nearby?lat={}&lng={}&radius=500
```

### Watches
```
POST   /api/watches               Body: { segmentId, pushToken, anonUserId, config }
GET    /api/watches?userId={anonId}
PUT    /api/watches/:watchId       Body: { config }
DELETE /api/watches/:watchId
```

### Notifications
```
POST /api/notifications/register   Body: { pushToken, anonUserId }
```

### Parking
```
GET /api/parking/incentive?lat={}&lng={}&radius=2000
```

### Health
```
GET /api/health
GET /api/health/data    → { lastUpdate, recordCount, status }
```

---

## Sécurité & Vie Privée

- **Aucun compte** : identifiant anonyme généré côté client (UUID v4 stocké dans SecureStore)
- **Données stockées** : `anonUserId`, `segmentId`, `pushToken`, config rappels
- **Données non stockées** : adresse réelle, nom, email, numéro de plaque
- **pushToken** : lié à l'appareil, pas à une personne
- **Rétention** : watches supprimées après 6 mois d'inactivité (CRON)
- **HTTPS** : TLS 1.3 obligatoire
- **Rate limiting** : 100 req/min par IP sur API

---

## Mode dégradé

1. Si API Planif-Neige indisponible → afficher bannière "Données temporairement indisponibles" + horodatage dernière MAJ
2. Si backend down → app mobile affiche dernier état connu (TanStack Query cache)
3. Si notification non livrée → Expo Push le détecte → log + retry 1x
