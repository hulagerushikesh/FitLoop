// Pure helpers for the consistency heatmap. Intensity is a 0–4 level per day
// (GitHub-contribution style): 0 = nothing logged, 1 = food logged only,
// 2–4 = trained, scaled by how much energy the session burned.

export interface DayActivity {
  caloriesConsumed: number;
  caloriesBurned: number;
  workoutCount: number;
}

export const HEAT_LEVELS = 5; // levels 0..4

/** Maps a day's activity to a 0–4 intensity bucket. */
export function heatIntensity(day: DayActivity): number {
  if (day.workoutCount > 0) {
    if (day.caloriesBurned >= 400) return 4;
    if (day.caloriesBurned >= 250) return 3;
    return 2;
  }
  if (day.caloriesConsumed > 0) return 1;
  return 0;
}

/** Inclusive list of YYYY-MM-DD date strings from `start` to `end` (UTC). */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const stop = new Date(`${end}T00:00:00Z`);
  while (cursor <= stop) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Arranges a date range into GitHub-style columns of 7 days (Sun→Sat), with
 * leading nulls so the first column aligns to the correct weekday. Returns
 * columns (weeks), each a 7-slot array of date strings or null.
 */
export function heatmapColumns(dates: string[]): (string | null)[][] {
  if (dates.length === 0) return [];
  const firstWeekday = new Date(`${dates[0]}T00:00:00Z`).getUTCDay(); // 0=Sun
  const cells: (string | null)[] = Array(firstWeekday).fill(null);
  cells.push(...dates);
  while (cells.length % 7 !== 0) cells.push(null);

  const columns: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
  return columns;
}
