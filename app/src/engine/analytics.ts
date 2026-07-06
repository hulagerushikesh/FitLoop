// Pure analytics helpers: weekly volume aggregation and trend detection.

import type { MuscleGroup } from '../types/database';

export interface VolumeLogEntry {
  loggedAt: string; // ISO timestamp
  muscleGroup: MuscleGroup;
  weightKg: number | null;
  reps: number | null;
}

export interface WeeklyVolume {
  /** Monday of the week, YYYY-MM-DD */
  weekStart: string;
  /** muscle group → total volume (sets × reps × weight) */
  volumes: Partial<Record<MuscleGroup, number>>;
  total: number;
}

/** Monday 00:00 UTC of the week containing `date`. */
export function weekStartOf(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Groups set logs into per-week, per-muscle-group volume, oldest week first. */
export function weeklyVolume(entries: VolumeLogEntry[]): WeeklyVolume[] {
  const byWeek = new Map<string, Partial<Record<MuscleGroup, number>>>();
  for (const e of entries) {
    const setVolume = (e.weightKg ?? 0) * (e.reps ?? 0);
    if (setVolume <= 0) continue;
    const week = weekStartOf(new Date(e.loggedAt));
    const volumes = byWeek.get(week) ?? {};
    volumes[e.muscleGroup] = (volumes[e.muscleGroup] ?? 0) + setVolume;
    byWeek.set(week, volumes);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, volumes]) => ({
      weekStart,
      volumes,
      total: Object.values(volumes).reduce((sum, v) => sum + (v ?? 0), 0),
    }));
}

export type Trend = 'up' | 'flat' | 'down';

const TREND_THRESHOLD = 0.03; // ±3% counts as flat

/**
 * Direction of the most recent value vs. the average of what came before.
 * Used for "your bench 1RM is trending up over the last 4 weeks".
 */
export function trendDirection(values: number[]): Trend {
  if (values.length < 2) return 'flat';
  const last = values[values.length - 1];
  const prior = values.slice(0, -1);
  const priorAvg = prior.reduce((s, v) => s + v, 0) / prior.length;
  if (priorAvg === 0) return last > 0 ? 'up' : 'flat';
  const change = (last - priorAvg) / priorAvg;
  if (change > TREND_THRESHOLD) return 'up';
  if (change < -TREND_THRESHOLD) return 'down';
  return 'flat';
}

/**
 * Consecutive days up to and including `today` that appear in `loggedDates`
 * (YYYY-MM-DD). If today hasn't been logged yet the streak isn't broken — we
 * start counting from yesterday, so an active streak survives until midnight.
 */
export function loggingStreak(loggedDates: Set<string>, today: string): number {
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!loggedDates.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (loggedDates.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

/** % of days (with a target) where consumption landed within ±10% of it. */
export function adherencePct(
  days: { consumed: number; target: number }[]
): number {
  const withData = days.filter((d) => d.target > 0 && d.consumed > 0);
  if (withData.length === 0) return 0;
  const hit = withData.filter(
    (d) => Math.abs(d.consumed - d.target) <= d.target * 0.1
  ).length;
  return Math.round((hit / withData.length) * 100);
}
