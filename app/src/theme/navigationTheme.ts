import { DarkTheme, DefaultTheme, Theme as NavTheme } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Theme } from './index';
import { FONTS } from './typography';

export function buildNavigationTheme(theme: Theme): NavTheme {
  const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.accentEmphasis,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.energy,
    },
  };
}

export function buildStackScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: theme.colors.background },
    headerTintColor: theme.colors.textPrimary,
    headerTitleStyle: { fontFamily: FONTS.bold },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.colors.background },
    // Subtle, fast screen transition (plan: motion under 250ms).
    animation: 'slide_from_right',
    animationDuration: 220,
  };
}
