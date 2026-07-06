import { dateRange, heatIntensity, heatmapColumns } from '../heatmap';

describe('heatIntensity', () => {
  it('is 0 for an empty day', () => {
    expect(heatIntensity({ caloriesConsumed: 0, caloriesBurned: 0, workoutCount: 0 })).toBe(0);
  });

  it('is 1 when only food is logged', () => {
    expect(heatIntensity({ caloriesConsumed: 1800, caloriesBurned: 0, workoutCount: 0 })).toBe(1);
  });

  it('scales 2→4 with calories burned on training days', () => {
    expect(heatIntensity({ caloriesConsumed: 0, caloriesBurned: 100, workoutCount: 1 })).toBe(2);
    expect(heatIntensity({ caloriesConsumed: 0, caloriesBurned: 300, workoutCount: 1 })).toBe(3);
    expect(heatIntensity({ caloriesConsumed: 0, caloriesBurned: 500, workoutCount: 1 })).toBe(4);
  });
});

describe('dateRange', () => {
  it('is inclusive of both ends', () => {
    expect(dateRange('2026-07-04', '2026-07-06')).toEqual(['2026-07-04', '2026-07-05', '2026-07-06']);
  });

  it('returns a single day when start === end', () => {
    expect(dateRange('2026-07-06', '2026-07-06')).toEqual(['2026-07-06']);
  });
});

describe('heatmapColumns', () => {
  it('pads leading nulls to align the first weekday', () => {
    // 2026-07-06 is a Monday (getUTCDay() === 1), so one leading null. Six days
    // (Mon–Sat) + that null exactly fills one 7-slot column.
    const cols = heatmapColumns(dateRange('2026-07-06', '2026-07-11'));
    expect(cols).toHaveLength(1);
    expect(cols[0][0]).toBeNull();
    expect(cols[0][1]).toBe('2026-07-06');
    expect(cols[0][6]).toBe('2026-07-11');
  });

  it('returns empty for no dates', () => {
    expect(heatmapColumns([])).toEqual([]);
  });
});
