import { ThemeColors, darkColors, lightColors } from './colors';
import { TYPOGRAPHY } from './typography';
import { SPACING } from './spacing';
import { RADII } from './radii';
import { ThemeShadows, buildShadows } from './shadows';

export interface Theme {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  typography: typeof TYPOGRAPHY;
  spacing: typeof SPACING;
  radii: typeof RADII;
  shadows: ThemeShadows;
}

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radii: RADII,
  shadows: buildShadows('dark'),
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radii: RADII,
  shadows: buildShadows('light'),
};

export { FONTS, TYPOGRAPHY } from './typography';
export { SPACING } from './spacing';
export { RADII } from './radii';
export type { ThemeColors } from './colors';
export { ThemeProvider, useTheme, useThemeMode, useThemedStyles } from './ThemeContext';
export type { ThemeMode } from './ThemeContext';
