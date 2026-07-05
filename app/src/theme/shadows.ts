import { ViewStyle } from 'react-native';

// RN 0.76+ (new architecture) and react-native-web both support the CSS-style
// `boxShadow` prop — the legacy shadow*/elevation props are deprecated on web
// (they were producing console warnings). One string, every platform.

export interface ThemeShadows {
  none: ViewStyle;
  card: ViewStyle; // resting cards
  raised: ViewStyle; // hero cards, sticky CTAs
  overlay: ViewStyle; // modals, toasts, sheets
}

export function buildShadows(mode: 'light' | 'dark'): ThemeShadows {
  const ink = mode === 'dark' ? '0, 0, 0' : '22, 22, 26';
  return {
    none: { boxShadow: undefined },
    card: { boxShadow: `0 4px 16px rgba(${ink}, ${mode === 'dark' ? 0.35 : 0.08})` },
    raised: { boxShadow: `0 8px 28px rgba(${ink}, ${mode === 'dark' ? 0.45 : 0.14})` },
    overlay: { boxShadow: `0 12px 40px rgba(${ink}, ${mode === 'dark' ? 0.6 : 0.22})` },
  };
}
