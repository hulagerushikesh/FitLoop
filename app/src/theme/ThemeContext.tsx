import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, darkTheme, lightTheme } from './themes';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'fitloop.themeMode';

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<Theme>(darkTheme);
const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'system',
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Persistence is best-effort; the in-memory value still applies.
    });
  }, []);

  const resolved = mode === 'system' ? (systemScheme ?? 'dark') : mode;
  const theme = resolved === 'light' ? lightTheme : darkTheme;

  const modeValue = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return (
    <ThemeModeContext.Provider value={modeValue}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemeModeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

/** For the settings toggle: the user's chosen mode (may be 'system'), not the resolved theme. */
export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext);
}

/**
 * Per-theme StyleSheet factory. Usage:
 *   const styles = useThemedStyles(createStyles);
 *   function createStyles(t: Theme) { return StyleSheet.create({ ... }); }
 * Styles are memoized per theme object, so light/dark switches re-create
 * them exactly once.
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
