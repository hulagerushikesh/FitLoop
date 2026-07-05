import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// expo-haptics throws "not available" on web — wrap so call sites can fire
// and forget on every platform.

export function tapHaptic(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function successHaptic(): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function warningHaptic(): void {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
