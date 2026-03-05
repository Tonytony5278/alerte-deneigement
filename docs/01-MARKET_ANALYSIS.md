# 01 — Analyse marché & avis utilisateurs

_Alerte Déneigement — Montréal_

---

## 1.1 Contexte : La fenêtre d'opportunité

| Fait | Source |
|------|--------|
| INFO-Neige a reçu **+500 000 téléchargements** en 10 ans | CBC News |
| La Ville a **retiré son financement** fin 2025 | CBC News |
| INFO-Neige est passé à **4,99 $/saison** (optionnel mais limité sans) | Sidekick Interactive |
| L'app **311 Montréal** (gratuite) a répliqué les features en déc. 2025 | montreal.ca |
| Note App Store INFO-Neige : **2,9 / 5** (131 avis) | App Store |
| 311 Montréal : ~67 365 téléchargements en 6 semaines | CBC News |

**Signal clé :** Des centaines de milliers d'usagers habitués à INFO-Neige sont maintenant face à un paywall ou doivent migrer vers une app municipal moins ergonomique. C'est la fenêtre.

---

## 1.2 Classification des griefs (100 avis synthétisés)

| Catégorie | % estimé | Citations courtes | Opportunité produit |
|-----------|----------|-------------------|---------------------|
| **Paywall / prix** | 38 % | "PAYANT !", "Vol de service public", "4,99$ c'est du vol", "Gratuit avant" | Gratuit sans compromis sur les alertes |
| **Notifs en retard / absentes** | 24 % | "Notif jamais reçue", "Trop tard", "Remorqué malgré l'app" | Latence < 3 min, backup SMS |
| **Inexactitudes carte / statut** | 19 % | "190$ de ticket", "Rue déneigée mais app dit en cours", "Infos fausses" | Disclaimer signalisation + bouton "Signaler erreur" |
| **UX lente / bugs / crash** | 10 % | "App plante", "Carte lente", "Freeze" | Skeleton loaders, offline mode |
| **Compte / friction** | 6 % | "Pourquoi créer un compte ?", "Géoloc forcée" | Mode invité, 1-tap |
| **Alternatives mentionnées** | 3 % | "311 fait ça gratis", "Site Ville suffit" | Surclasser sur UX et prédiction |

### Citations représentatives

> _"Cet app était gratuit. Maintenant ils veulent 5$. Les données appartiennent à la Ville, pas à eux."_

> _"J'ai reçu une notification 2 heures après que mon auto a été remorquée. 190$ de perdu."_

> _"L'app dit 'aucun chargement prévu' mais la rue était bloquée depuis ce matin."_

> _"Trop compliqué. Fallait créer un compte juste pour surveiller ma rue."_

> _"311 Montréal fait exactement la même chose, gratuitement."_

---

## 1.3 Analyse concurrentielle

### Tableau comparatif

| Feature | INFO-Neige | 311 Montréal | **Alerte Déneigement** |
|---------|-----------|--------------|------------------------|
| Gratuit, sans compte | ❌ (paywall notifs) | ✅ (compte requis) | ✅ **Mode invité complet** |
| Notif statut changé | 💰 payant | ✅ | ✅ |
| Rappel T-60 min | 💰 payant | ✅ | ✅ |
| Rappel T-30 min | ❌ | ❌ | ✅ **Différenciateur** |
| Multi-adresses | ❌ | Limité | ✅ illimité |
| Widget iOS/Android | ❌ | ❌ | ✅ **Différenciateur** |
| Prédiction ETA | ❌ | ❌ | 🔜 Beta V1.1 |
| Apple Watch / WearOS | ❌ | ❌ | 🔜 V1.2 |
| Mode sombre | Partiel | Partiel | ✅ Natif |
| Accès hors ligne | ❌ | ❌ | ✅ Last known state |
| "Signaler une erreur" | ❌ | ❌ | ✅ **Différenciateur** |
| Stationnements incitatifs | ✅ | ✅ | ✅ |
| Open source / transparent | ❌ | ❌ | 🔜 |

### Positionnement de la donnée

- Source officielle : SOAP/XML avec token (email `donneesouvertes@montreal.ca`)
- Source MVP : API JSON non-officielle Planif-Neige (GitHub, mise à jour toutes les 10 min)
- **Notre stratégie** : obtenir le token officiel + garder le fallback non-officiel
- Disclaimer légal obligatoire : _"La signalisation sur rue prime toujours — cette app est un outil d'aide, pas une garantie."_

---

## 1.4 Taille de marché adressable

| Segment | Estimation |
|---------|-----------|
| Résidents Montréal avec voiture | ~500 000 ménages |
| Utilisateurs actuels INFO-Neige | ~150 000 actifs |
| Objectif 6 mois | **20 000 utilisateurs actifs** |
| Objectif 18 mois | **75 000 utilisateurs actifs** |

---

## 1.5 Conclusion stratégique

**Notre avantage est temporel.** La fenêtre de migration est ouverte pendant les 1–2 premières tempêtes de l'hiver 2025-26. Chaque utilisateur déçu par le paywall d'INFO-Neige est un client potentiel.

**Moat défendable :**
1. UX supérieure (onboarding < 30s, mode invité)
2. Notifications plus rapides et multi-étapes
3. Confiance (open data transparent + disclaimer honnête)
4. Gratuit pour toujours sur l'essentiel
