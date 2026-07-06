// Pure helpers describing WHAT local notifications each preference should
// schedule. Kept side-effect-free so the mapping is unit-testable; the actual
// OS scheduling lives in services/notifications.ts.

export type NotifKey = 'mealReminder' | 'workoutReminder' | 'weeklyRecap' | 'streakWarning';

export interface DailyPlan {
  kind: 'daily';
  hour: number;
  minute: number;
  title: string;
  body: string;
}

export interface WeeklyPlan {
  kind: 'weekly';
  /** 1=Sunday … 7=Saturday, matching expo-notifications' WEEKLY trigger */
  weekday: number;
  hour: number;
  minute: number;
  title: string;
  body: string;
}

export type NotifPlan = DailyPlan | WeeklyPlan;

/**
 * Converts a JS getDay() weekday (0=Sun…6=Sat) to the 1=Sun…7=Sat convention
 * expo-notifications' WEEKLY trigger expects.
 */
export function toExpoWeekday(jsWeekday: number): number {
  return ((jsWeekday % 7) + 7) % 7 + 1;
}

/**
 * The concrete notifications to schedule for a preference. `workoutReminder`
 * fans out to one weekly notification per training weekday (JS 0–6). Returns
 * [] when a reminder has nothing to schedule (e.g. no training days).
 */
export function plansFor(key: NotifKey, trainingWeekdays: number[] = []): NotifPlan[] {
  switch (key) {
    case 'mealReminder':
      return [
        {
          kind: 'daily',
          hour: 20,
          minute: 0,
          title: 'Log your meals 🍽️',
          body: "Haven't logged dinner yet? Keep your day complete.",
        },
      ];
    case 'streakWarning':
      return [
        {
          kind: 'daily',
          hour: 20,
          minute: 30,
          title: 'Keep your streak alive 🔥',
          body: 'Log a meal or workout today so your streak survives.',
        },
      ];
    case 'weeklyRecap':
      return [
        {
          kind: 'weekly',
          weekday: 2, // Monday
          hour: 9,
          minute: 0,
          title: 'Your targets were recalibrated 📊',
          body: 'Last week is in — check your updated calorie and macro goals.',
        },
      ];
    case 'workoutReminder':
      return [...new Set(trainingWeekdays)].map((jsWeekday) => ({
        kind: 'weekly' as const,
        weekday: toExpoWeekday(jsWeekday),
        hour: 8,
        minute: 0,
        title: 'Training day 💪',
        body: "You've got a workout scheduled today. Time to move.",
      }));
    default:
      return [];
  }
}
