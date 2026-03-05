# 04 — UX Flows & Maquettes textuelles

_Alerte Déneigement — MVP_

---

## Onboarding (≤ 30 secondes)

```
┌─────────────────────────────────────┐
│            ÉCRAN 1 / 3              │
│                                     │
│      ❄️  Alerte Déneigement         │
│                                     │
│  "Évite la remorque cet hiver."     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  📍  Activer la localisation │   │
│  │  Pour trouver ta rue auto   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Activer la localisation]          │ ← bouton primary
│  [Pas maintenant]                   │ ← skip (recherche manuelle)
└─────────────────────────────────────┘
         ↓ (si accordé ou skip)
┌─────────────────────────────────────┐
│            ÉCRAN 2 / 3              │
│                                     │
│      🔔  Reçois les alertes         │
│                                     │
│  "On t'envoie un push avant         │
│   le début du chargement —          │
│   bien avant la remorque."          │
│                                     │
│  [Activer les notifications]        │ ← bouton primary
│  [Pas maintenant]                   │ ← skip
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│            ÉCRAN 3 / 3              │
│                                     │
│    Comment veux-tu commencer ?      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🚗  Je suis stationné ici  │   │ ← 1 tap, géoloc
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  🔍  Je surveille une adresse│   │ ← champ de recherche
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Écran principal (Home)

```
┌─────────────────────────────────────┐
│  ❄️ Alerte Déneigement     ⚙️       │
│─────────────────────────────────────│
│  ╔═══════════════════════════════╗  │
│  ║          CARTE                ║  │
│  ║   [tuiles couleur statut]     ║  │
│  ║   📍 Ma position              ║  │
│  ║   [zoom +/-]                  ║  │
│  ╚═══════════════════════════════╝  │
│─────────────────────────────────────│
│  ⚠️  La signalisation sur rue prime │ ← bannière permanente
│─────────────────────────────────────│
│  MON VÉHICULE                       │
│  ┌─────────────────────────────┐   │
│  │ 123 Rue Saint-Denis, côté N │   │
│  │ ● Planifié  •  Màj: 14:23  │   │ ← chip orange
│  │ Début prévu: 16h00–22h00    │   │
│  │                             │   │
│  │ [🔔 Rappels: 60min ✓ 30min ✓]│  │
│  │ [✅ J'ai déplacé mon auto]  │   │ ← stop suivi
│  └─────────────────────────────┘   │
│─────────────────────────────────────│
│  FAVORIS                            │
│  ┌──────────────────────────────┐  │
│  │ 🏠 Chez moi       ● Planifié │  │
│  │ 💼 Bureau         ✅ Déneigé  │  │
│  │ + Ajouter une adresse        │  │
│  └──────────────────────────────┘  │
│─────────────────────────────────────│
│  STATIONNEMENTS INCITATIFS          │
│  ┌──────────────────────────────┐  │
│  │ 📍 Métro Crémazie    0.8 km  │  │
│  │ 📍 Métro Jean-Talon  1.2 km  │  │
│  │ Voir la carte →              │  │
│  └──────────────────────────────┘  │
│─────────────────────────────────────│
│  🏠 Accueil  ⭐ Favoris  🅿️ Parking │ ← tab bar
└─────────────────────────────────────┘
```

---

## États du statut de rue

| État | Couleur | Icône | Label | Sous-texte |
|------|---------|-------|-------|------------|
| Aucun chargement prévu | Vert (#22C55E) | ✅ | Déneigé | "Pas d'opération prévue" |
| Planifié | Orange (#F97316) | 🕐 | Planifié | "Prévu: HH:mm–HH:mm" |
| Replanifié | Orange foncé (#EA580C) | 🔄 | Replanifié | "Nouvelle plage: HH:mm" |
| En attente | Jaune (#EAB308) | ⏳ | En attente | "Heure à confirmer" |
| En cours | Rouge (#EF4444) | 🚛 | En cours — Déplace-toi! | "Opération active" |
| Entre opérations | Bleu clair (#60A5FA) | 🔵 | Entre opérations | "Prochaine op. à venir" |
| Enneigé | Gris (#9CA3AF) | ❄️ | Enneigé | "Aucune op. récente" |
| Inconnu / erreur | Gris foncé (#6B7280) | ❓ | Statut inconnu | "Données indisponibles" |

---

## Flow "Je suis stationné ici" (1 tap)

```
[Tap] "Je suis stationné ici"
         │
         ▼
  Géoloc précise demandée (si pas accordée → demande)
         │
         ▼
  Recherche segment le plus proche (rayon 100m)
         │
     ┌───┴────────────────────────────┐
     │ Segment trouvé                 │ Aucun segment
     │                                │   ↓
     ▼                                │ "Adresse non reconnue,
  Affiche confirmation :              │  cherche manuellement"
  ┌─────────────────────────────┐    │
  │ 📍 123 Rue Saint-Denis     │    │
  │    côté nord                │    │
  │    ● Planifié               │    │
  │                             │    │
  │  [✅ Confirmer la rue]      │    │
  │  [🔄 Changer d'adresse]    │    │
  └─────────────────────────────┘    │
         │                           │
         ▼                           │
  Watch créée en DB                  │
  Notifications configurées          │
  Retour Home avec bloc actif        │
```

---

## Écran détail rue

```
┌─────────────────────────────────────┐
│  ← Retour                           │
│─────────────────────────────────────│
│  123 Rue Saint-Denis                │
│  Plateau-Mont-Royal, côté nord      │
│─────────────────────────────────────│
│  ● PLANIFIÉ                         │ ← chip statut
│─────────────────────────────────────│
│  TIMELINE                           │
│  ─────────────────────────────────  │
│  ✅ Dernière MAJ : auj. 14:23       │
│  📅 Interdiction : 16h00 → 22h00   │
│  🚛 Chargement planifié : ce soir  │
│─────────────────────────────────────│
│  MES RAPPELS                        │
│  ┌─────────────────────────────┐   │
│  │ 🔔 60 min avant   [ON  ●]  │   │
│  │ 🔔 30 min avant   [ON  ●]  │   │
│  │ 🔕 Mode nuit      [OFF ○]  │   │
│  └─────────────────────────────┘   │
│─────────────────────────────────────│
│  [⭐ Ajouter aux favoris]           │
│  [🚩 Signaler une erreur]          │
│─────────────────────────────────────│
│  ⚠️  La signalisation sur rue prime │
│  toujours — cette app est un        │
│  outil d'aide, pas une garantie.    │
└─────────────────────────────────────┘
```

---

## Flow "Notification reçue → action"

```
Push reçue:
┌────────────────────────────────────────┐
│ ❄️ Alerte Déneigement                  │
│ 🕐 Chargement dans ~60 min             │
│ 123 Rue Saint-Denis                    │
└────────────────────────────────────────┘
         │
    [Tap notif]
         │
         ▼
  App ouverte sur détail de la rue
  + confirmation de disponibilité
         │
    [J'ai déplacé mon auto]
         │
         ▼
  Watch désactivée ✅
  Message: "Parfait! On arrête les rappels."
```

---

## Écran Stationnements incitatifs

```
┌─────────────────────────────────────┐
│  ← Stationnements incitatifs        │
│─────────────────────────────────────│
│  ╔═══════════════════════════════╗  │
│  ║  CARTE (spots marqués 🅿️)   ║  │
│  ╚═══════════════════════════════╝  │
│─────────────────────────────────────│
│  📍 Métro Crémazie           0.8 km │
│  Capacité: ~200 places • Gratuit   │
│  [Itinéraire →]                     │
│─────────────────────────────────────│
│  📍 Métro Jean-Talon         1.2 km │
│  Capacité: ~350 places • Gratuit   │
│  [Itinéraire →]                     │
└─────────────────────────────────────┘
```

---

## Micro-copies FR-QC

| Contexte | Texte |
|----------|-------|
| CTA principal | "Je suis stationné ici" |
| Confirmer déplacement | "J'ai déplacé mon auto ✅" |
| Arrêter suivi | "Arrêter la surveillance" |
| Notif T-60 | "Déplace ton auto — chargement dans ~60 min" |
| Notif T-30 | "Urgent : chargement dans 30 min — 123 Rue Saint-Denis" |
| Notif status change | "Nouvelle opération planifiée — 123 Rue Saint-Denis" |
| Notif en cours | "🚛 Chargement en cours — dépêche-toi !" |
| Offline | "Données : dernière MAJ il y a 8 min" |
| API down | "Données temporairement indisponibles — on réessaie" |
| Disclaimer | "La signalisation sur rue prime toujours." |
| Erreur signalée | "Merci ! On enquête sur ce statut." |
| Onboard push | "Pour t'avertir avant la remorque, on a besoin de t'envoyer des notifications." |
| Onboard géoloc | "Pour trouver ta rue automatiquement. Tu peux toujours chercher manuellement." |
