# ❄️ Alerte Déneigement

> **Alertes gratuites, à temps.** — L'app qui évite la remorque à Montréal.

[![CI](https://github.com/your-org/alerte-deneigement/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/alerte-deneigement/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

App mobile iOS/Android pour suivre les opérations de déneigement à Montréal.
Alternative gratuite à INFO-Neige (devenu payant), avec UX supérieure.

---

## Structure du repo

```
alerte-deneigement/
├── apps/
│   └── mobile/          # App React Native / Expo
│       ├── app/         # Expo Router screens
│       ├── components/  # UI components réutilisables
│       ├── stores/      # Zustand state management
│       ├── services/    # API client + notifications
│       └── constants/   # Couleurs, design tokens
├── services/
│   └── api/             # Backend Node.js + Fastify
│       └── src/
│           ├── routes/  # Endpoints REST
│           ├── services/ # Data fetcher + notifications
│           ├── workers/ # Cron poller
│           └── db/      # SQLite schema
├── docs/
│   ├── 01-MARKET_ANALYSIS.md
│   ├── 02-PRD.md
│   ├── 03-ARCHITECTURE.md
│   ├── 04-UX_FLOWS.md
│   ├── 05-DESIGN_SYSTEM.md
│   ├── 06-SPRINT_PLAN.md
│   ├── 07-BRANDING_ASO.md
│   └── 08-MONETIZATION.md
└── .github/
    └── workflows/       # CI/CD GitHub Actions
```

---

## Démarrage rapide

### Prérequis

- Node.js 20+
- npm 10+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### 1. Cloner et installer

```bash
git clone https://github.com/your-org/alerte-deneigement.git
cd alerte-deneigement
```

### 2. Variables d'environnement

```bash
cp .env.example services/api/.env
# Éditer services/api/.env (aucune clé requise pour le MVP)
```

### 3. Lancer le backend

```bash
cd services/api
npm install
npm run dev
# API disponible sur http://localhost:3000
```

### 4. Lancer l'app mobile

```bash
cd apps/mobile
npm install
npm start
# Scanner le QR avec Expo Go
```

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| App mobile | React Native + Expo SDK 52 + Expo Router v3 |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Data fetching | TanStack Query v5 |
| Notifications | Expo Push API (APNs + FCM) |
| Backend | Node.js 20 + Fastify v4 + TypeScript |
| Base de données | SQLite (better-sqlite3) |
| Scheduler | node-cron |
| Tests | Vitest (API) + Jest/jest-expo (mobile) |
| CI/CD | GitHub Actions + Railway + EAS |

---

## Source des données

L'app utilise les données ouvertes de la Ville de Montréal (déneigement) :

- **API non-officielle (MVP)** : [ludodefgh/planif-neige-public-api](https://github.com/ludodefgh/planif-neige-public-api) — JSON, mise à jour toutes les 10 min
- **API officielle (production)** : SOAP/WSDL — token requis, contacter `donneesouvertes@montreal.ca`

> ⚠️ La signalisation sur rue prime toujours — cette app est un outil d'aide, pas une garantie légale.

---

## Fonctionnalités MVP

- ✅ Recherche d'adresse + statut rue en temps réel
- ✅ Mode "Je suis stationné ici" (1 tap, sans compte)
- ✅ Notifications push : changement de statut + rappel T-60 + T-30
- ✅ Carte interactive avec couleurs de statut
- ✅ Stationnements incitatifs gratuits
- ✅ Mode invité (aucun compte requis)
- ✅ Dark mode natif
- ✅ Mode dégradé (offline + dernière MAJ)
- ✅ Disclaimer permanent

---

## Déploiement

### Backend (Railway)

```bash
cd services/api
railway login
railway link your-project-id
railway up
```

Variables Railway à configurer :
- `NODE_ENV=production`
- `DB_PATH=/app/data/alerte.db`
- Optionnel : `PLANIF_NEIGE_TOKEN`, `SENTRY_DSN`

### App mobile (EAS)

```bash
cd apps/mobile
eas login
eas init  # Créer le projet EAS
eas build --platform all --profile preview
# Pour soumettre en production :
eas build --platform all --profile production
eas submit --platform ios
eas submit --platform android
```

---

## Checklist App Store

### iOS (App Store Connect)
- [ ] Bundle ID: `ca.alertedeneigement.app`
- [ ] Certificats de distribution configurés dans EAS
- [ ] Titre: "Alerte Déneigement – Montréal"
- [ ] Sous-titre: "Alertes gratuites • Stationnement"
- [ ] Description (voir `docs/07-BRANDING_ASO.md`)
- [ ] Keywords: "info neige,déneigement,stationnement,remorquage,neige montreal,interdiction,chargement,311"
- [ ] 5 captures d'écran (voir `docs/07-BRANDING_ASO.md`)
- [ ] Icône app 1024x1024
- [ ] Age rating: 4+
- [ ] Privacy policy URL

### Android (Google Play Console)
- [ ] Package: `ca.alertedeneigement.app`
- [ ] Titre: "Alerte Déneigement – Alertes gratuites Montréal"
- [ ] Catégorie: Travel & Local
- [ ] 8 captures d'écran
- [ ] Icône adaptative

---

## Checklist QA "Jour de tempête"

```bash
# 1. Vérifier que l'API Planif-Neige est accessible
curl https://raw.githubusercontent.com/ludodefgh/planif-neige-public-api/main/data/planif-neige.json | head -5

# 2. Vérifier le health check API
curl https://your-api.railway.app/api/health

# 3. Vérifier les données
curl https://your-api.railway.app/api/health/data

# 4. Tester une recherche
curl "https://your-api.railway.app/api/streets/search?q=Saint-Denis"

# 5. Vérifier les logs Railway (cron actif)
railway logs --tail 50
```

---

## Tests

```bash
# Backend
cd services/api
npm test

# Mobile
cd apps/mobile
npm test
```

---

## Licence

MIT — Voir [LICENSE](LICENSE)

---

## Contribution

Ce projet utilise les données ouvertes de la Ville de Montréal.
Merci de respecter les conditions d'utilisation des données : [Licence données ouvertes MTL](https://donnees.montreal.ca/pages/licence-d-utilisation)
