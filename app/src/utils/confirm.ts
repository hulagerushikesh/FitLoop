import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
}

/**
 * Cross-platform confirmation dialog. Alert.alert is a silent no-op on
 * react-native-web (its callbacks never fire, so gating a destructive action
 * on it makes the action unreachable on web) — fall back to window.confirm.
 */
export function confirm({
  title,
  message,
  confirmLabel = 'OK',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(text));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
