/**
 * Lifestyle OS design tokens — aligned with Stitch "Holistic Clarity" (light mode).
 * Source of truth: /.stitch/DESIGN.md · Stitch project: Lifestyle OS Mobile App UI
 */

export const colors = {
  // Surfaces
  bg: '#f8f9fb',
  surface: '#ffffff',
  surfaceLow: '#f2f4f6',
  surfaceContainer: '#edeef0',
  border: '#e8eaf0',
  borderStrong: '#c8c5cd',

  // Text
  text: '#1a1a2e',
  textMuted: '#6b7280',
  textDim: '#47464c',

  // Brand & semantic
  accent: '#5e51ad',
  accentContainer: '#a99cfe',
  primaryContainer: '#1a1a2e',
  onPrimaryContainer: '#ffffff',
  success: '#059669',
  warning: '#d97706',
  danger: '#ba1a1a',
};

/** Per-module pastel tints for tiles, stat cards, and category accents */
export const moduleColors = {
  fitness: { tint: '#e3f2fd', border: '#2196f3', accent: '#1976d2' },
  nutrition: { tint: '#f1f8e9', border: '#8bc34a', accent: '#689f38' },
  water: { tint: '#e0f7fa', border: '#00bcd4', accent: '#0097a7' },
  sleep: { tint: '#ede7f6', border: '#673ab7', accent: '#512da8' },
  habits: { tint: '#fff3e0', border: '#ff9800', accent: '#f57c00' },
  body: { tint: '#fce4ec', border: '#e91e63', accent: '#c2185b' },
  photos: { tint: '#e8eaf6', border: '#3f51b5', accent: '#303f9f' },
  haircare: { tint: '#f3e5f5', border: '#9c27b0', accent: '#7b1fa2' },
  skincare: { tint: '#efebe9', border: '#795548', accent: '#5d4037' },
  supplements: { tint: '#f9fbe7', border: '#cddc39', accent: '#afb42b' },
  goals: { tint: '#e0f2f1', border: '#009688', accent: '#00796b' },
  health: { tint: '#fffde7', border: '#fbc02d', accent: '#f9a825' },
} as const;

export type ModuleKey = keyof typeof moduleColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  section: 20,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  display: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40, letterSpacing: -0.64 },
  headlineLg: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.24 },
  headlineMd: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  headlineMobile: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelLg: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  labelMd: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16, letterSpacing: 0.12 },
};

export const elevation = {
  card: {
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#1a1a2e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};
