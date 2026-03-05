# 08 — Monétisation "non irritante"

_Alerte Déneigement_

---

## Principe fondateur

> **Le cœur reste gratuit. Toujours.**
> Les alertes de déneigement et les notifications essentielles ne seront jamais paywallées.
> On monétise le confort et la personnalisation, pas la sécurité.

C'est notre avantage concurrentiel numéro un contre INFO-Neige.

---

## Phase 1 — 0 à 10 000 utilisateurs actifs : ZÉRO paywall

### Objectif
Acquérir la masse critique. Aucune friction financière.

### Monétisation
- **Aucune** sauf :
  - Option "Supporter l'app" : don libre 2$ / 5$ / 10$
  - Placement discret dans Settings → "Soutenir le projet"
  - **Badge cosmétique** "Supporteur ❄️" affiché sur profil (si profil créé)

### Métriques cibles Phase 1
- 10 000 utilisateurs actifs mensuels
- Taux de don : 0,5–1% → ~100 supporteurs → 300–500$/mois
- Objectif : couvrir les frais serveur (< 50$/mois)

---

## Phase 2 — 10 000 à 100 000 utilisateurs : "Plus" optionnel

### Proposition : Alerte Déneigement Plus

**Prix** : 2,99 CAD/an (≈ 0,25$/mois) — ou 1,99$/saison hivernale (6 mois)

**Règle absolue** : la version gratuite reste complète pour 1 adresse principale.

### Features incluses dans Plus

| Feature | Gratuit | Plus |
|---------|---------|------|
| Alertes push sur 1 adresse | ✅ | ✅ |
| Carte temps réel | ✅ | ✅ |
| Stationnements incitatifs | ✅ | ✅ |
| Mode invité (sans compte) | ✅ | ✅ |
| Rappel T-60 | ✅ | ✅ |
| Rappel T-30 | ✅ | ✅ |
| Favoris (max 1 adresse) | ✅ | — |
| **Favoris illimités** | — | ✅ |
| **Widget iOS/Android** | — | ✅ |
| **Historique opérations** | — | ✅ |
| **Prédiction ETA (beta)** | — | ✅ |
| **Thèmes / personnalisation** | — | ✅ |
| Badge "Plus" cosmétique | — | ✅ |

### Règle de conversion A/B

**Test A** : Montrer le paywall après 3e adresse ("Tu en veux plus ? 2,99$/an")
**Test B** : Montrer le paywall après première utilisation widget ("Active le widget — 2,99$/an")
**Test C** : Proposer Plus après une "saved rescue" (notif qui a fonctionné, bouton "On t'a sauvé de la remorque ! Soutiens-nous")

### Métriques cibles Phase 2
- Conversion 3–5% des actifs → 1 500–5 000 abonnés Plus
- ARPU : 1,00–1,50 CAD/an (blended gratuit + Plus)
- MRR : 375–625$/mois (modeste mais croissant)
- Taux de désabonnement annuel : < 30%

---

## Phase 3 — 100 000+ utilisateurs : B2B / B2G

### Option A — Dashboard Immeuble / Condo

**Client cible** : Gestionnaires d'immeubles, syndicats de coproprietaires
**Produit** : Dashboard web + notifications configurables pour leurs résidents
**Prix** : 199$/an par immeuble

**Features**
- Vue centralisée de toutes les rues autour de l'immeuble
- Notifications push aux résidents inscrits via QR code
- Affichage écran lobby (mode tableau de bord)
- Export calendrier des opérations

### Option B — Analytics Anonymisés B2G

**Client cible** : Ville de Montréal / autres municipalités
**Produit** : Dashboard qualité des données open data (latences, erreurs signalées, hotspots)
**Prix** : À négocier (5 000–20 000$/an)

**Proposition de valeur**
- La Ville améliore son propre open data grâce à nos "Signaler une erreur"
- Feedback loop citoyen → amélioration du service public
- Données agrégées 100% anonymisées

---

## Anti-patterns à éviter absolument

| ❌ À ne jamais faire | Raison |
|---------------------|--------|
| Paywall sur les alertes de base | Notre différenciateur vs INFO-Neige |
| Publicités in-app | Pollue UX, crée méfiance |
| Vente de données utilisateurs | Éthique + légal PIPEDA |
| Paywall agressif au démarrage | Tue l'activation |
| Notifications commerciales | Tue la confiance push |
| Forcer la création de compte | Frein à l'activation |
| "Premium" feature cachée derrière modale | Pattern dark |

---

## Expérimentation A/B (framework)

### Infrastructure
- **Feature flags** : react-native-config + backend feature service
- **Analytics** : Amplitude Free (jusqu'à 10M events/mois)
- **Tests** : 50/50 split aléatoire via anonUserId hash

### Tests prévus

| Test | Variante A | Variante B | Métrique |
|------|-----------|-----------|----------|
| Plus paywall trigger | Après 3e favoris | Après widget install | Conversion |
| Prix Plus | 2,99$/an | 4,99$/an | Revenue total |
| Don CTA | Dans Settings | Après notif réussie | CTR don |
| Message Plus | "Ajoute tes adresses" | "Débloque les widgets" | Conversion |
| Quiet hours | Par défaut ON | Par défaut OFF | Rétention notif |

### Décision criteria
- Durée minimum test : 14 jours
- Taille minimum : 500 utilisateurs par variante
- Significance : p < 0.05
