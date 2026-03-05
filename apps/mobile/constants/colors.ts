// Unified status codes (0-5) — same for all cities
export const STATUS_COLORS = {
  0: { bg: '#6B7280', text: '#FFFFFF', label: 'Inconnu',                    icon: 'help-circle-outline' },
  1: { bg: '#9CA3AF', text: '#1A1A1A', label: 'Normal',                     icon: 'snow-outline' },
  2: { bg: '#F97316', text: '#FFFFFF', label: 'Planifié',                    icon: 'time-outline' },
  3: { bg: '#EF4444', text: '#FFFFFF', label: 'En cours — Déplace-toi !',    icon: 'alert-circle' },
  4: { bg: '#22C55E', text: '#FFFFFF', label: 'Terminé',                     icon: 'checkmark-circle' },
  5: { bg: '#EAB308', text: '#1A1A1A', label: 'Interdit',                    icon: 'ban-outline' },
} as const;

export type StatusCode = keyof typeof STATUS_COLORS;

export function getStatusColor(etat: number) {
  return STATUS_COLORS[etat as StatusCode] ?? { bg: '#6B7280', text: '#FFFFFF', label: 'Inconnu', icon: 'help-circle-outline' };
}

export const COLORS = {
  light: {
    background:       '#FFFFFF',
    backgroundSecond: '#F8FAFC',
    surface:          '#FFFFFF',
    surfaceElevated:  '#F1F5F9',
    border:           '#E2E8F0',
    text:             '#0F172A',
    textSecondary:    '#64748B',
    textMuted:        '#94A3B8',
    icon:             '#64748B',
    tabBar:           '#FFFFFF',
    tabBarBorder:     '#E2E8F0',
    warningBg:        '#FEF3C7',
    warningBorder:    '#F59E0B',
    warningText:      '#92400E',
    primary:          '#1D4ED8',
    primaryLight:     '#BFDBFE',
  },
  dark: {
    background:       '#0F172A',
    backgroundSecond: '#1E293B',
    surface:          '#1E293B',
    surfaceElevated:  '#334155',
    border:           '#334155',
    text:             '#F8FAFC',
    textSecondary:    '#94A3B8',
    textMuted:        '#64748B',
    icon:             '#94A3B8',
    tabBar:           '#0F172A',
    tabBarBorder:     '#1E293B',
    warningBg:        '#422006',
    warningBorder:    '#D97706',
    warningText:      '#FDE68A',
    primary:          '#3B82F6',
    primaryLight:     '#1E3A5F',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
// Map all literal values to string so light|dark union is assignable
export type ThemeColors = { [K in keyof (typeof COLORS)['light']]: string };

export const BRAND = {
  primary:   '#1D4ED8',
  secondary: '#BFDBFE',
  accent:    '#F97316',
  danger:    '#EF4444',
  success:   '#22C55E',
  warning:   '#F59E0B',
} as const;

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48 } as const;
export const RADIUS  = { sm: 6, md: 12, lg: 16, xl: 24, full: 9999 } as const;

export const FONT_SIZE = { xs: 12, sm: 14, base: 16, md: 18, lg: 20, xl: 24, '2xl': 28, hero: 36 } as const;
