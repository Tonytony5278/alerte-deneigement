# 02 — Product Requirements Document (PRD)

_Alerte Déneigement — v1.0 MVP_

---

## Vision

> **Alertes gratuites, à temps.** — L'app qui évite la remorque à Montréal.

---

## Utilisateurs cibles

| Persona | Description | Pain point principal |
|---------|-------------|----------------------|
| **Le Montréalais avec une voiture** | 25–55 ans, stationne dans la rue | Oublie les opérations, se fait remorquer |
| **Le propriétaire multi-adresses** | Gère plusieurs logements / bureau | Doit surveiller plusieurs rues en même temps |
| **Le migrant INFO-Neige** | A payé INFO-Neige, cherche une alternative | Frustré par le paywall et les inexactitudes |
| **Le nouveau résident** | Vient d'arriver à Montréal | Ne connaît pas le système de déneigement |

---

## Périmètre MVP (Sprint 1–3)

### Must Have (MVP)
- [ ] **M1** — Recherche d'adresse + affichage statut rue
- [ ] **M2** — Mode "Je suis stationné ici" (1 tap, sans compte)
- [ ] **M3** — Notification push : changement de statut
- [ ] **M4** — Notification push : rappel T-60 avant chargement
- [ ] **M5** — Carte interactive des opérations
- [ ] **M6** — Stationnements incitatifs (liste + carte)
- [ ] **M7** — Mode invité complet (pas de compte requis)
- [ ] **M8** — Dark mode natif
- [ ] **M9** — Disclaimer signalisation permanente
- [ ] **M10** — Mode dégradé (offline + "dernière MAJ : il y a X min")

### Should Have (V1.1 — post-MVP)
- [ ] **S1** — Favoris multi-adresses (illimité)
- [ ] **S2** — Rappel T-30 min paramétrable
- [ ] **S3** — Widget iOS (petite + grande taille)
- [ ] **S4** — Widget Android
- [ ] **S5** — "Signaler une erreur" (feedback interne)
- [ ] **S6** — Quiet hours (ne pas notifier la nuit sauf urgence)

### Could Have (V1.2)
- [ ] **C1** — Prédiction ETA (beta avec disclaimer)
- [ ] **C2** — Apple Watch complication
- [ ] **C3** — WearOS complication
- [ ] **C4** — Historique des opérations
- [ ] **C5** — "Option Supporter l'app" (don 2$–10$)

### Won't Have (MVP)
- Compte utilisateur
- Paiement / paywall
- B2B dashboard

---

## User Stories prioritaires

### Epic 1 : Onboarding & Setup

**US-01** — En tant que nouvel utilisateur, je veux autoriser les notifications en comprenant clairement pourquoi, afin d'être alerté avant remorquage.

**US-02** — En tant qu'utilisateur, je veux pouvoir utiliser l'app sans créer de compte, afin d'éviter toute friction.

**US-03** — En tant qu'utilisateur, je veux trouver ma rue en moins de 3 taps, afin de me mettre en surveillance rapidement.

### Epic 2 : Surveillance active

**US-04** — En tant qu'utilisateur stationné, je veux taper "Je suis stationné ici" et être notifié dès qu'une opération est planifiée, afin d'éviter la remorque.

**US-05** — En tant qu'utilisateur, je veux recevoir un rappel 60 minutes avant le début du chargement, afin d'avoir le temps de déplacer mon véhicule.

**US-06** — En tant qu'utilisateur, je veux voir le statut de ma rue en temps réel sur la carte, afin de vérifier visuellement.

### Epic 3 : Gestion d'adresses

**US-07** — En tant qu'utilisateur, je veux sauvegarder plusieurs adresses (maison, travail), afin de surveiller plusieurs véhicules / rues simultanément.

**US-08** — En tant qu'utilisateur, je veux voir un résumé de toutes mes adresses surveillées en un coup d'œil.

### Epic 4 : Fiabilité

**US-09** — En tant qu'utilisateur, je veux voir quand les données ont été mises à jour pour la dernière fois, afin de juger de la fiabilité.

**US-10** — En tant qu'utilisateur, je veux pouvoir signaler une erreur si le statut affiché ne correspond pas à la réalité.

---

## Métriques d'activation & rétention

### Acquisition
- **Installations** (App Store + Play Store)
- **CPI** (Cost Per Install) via Apple Search Ads

### Activation (Jour 1)
- `Onboarding completion rate` : % qui accordent push + localisent une adresse → **Cible : > 65%**
- `First Watch Created` : % qui créent une surveillance → **Cible : > 50%**

### Rétention
- `D7 retention` : reviennent dans les 7 jours → **Cible : > 40%**
- `D30 retention` → **Cible : > 25%**
- `Saison retention` : actifs sur toute la saison hivernale → **Cible : > 60%**

### Notifications
- `Notification CTR` : % qui ouvrent la notif → **Cible : > 30%**
- `Notification opt-out rate` → **Cible : < 5%**
- `Notification latency` : délai entre changement statut et réception → **Cible : < 3 min**

### Qualité
- `Crash-free sessions` → **Cible : > 99.5%**
- `API availability` → **Cible : > 99%**
- `Error report rate` (bouton "Signaler") → indicateur de précision des données

### Monétisation (Phase 2)
- `Supporter conversion rate` → **Cible : 1–3% des actifs**
- `Plus subscription rate` (si lancé) → **Cible : 5% des actifs multi-adresses**

---

## Contraintes non-fonctionnelles

| Contrainte | Valeur cible |
|------------|-------------|
| Latence notification | < 3 minutes |
| Taille app (iOS) | < 30 MB |
| Taille app (Android) | < 25 MB |
| Cold start | < 2 secondes |
| Offline graceful | Afficher dernière MAJ + banner |
| WCAG AA | Contraste ≥ 4.5:1, taille min 16sp |
| Langues | Français canadien uniquement (MVP) |

---

## Risques

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Données open data indisponibles | Élevé | Moyen | Cache local + mode dégradé |
| Changement API Ville Montréal | Élevé | Faible | Abstraction couche data |
| Tickets Apple Review (push aggressif) | Moyen | Faible | Respecter guidelines HIG |
| Concurrence 311 améliorée | Moyen | Moyen | Vitesse + UX + features widget |
| Prédiction inexacte → mauvaise presse | Élevé | Moyen | Disclaimer beta + opt-in |
