import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { AuthProvider } from './src/hooks/useAuth';
import { ProfileProvider } from './src/hooks/useProfile';
import { ThemeProvider, useTheme } from './src/theme';
import { ToastProvider } from './src/components/ui';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  // If font loading errors (e.g. offline first launch), render anyway —
  // RN falls back to the system font rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <WebAppFrame>
              <ToastProvider>
                <RootNavigator />
              </ToastProvider>
            </WebAppFrame>
            <ThemedStatusBar />
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedStatusBar() {
  const theme = useTheme();
  return <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />;
}

// On native this is a no-op passthrough. On web, RN's flex:1 root would
// otherwise stretch this mobile-first UI edge-to-edge across a desktop
// browser window — tiny text floating in a sea of empty black. Instead we
// pin it to a phone-width column centered in a backdrop, like a device
// mockup, so the layout, type scale, and spacing look intentional at any
// monitor size.
function WebAppFrame({ children }: { children: ReactNode }) {
  const theme = useTheme();
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View
      style={[
        styles.backdrop,
        { backgroundColor: theme.mode === 'dark' ? '#000000' : '#E9E9E4' },
      ]}
    >
      <View style={[styles.frame, { borderColor: theme.colors.border }, theme.shadows.overlay]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 460,
    maxHeight: 940,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
  },
});
