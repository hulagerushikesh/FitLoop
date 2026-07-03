import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/hooks/useAuth';
import { ProfileProvider } from './src/hooks/useProfile';
import RootNavigator from './src/navigation/RootNavigator';
import { COLORS } from './src/theme/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ProfileProvider>
          <WebAppFrame>
            <RootNavigator />
          </WebAppFrame>
          <StatusBar style="auto" />
        </ProfileProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// On native this is a no-op passthrough. On web, RN's flex:1 root would
// otherwise stretch this mobile-first UI edge-to-edge across a desktop
// browser window — tiny text floating in a sea of empty black. Instead we
// pin it to a phone-width column centered in a dark backdrop, like a device
// mockup, so the layout, type scale, and spacing look intentional at any
// monitor size.
function WebAppFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') return <>{children}</>;
  return (
    <View style={webStyles.backdrop}>
      <View style={webStyles.frame}>{children}</View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
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
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 24,
  },
});
