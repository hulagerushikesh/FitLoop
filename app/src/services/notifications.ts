import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { fetchRoutines } from './workouts';
import { plansFor, type NotifKey, type NotifPlan } from '../engine/notificationSchedule';

// Local (device-scheduled) notifications only — no push infrastructure. Web
// has no reliable scheduled-notification support, so every entry point no-ops
// there and the UI tells the user reminders are mobile-only.
export const isNotificationsSupported = Platform.OS !== 'web';

export const NOTIF_KEYS: NotifKey[] = [
  'mealReminder',
  'workoutReminder',
  'weeklyRecap',
  'streakWarning',
  'progressPhoto',
];

/** AsyncStorage key holding the on/off intent for a preference. */
export const notifPrefKey = (key: NotifKey): string => `fitloop.notif.${key}`;

const IDS_PREFIX = 'fitloop.notif.ids.';

/** Reads the persisted on/off intent for every notification preference. */
export async function readEnabledPrefs(): Promise<Record<NotifKey, boolean>> {
  const entries = await Promise.all(
    NOTIF_KEYS.map(async (key) => [key, (await AsyncStorage.getItem(notifPrefKey(key))) === 'true'] as const)
  );
  return Object.fromEntries(entries) as Record<NotifKey, boolean>;
}

/** Call once at app start so foregrounded notifications still surface. */
export function configureNotificationHandler(): void {
  if (!isNotificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Requests permission if not already granted. Returns whether it's granted. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNotificationsSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

function triggerFor(plan: NotifPlan): Notifications.NotificationTriggerInput {
  if (plan.kind === 'daily') {
    return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: plan.hour, minute: plan.minute };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: plan.weekday,
    hour: plan.hour,
    minute: plan.minute,
  };
}

async function cancelForKey(key: NotifKey): Promise<void> {
  const raw = await AsyncStorage.getItem(IDS_PREFIX + key);
  if (!raw) return;
  const ids: string[] = JSON.parse(raw);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  await AsyncStorage.removeItem(IDS_PREFIX + key);
}

/** Training weekdays (JS 0–6) drawn from the user's routines' day_of_week. */
async function trainingWeekdays(userId: string): Promise<number[]> {
  const routines = await fetchRoutines(userId).catch(() => []);
  return routines
    .map((r) => r.day_of_week)
    .filter((d): d is number => d != null);
}

/**
 * Reconciles one preference with the OS: cancels any existing schedule for the
 * key, then (if `enabled`) schedules its plans and records their ids. Returns
 * the number of notifications scheduled. Throws if permission is denied while
 * enabling, so the caller can revert the toggle.
 */
export async function syncNotification(
  userId: string,
  key: NotifKey,
  enabled: boolean
): Promise<number> {
  if (!isNotificationsSupported) return 0;
  await cancelForKey(key);
  if (!enabled) return 0;

  const granted = await ensureNotificationPermission();
  if (!granted) throw new Error('Notifications are turned off in system settings.');

  const weekdays = key === 'workoutReminder' ? await trainingWeekdays(userId) : [];
  const plans = plansFor(key, weekdays);

  const ids: string[] = [];
  for (const plan of plans) {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: plan.title, body: plan.body },
      trigger: triggerFor(plan),
    });
    ids.push(id);
  }
  await AsyncStorage.setItem(IDS_PREFIX + key, JSON.stringify(ids));
  return ids.length;
}

/**
 * Re-applies all enabled preferences from AsyncStorage — call on login/app
 * start so schedules survive reinstalls of the JS bundle and pick up routine
 * changes (workout reminders are recomputed from current routines).
 */
export async function resyncAllNotifications(
  userId: string,
  enabledByKey: Record<NotifKey, boolean>
): Promise<void> {
  if (!isNotificationsSupported) return;
  for (const key of Object.keys(enabledByKey) as NotifKey[]) {
    await syncNotification(userId, key, enabledByKey[key]).catch(() => {});
  }
}
