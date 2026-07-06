import { adherencePct, loggingStreak, trendDirection, weekStartOf, weeklyVolume } from '../analytics';
import { earnedAchievements } from '../achievements';

describe('weekStartOf', () => {
  it('maps any weekday to that week\'s Monday', () => {
    expect(weekStartOf(new Date('2026-07-06T10:00:00Z'))).toBe('2026-07-06'); // Monday
    expect(weekStartOf(new Date('2026-07-09T10:00:00Z'))).toBe('2026-07-06'); // Thursday
    expect(weekStartOf(new Date('2026-07-12T10:00:00Z'))).toBe('2026-07-06'); // Sunday
    expect(weekStartOf(new Date('2026-07-13T00:00:00Z'))).toBe('2026-07-13'); // next Monday
  });
});

describe('weeklyVolume', () => {
  it('sums volume per week and muscle group, oldest first', () => {
    const weeks = weeklyVolume([
      { loggedAt: '2026-06-29T10:00:00Z', muscleGroup: 'chest', weightKg: 100, reps: 5 },
      { loggedAt: '2026-06-30T10:00:00Z', muscleGroup: 'chest', weightKg: 100, reps: 5 },
      { loggedAt: '2026-07-01T10:00:00Z', muscleGroup: 'legs', weightKg: 120, reps: 8 },
      { loggedAt: '2026-07-07T10:00:00Z', muscleGroup: 'chest', weightKg: 105, reps: 5 },
      { loggedAt: '2026-07-07T11:00:00Z', muscleGroup: 'core', weightKg: null, reps: 15 }, // 0 volume
    ]);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].weekStart).toBe('2026-06-29');
    expect(weeks[0].volumes.chest).toBe(1000);
    expect(weeks[0].volumes.legs).toBe(960);
    expect(weeks[0].total).toBe(1960);
    expect(weeks[1].volumes.chest).toBe(525);
  });
});

describe('trendDirection', () => {
  it('detects up, down, flat', () => {
    expect(trendDirection([100, 100, 100, 110])).toBe('up');
    expect(trendDirection([100, 100, 100, 90])).toBe('down');
    expect(trendDirection([100, 101, 99, 100])).toBe('flat');
    expect(trendDirection([100])).toBe('flat');
  });
});

describe('adherencePct', () => {
  it('counts days within ±10% of target', () => {
    expect(
      adherencePct([
        { consumed: 2000, target: 2000 }, // hit
        { consumed: 2150, target: 2000 }, // hit (7.5%)
        { consumed: 2500, target: 2000 }, // miss
        { consumed: 0, target: 2000 }, // no data — excluded
      ])
    ).toBe(67);
  });

  it('returns 0 with no usable days', () => {
    expect(adherencePct([{ consumed: 0, target: 2000 }])).toBe(0);
  });
});

describe('loggingStreak', () => {
  it('counts consecutive days ending today', () => {
    const dates = new Set(['2026-07-06', '2026-07-05', '2026-07-04', '2026-07-02']);
    expect(loggingStreak(dates, '2026-07-06')).toBe(3);
  });

  it('does not break the streak when today is not yet logged', () => {
    const dates = new Set(['2026-07-05', '2026-07-04']);
    expect(loggingStreak(dates, '2026-07-06')).toBe(2);
  });

  it('returns 0 when there is a gap before today and yesterday', () => {
    expect(loggingStreak(new Set(['2026-07-01']), '2026-07-06')).toBe(0);
  });
});

describe('earnedAchievements', () => {
  it('unlocks progressively', () => {
    expect(
      earnedAchievements({ completedWorkouts: 0, foodLogs: 0, loggingStreak: 0, hasPr: false })
    ).toEqual([]);
    expect(
      earnedAchievements({ completedWorkouts: 12, foodLogs: 3, loggingStreak: 8, hasPr: true })
    ).toEqual(['first_workout', 'workouts_10', 'first_food_log', 'first_pr', 'streak_7']);
  });
});
