// Achievement catalog + pure unlock evaluation. Unlocked keys persist in
// the achievements table; this module only decides what SHOULD be unlocked
// given current stats, so it stays trivially testable.

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  /** lucide icon name used by the badge shelf */
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_workout', title: 'First rep', description: 'Finish your first workout', emoji: '🏋️' },
  { key: 'workouts_10', title: 'Regular', description: 'Finish 10 workouts', emoji: '🔟' },
  { key: 'workouts_50', title: 'Machine', description: 'Finish 50 workouts', emoji: '⚙️' },
  { key: 'first_food_log', title: 'Fuel logged', description: 'Log your first meal', emoji: '🍽️' },
  { key: 'first_pr', title: 'PR bell', description: 'Beat a personal record', emoji: '🔔' },
  { key: 'streak_7', title: 'One week strong', description: '7-day logging streak', emoji: '🔥' },
  { key: 'streak_30', title: 'Habit formed', description: '30-day logging streak', emoji: '🌋' },
];

export interface AchievementStats {
  completedWorkouts: number;
  foodLogs: number;
  loggingStreak: number;
  hasPr: boolean;
}

/** Keys that should be unlocked for these stats (already-earned included). */
export function earnedAchievements(stats: AchievementStats): string[] {
  const earned: string[] = [];
  if (stats.completedWorkouts >= 1) earned.push('first_workout');
  if (stats.completedWorkouts >= 10) earned.push('workouts_10');
  if (stats.completedWorkouts >= 50) earned.push('workouts_50');
  if (stats.foodLogs >= 1) earned.push('first_food_log');
  if (stats.hasPr) earned.push('first_pr');
  if (stats.loggingStreak >= 7) earned.push('streak_7');
  if (stats.loggingStreak >= 30) earned.push('streak_30');
  return earned;
}
