# 05 — Design System & Tokens

_Alerte Déneigement_

---

## Philosophie

- **Utilitaire** : chaque élément a un rôle fonctionnel clair
- **Lisibilité hiver** : contraste élevé, texte large — utilisation avec gants
- **Accessible** : WCAG AA minimum, taille min 16sp, daltonisme friendly
- **Dark mode natif** : Montréal en hiver = nuit longue

---

## Couleurs (Tokens)

### Palette de statut

```typescript
export const STATUS_COLORS = {
  deneige:    { bg: '#22C55E', text: '#FFFFFF', label: 'Déneigé' },       // Vert
  planifie:   { bg: '#F97316', text: '#FFFFFF', label: 'Planifié' },      // Orange
  replanifie: { bg: '#EA580C', text: '#FFFFFF', label: 'Replanifié' },    // Orange foncé
  attente:    { bg: '#EAB308', text: '#1A1A1A', label: 'En attente' },    // Jaune
  en_cours:   { bg: '#EF4444', text: '#FFFFFF', label: 'En cours' },      // Rouge
  entre_ops:  { bg: '#60A5FA', text: '#1A1A1A', label: 'Entre opérations' }, // Bleu clair
  enneige:    { bg: '#9CA3AF', text: '#1A1A1A', label: 'Enneigé' },       // Gris
  inconnu:    { bg: '#6B7280', text: '#FFFFFF', label: 'Inconnu' },       // Gris foncé
} as const;
```

### Palette marque

```typescript
export const BRAND = {
  primary:   '#1D4ED8',   // Bleu marine — confiance, civic
  secondary: '#BFDBFE',   // Bleu ciel — neige, air
  accent:    '#F97316',   // Orange alerte
  danger:    '#EF4444',   // Rouge urgence
  success:   '#22C55E',   // Vert OK
  warning:   '#F59E0B',   // Ambre attention
} as const;
```

### Light / Dark

```typescript
export const COLORS = {
  light: {
    background:        '#FFFFFF',
    backgroundSecond:  '#F8FAFC',
    surface:           '#FFFFFF',
    surfaceElevated:   '#F1F5F9',
    border:            '#E2E8F0',
    text:              '#0F172A',
    textSecondary:     '#64748B',
    textMuted:         '#94A3B8',
    icon:              '#64748B',
    tabBar:            '#FFFFFF',
    tabBarBorder:      '#E2E8F0',
    statusBar:         'dark-content',
    map:               'standard',
  },
  dark: {
    background:        '#0F172A',
    backgroundSecond:  '#1E293B',
    surface:           '#1E293B',
    surfaceElevated:   '#334155',
    border:            '#334155',
    text:              '#F8FAFC',
    textSecondary:     '#94A3B8',
    textMuted:         '#64748B',
    icon:              '#94A3B8',
    tabBar:            '#0F172A',
    tabBarBorder:      '#1E293B',
    statusBar:         'light-content',
    map:               'night',
  },
} as const;
```

---

## Typographie

```typescript
export const TYPOGRAPHY = {
  // SF Pro (iOS) / Roboto (Android) — System fonts
  fontFamily: {
    regular:  undefined,   // system default
    medium:   undefined,
    bold:     undefined,
    mono:     'monospace',
  },

  size: {
    xs:   12,
    sm:   14,
    base: 16,   // minimum pour lisibilité
    md:   18,
    lg:   20,
    xl:   24,
    '2xl': 28,
    '3xl': 32,
    hero:  40,
  },

  weight: {
    regular:    '400' as const,
    medium:     '500' as const,
    semibold:   '600' as const,
    bold:       '700' as const,
    extrabold:  '800' as const,
  },

  lineHeight: {
    tight:   1.2,
    normal:  1.5,
    relaxed: 1.75,
  },
} as const;
```

---

## Espacement (8pt grid)

```typescript
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
  '3xl': 64,
} as const;
```

---

## Border radius

```typescript
export const RADIUS = {
  sm:   6,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;
```

---

## Composants principaux

### Button Primary
```
┌─────────────────────────────────────┐
│           LABEL BOUTON              │  ← height: 52px
└─────────────────────────────────────┘
  bg: brand.primary (#1D4ED8)
  text: #FFFFFF, fontSize: 16, weight: 600
  borderRadius: 12
  paddingHorizontal: 24
  paddingVertical: 14
  activeOpacity: 0.85
```

### Button Secondary
```
┌─────────────────────────────────────┐
│           LABEL BOUTON              │  ← height: 52px
└─────────────────────────────────────┘
  bg: transparent
  border: 1.5px colors.border
  text: colors.text, fontSize: 16, weight: 600
```

### Status Chip
```
┌────────────────┐
│ ● En cours     │  ← hauteur: 28px
└────────────────┘
  bg: STATUS_COLORS[état].bg
  text: STATUS_COLORS[état].text
  fontSize: 13, weight: 600
  borderRadius: full
  paddingHorizontal: 10
  paddingVertical: 4
```

### Card
```
┌──────────────────────────────────┐
│ Titre                            │
│ Sous-texte                       │
│ ...                              │
└──────────────────────────────────┘
  bg: colors.surface
  borderRadius: 16
  padding: 16
  shadowColor: #000, shadowOpacity: 0.08
  shadowRadius: 8, elevation: 2
```

### Banner Warning (disclaimer)
```
┌──────────────────────────────────┐
│ ⚠️  La signalisation sur rue   │
│     prime toujours.             │
└──────────────────────────────────┘
  bg: #FEF3C7 (light) / #422006 (dark)
  border: 1px #F59E0B
  text: #92400E (light) / #FDE68A (dark)
  fontSize: 13, weight: 500
  borderRadius: 8
  padding: 10
```

### Skeleton Loader
```
  Animated pulsing: opacity 1.0 → 0.4 → 1.0
  bg: colors.surfaceElevated
  borderRadius: 8
  Durée: 1200ms, ease: sin
```

---

## Icônes

- Library: **Expo Vector Icons** (`@expo/vector-icons` — Ionicons + MaterialIcons)
- Taille standard: 24px (tab bar: 26px)
- Couleur: `colors.icon`

| Usage | Icône |
|-------|-------|
| Voiture | `MaterialIcons: directions_car` |
| Flocon neige | `Ionicons: snow` |
| Cloche notification | `Ionicons: notifications` |
| Panneau P barré | `MaterialIcons: local_parking` + overlay |
| Engrenage settings | `Ionicons: settings` |
| Étoile favoris | `Ionicons: star` |
| Localisation | `Ionicons: location` |
| Carte | `Ionicons: map` |
| Alerte | `Ionicons: warning` |
| Check | `Ionicons: checkmark-circle` |
| Camion | `MaterialIcons: local_shipping` |

---

## Logo

- Pictogramme: flocon stylisé + panneau P barré
- Couleur principale: Bleu marine #1D4ED8
- App icon iOS: fond bleu, flocon blanc + P barré rouge
- App icon Android: même, contour adaptatif
- Version monochrome: disponible pour embeds

---

## Dark mode — Règles

1. Utiliser `useColorScheme()` Expo hook
2. Ne jamais hardcoder de couleurs — toujours via `COLORS[theme]`
3. La carte MapView doit switcher en mode nuit
4. Les status chips gardent leurs couleurs vives (exception contrôlée)
5. Tester explicitement avec Simulator en dark mode avant release

---

## Accessibilité

- `accessibilityLabel` sur tous les boutons iconographiques
- Taille tactile minimum: 44×44px (Apple HIG)
- `role="button"` + `accessible={true}` sur éléments interactifs custom
- Support VoiceOver / TalkBack
- Pas de distinction par couleur seule (toujours label + icône)
- Mode daltonisme: les couleurs de statut ont des patterns différents en plus de la couleur
