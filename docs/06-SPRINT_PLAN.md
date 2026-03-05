# 06 — Plan de Build (Sprints) + Backlog priorisé

_Alerte Déneigement — MVP en 3 sprints de 1 semaine_

---

## Vue d'ensemble

| Sprint | Thème | Durée | Livrables clés |
|--------|-------|-------|----------------|
| **S1** | Data + Carte + Lookup | Sem. 1 | Backend fonctionnel, carte, recherche adresse |
| **S2** | Suivi + Notifs + Settings | Sem. 2 | Watch flow, push notifications, rappels |
| **S3** | Polish + Parking + Release | Sem. 3 | Stationnements, ASO, soumission stores |

---

## Sprint 1 — Data Pipeline + Carte + Lookup

### Objectifs S1
- Backend deployé sur Railway
- Poller cron opérationnel (Planif-Neige JSON)
- App Expo bootable avec carte + recherche adresse
- Statut d'une rue consultable

### Backlog S1

| ID | Priorité | Story | Effort |
|----|----------|-------|--------|
| B-01 | P0 | Setup repo monorepo + CI/CD GitHub Actions | XS |
| B-02 | P0 | Backend Fastify + SQLite schema | S |
| B-03 | P0 | Service: fetch Planif-Neige JSON + parse | S |
| B-04 | P0 | Import geobase-map.json → street_segments DB | M |
| B-05 | P0 | Cron poller toutes les 2 min + diff statuts | M |
| B-06 | P0 | API: GET /streets/search?q= | S |
| B-07 | P0 | API: GET /streets/:id/status | XS |
| B-08 | P0 | App Expo init + Expo Router setup | S |
| B-09 | P0 | MapView avec tuiles statut (couleurs) | M |
| B-10 | P0 | Barre de recherche adresse | S |
| B-11 | P0 | Écran détail rue (statut + timestamp) | S |
| B-12 | P1 | API: GET /health + /health/data | XS |
| B-13 | P1 | Mode dégradé: banner "Données indisponibles" | S |
| B-14 | P1 | Déploiement Railway (API) | S |

### DoD S1
- ✅ `npm run test` passe (unit tests parsing + routes)
- ✅ Curl `/api/streets/search?q=Saint-Denis` retourne résultats
- ✅ App tourne sur iOS Simulator + Android Emulator
- ✅ Carte montre statuts colorés
- ✅ Recherche adresse → détail rue

---

## Sprint 2 — Suivi Véhicule + Notifications + Settings

### Objectifs S2
- Mode "Je suis stationné ici" complet
- Notifications push fonctionnelles (onChange + T-60)
- Écran settings (quiet hours, rappels)
- Persistance locale (anonId + watches)

### Backlog S2

| ID | Priorité | Story | Effort |
|----|----------|-------|--------|
| B-15 | P0 | API: POST /watches (créer watch) | S |
| B-16 | P0 | API: DELETE /watches/:id | XS |
| B-17 | P0 | API: GET /watches?userId= | XS |
| B-18 | P0 | Expo Notifications setup + permission flow | M |
| B-19 | P0 | Backend: service notif via expo-server-sdk | M |
| B-20 | P0 | Cron: diff status → trigger notifs onChange | M |
| B-21 | P0 | Cron: T-60 notifications (fenêtre ±2 min) | M |
| B-22 | P0 | App: Onboarding 3 écrans (géoloc + notif + mode) | M |
| B-23 | P0 | App: flow "Je suis stationné ici" 1-tap | M |
| B-24 | P0 | App: SecureStore anonId + Zustand watchStore | S |
| B-25 | P0 | App: bloc "Mon véhicule" sur Home | S |
| B-26 | P0 | App: bouton "J'ai déplacé mon auto" | XS |
| B-27 | P1 | App: Écran Settings (quiet hours, rappels) | S |
| B-28 | P1 | Cron: T-30 notifications | S |
| B-29 | P1 | Déduplication notifs (notif_logs) | S |
| B-30 | P1 | Tests E2E: flow watch → notif (Detox ou mock) | M |

### DoD S2
- ✅ Push notification reçue en < 3 min après changement statut (test manuel)
- ✅ T-60 notif envoyée dans la fenêtre [55–65 min]
- ✅ Pas de doublon (idempotent)
- ✅ anonId persisté entre sessions
- ✅ Crash-free > 99% sur 100 sessions test

---

## Sprint 3 — Parking + Favoris + Polish + Release

### Objectifs S3
- Stationnements incitatifs affichés
- Favoris multi-adresses
- Polish UX (dark mode, skeleton, animations)
- ASO + captures d'écran
- Soumission App Store + Play Store

### Backlog S3

| ID | Priorité | Story | Effort |
|----|----------|-------|--------|
| B-31 | P0 | API: GET /parking/incentive (données Ville) | M |
| B-32 | P0 | App: écran + carte stationnements incitatifs | M |
| B-33 | P0 | App: favoris (liste + CRUD) | M |
| B-34 | P0 | App: dark mode natif (useColorScheme) | S |
| B-35 | P0 | App: skeleton loaders (carte + cards) | S |
| B-36 | P0 | App: bannière disclaimer permanente | XS |
| B-37 | P0 | App: bouton "Signaler une erreur" | S |
| B-38 | P0 | Sentry integration (mobile + backend) | S |
| B-39 | P0 | App Store Connect: métadonnées, captures (5) | M |
| B-40 | P0 | Google Play Console: métadonnées, captures | M |
| B-41 | P1 | Widget iOS 16+ (petite taille) | L |
| B-42 | P1 | Widget Android | L |
| B-43 | P1 | Tests accessibilité (VoiceOver audit) | S |
| B-44 | P1 | QA "jour de tempête" (checklist) | S |
| B-45 | P2 | EAS Build CI/CD → TestFlight | M |

### DoD S3
- ✅ `eas build --platform all` réussit
- ✅ Build iOS soumis à TestFlight
- ✅ Build Android soumis en internal testing
- ✅ Onboarding completion > 60% (test 10 utilisateurs)
- ✅ 0 crash sur flows critiques (watch + notif)

---

## Backlog V1.1 (post-MVP)

| Feature | Valeur | Effort |
|---------|--------|--------|
| Prédiction ETA (beta) | Élevée | L |
| Apple Watch complication | Moyenne | L |
| WearOS complication | Moyenne | L |
| Historique opérations | Moyenne | M |
| Option "Supporter l'app" | Monétisation | S |
| Badge supporteur | Engagement | XS |
| Alerte tempête (push opt-in) | Engagement | M |
| Partager mon statut (deep link) | Viral | S |
| Multi-langue (EN) | Marché | L |

---

## Checklist QA "Jour de tempête"

```
[ ] API Planif-Neige accessible (curl test)
[ ] Poller cron actif (logs Railway)
[ ] Notif de test reçue en < 3 min (device réel)
[ ] T-60 notif reçue dans la fenêtre (test clock)
[ ] Carte affiche statuts corrects (comparer site Ville)
[ ] Mode dégradé activé si API down
[ ] Sentry 0 erreurs critiques
[ ] Crash-free > 99.5% (Sentry)
[ ] App Store / Play Store pas en maintenance review
[ ] Railway: RAM < 80%, CPU < 70%
[ ] Réponse API < 200ms (p95)
```

---

## Définition of Done (globale)

- Latence notification < 3 min après changement statut
- Crash-free sessions > 99.5%
- Onboarding completion > 60%
- 0 erreur de régression en test E2E
- Code review passé + tests verts
- Déploiement en staging validé
