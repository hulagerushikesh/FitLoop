import { TextStyle } from 'react-native';

// Inter loaded via @expo-google-fonts/inter in App.tsx. Custom fonts on
// Android ignore the fontWeight style prop — each weight is its own
// fontFamily, so tokens carry fontFamily instead of fontWeight. If fonts
// fail to load we fall back to the system font (see App.tsx), and these
// family names simply won't resolve — RN falls back gracefully.

export const FONTS = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

// Tabular figures so stat numbers don't jitter as they count up.
const NUMERIC: Pick<TextStyle, 'fontVariant'> = { fontVariant: ['tabular-nums'] };

export const TYPOGRAPHY = {
  display: {
    fontFamily: FONTS.extrabold,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -0.5,
    ...NUMERIC,
  },
  h1: { fontFamily: FONTS.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  h2: { fontFamily: FONTS.bold, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: FONTS.bold, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: FONTS.medium, fontSize: 16, lineHeight: 22 },
  bodyBold: { fontFamily: FONTS.bold, fontSize: 16, lineHeight: 22 },
  bodySmall: { fontFamily: FONTS.medium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: FONTS.medium, fontSize: 12.5, lineHeight: 16 },
  label: {
    fontFamily: FONTS.bold,
    fontSize: 12.5,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  // Stats/numbers — heavier weight per the data-dense design direction.
  stat: { fontFamily: FONTS.extrabold, fontSize: 28, lineHeight: 32, ...NUMERIC },
  statSmall: { fontFamily: FONTS.bold, fontSize: 20, lineHeight: 24, ...NUMERIC },
} satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof TYPOGRAPHY;
