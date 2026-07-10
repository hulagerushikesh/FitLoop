import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { isNotificationsSupported } from './notifications';

// True (server-sent) push: register this device's Expo push token so backend
// jobs can reach the user when the app is closed. Remote push only works on a
// physical device running a dev/production build — Expo Go (SDK 53+) and web
// can't receive it — so this no-ops safely everywhere else.

function resolveProjectId(): string | undefined {
  // Populated once the app is built with EAS; undefined in bare Expo Go.
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Requests permission (if needed), fetches the Expo push token, and upserts it
 * for the user. Best-effort: any failure is swallowed so it never blocks login.
 */
export async function registerPushToken(userId: string): Promise<void> {
  try {
    if (!isNotificationsSupported || Platform.OS === 'web' || !Device.isDevice) return;

    const projectId = resolveProjectId();
    if (!projectId) return; // no EAS project yet (e.g. plain Expo Go) — can't mint a token

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).granted;
    }
    if (!granted) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await supabase
      .from('push_tokens')
      .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: 'user_id,token' });
  } catch {
    // Non-fatal — the app works fine without remote push.
  }
}

/** Removes this device's token (call on logout so a signed-out device stops receiving pushes). */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    if (!isNotificationsSupported || Platform.OS === 'web' || !Device.isDevice) return;
    const projectId = resolveProjectId();
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;
    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
  } catch {
    // ignore
  }
}
