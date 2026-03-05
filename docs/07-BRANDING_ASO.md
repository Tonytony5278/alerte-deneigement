# 07 — Branding & ASO

_Alerte Déneigement_

---

## Décision de nom

### Options évaluées

| Option | Pour | Contre | Score |
|--------|------|--------|-------|
| **Alerte Déneigement** | Clair, actionnable, convertit | Plus long (17 chars) | ⭐⭐⭐⭐⭐ |
| NeigeAlerte | Court, brandable | Ambigu (météo ou déneigement ?) | ⭐⭐⭐ |
| Déneige Montréal | Géographique, direct | Limité MTL, dispo marché ? | ⭐⭐⭐⭐ |

### **CHOIX : Alerte Déneigement**

**Justification :**
1. Le mot "Alerte" est le verbe d'action — il décrit exactement ce que l'app fait
2. "Déneigement" = le mot que les gens tapent dans Google/App Store
3. Différencié d'INFO-Neige sans confusion (pas de "info" ni "neige" seul)
4. Facilement abrégeable en "Alerte" dans le logo / microcopy
5. **ASO** : "Déneigement" est le mot-clé le plus cherché en hiver

---

## App Store Listing (iOS)

### Titre (30 chars max)
```
Alerte Déneigement – Montréal
```
_(30 chars exactement)_

### Sous-titre (30 chars max)
```
Alertes gratuites • Stationnement
```
_(33 chars — à couper si trop long:)_
```
Alertes déneigement Montréal
```

### Keywords (100 chars, iOS)
```
info neige,déneigement,stationnement,remorquage,neige montreal,interdiction,chargement,311
```
_(96 chars)_

### Description courte (Android — 80 chars)
```
Alertes gratuites avant le déneigement. Évite la remorque. Sans compte requis.
```

### Description longue
```
Alerte Déneigement — l'app gratuite qui te prévient avant que ton auto se fasse remorquer.

🔔 ALERTES À TEMPS
• Notification dès qu'une opération est planifiée sur ta rue
• Rappel 60 min avant le début du chargement
• Rappel 30 min si tu as besoin de plus de temps

🗺️ CARTE EN TEMPS RÉEL
• Vois l'état de toutes les rues de Montréal
• Statuts colorés : déneigé, planifié, en cours, terminé

🚗 MODE "JE SUIS STATIONNÉ ICI"
• 1 tap pour surveiller ta rue actuelle
• Sans créer de compte — ton anonymat est respecté

⭐ FAVORIS MULTI-ADRESSES
• Surveille ta maison, ton bureau, ta belle-mère...
• Vue résumée de toutes tes adresses

🅿️ STATIONNEMENTS INCITATIFS
• Trouve un parking gratuit pendant les opérations
• Carte + distance + itinéraire

Données : l'app utilise les données ouvertes de la Ville de Montréal.
⚠️ La signalisation sur rue prime toujours — cette app est un outil d'aide.

100% gratuit. Aucune publicité. Aucun compte requis.
```

---

## Captures d'écran App Store (5 écrans)

### Capture 1 — Accroche
```
┌─────────────────┐
│                 │
│   ❄️ Alerte     │
│   Déneigement   │
│                 │
│ "Évite la       │
│  remorque."     │
│                 │
│  [App screenshot│
│   — carte +     │
│   status block] │
│                 │
└─────────────────┘
Titre: "Évite la remorque"
Sous-titre: "Alertes gratuites, à temps"
```

### Capture 2 — Notifications
```
Titre: "Alertes à temps"
Sous-titre: "Push 60 min avant le chargement"
[Screenshot notification centre — T-60 push visible]
```

### Capture 3 — Stationnements
```
Titre: "Stationnements gratuits"
Sous-titre: "Trouve où te garer pendant les ops"
[Screenshot écran parking incitatif]
```

### Capture 4 — Favoris
```
Titre: "Tes adresses en un coup d'œil"
Sous-titre: "Maison, bureau, famille"
[Screenshot home avec bloc favoris]
```

### Capture 5 — Fiabilité
```
Titre: "Données à jour"
Sous-titre: "Dernière MAJ: il y a 2 min"
[Screenshot détail rue avec timeline]
```

---

## Google Play Listing

### Titre (50 chars)
```
Alerte Déneigement – Alertes gratuites Montréal
```

### Keywords Google Play
```
info neige, déneigement montréal, stationnement neige, remorquage, 311 montreal, interdiction stationnement, chargement neige
```

---

## Branding

### Logo
```
[Flocon stylisé] + [P barré]
Couleur: #1D4ED8 (bleu marine)
Sur fond blanc ou bleu
App icon: fond bleu #1D4ED8, flocon blanc, P barré rouge #EF4444
```

### Tagline (en 1 ligne)
> **"Alertes gratuites, à temps."**

### Valeurs de marque
- **Fiabilité** — les données, pas la promesse
- **Honnêteté** — disclaimer permanent, données open source
- **Gratuité** — pas de paywall sur l'essentiel
- **Simplicité** — 1 tap pour commencer

### Ton de voix
- Tutoiement systématique ("ton auto", "tu peux")
- Québécois authentique, pas parisien
- Direct, pas de jargon technique
- Rassurant mais pas dans la bullshit

---

## Apple Search Ads — Plan campagnes

### Campagne 1: Intent clair — Recherche app
- **Mots-clés**: "info neige", "info neige montreal", "alerte déneigement"
- **Enchère**: 1,50–2,50$/tap
- **Budget**: 5$/jour phase MVP

### Campagne 2: Intent adjacent — Stationnement
- **Mots-clés**: "stationnement neige", "remorquage montreal", "interdiction stationnement"
- **Enchère**: 1,00–1,80$/tap
- **Budget**: 3$/jour

### Campagne 3: Intent concurrent — 311
- **Mots-clés**: "311 montreal", "311 montreal neige", "application 311"
- **Enchère**: 0,80–1,20$/tap
- **Budget**: 2$/jour

### CPI cible: < 2,50$
### LTV estimé (gratuit): valeur de rétention / bouche-à-oreille

---

## Boucle virale "tempête"

### Mécanisme 1: "Partager mon statut"
- Deep link: `alertedeneigement://street/{segmentId}`
- Message partagé: "Mon auto est sur {rue} — statut: Planifié. Toi aussi? → [lien]"
- S'active dans la bottom sheet du bloc "Mon véhicule"

### Mécanisme 2: "Alerte tempête" (push opt-in)
- Push quand > 10 arrondissements passent en "Planifié" simultanément
- Opt-in séparé dans Settings
- Message: "🌨️ Grosse tempête ce soir — vérifie ta rue avant 18h"

### Mécanisme 3: Bouche-à-oreille naturel
- L'app sauve quelqu'un de 120$ de remorquage → ils en parlent
- Disclaimer honnête → crédibilité → partage organique
