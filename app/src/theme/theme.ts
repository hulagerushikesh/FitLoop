// FitLoop design system — "bold & energetic" dark theme (Nike Training
// Club / Strava-inspired): near-black surfaces, one loud accent color,
// oversized bold numbers for stats.

export const COLORS = {
  background: '#0B0B0F',
  surface: '#17171D',
  surfaceHigh: '#1F1F27',
  border: '#2A2A33',

  accent: '#CBFF3D', // signature electric lime — primary actions, active states
  accentMuted: 'rgba(203, 255, 61, 0.14)',
  accentText: '#0B0B0F', // text/icons drawn on top of the accent color

  energy: '#FF5A3C', // secondary accent — calories burned, streaks, warmth
  energyMuted: 'rgba(255, 90, 60, 0.14)',

  textPrimary: '#FFFFFF',
  textSecondary: '#9B9BA5',
  textTertiary: '#65656F',

  danger: '#FF453A',
  dangerMuted: 'rgba(255, 69, 58, 0.14)',
  success: '#30D158',

  protein: '#4DA6FF',
  carbs: '#FFB020',
  fat: '#FF5C8A',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const TYPOGRAPHY = {
  display: { fontSize: 48, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 52 },
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.3, lineHeight: 38 },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 30 },
  h3: { fontSize: 19, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '500' as const, lineHeight: 22 },
  bodyBold: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
  caption: { fontSize: 14, fontWeight: '500' as const, lineHeight: 19 },
  label: { fontSize: 12.5, fontWeight: '800' as const, letterSpacing: 0.5, lineHeight: 16 },
} as const;
