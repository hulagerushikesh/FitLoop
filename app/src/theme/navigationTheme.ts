import { DarkTheme, Theme } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { COLORS } from './theme';

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.accent,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.textPrimary,
    border: COLORS.border,
    notification: COLORS.energy,
  },
};

export const stackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: { backgroundColor: COLORS.background },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: COLORS.background },
};
