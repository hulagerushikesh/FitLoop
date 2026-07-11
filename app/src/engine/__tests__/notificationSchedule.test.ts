import { plansFor, toExpoWeekday } from '../notificationSchedule';

describe('toExpoWeekday', () => {
  it('maps JS 0=Sun..6=Sat to expo 1=Sun..7=Sat', () => {
    expect(toExpoWeekday(0)).toBe(1); // Sunday
    expect(toExpoWeekday(1)).toBe(2); // Monday
    expect(toExpoWeekday(6)).toBe(7); // Saturday
  });
});

describe('plansFor', () => {
  it('schedules one daily plan for meal and streak reminders', () => {
    const meal = plansFor('mealReminder');
    expect(meal).toHaveLength(1);
    expect(meal[0]).toMatchObject({ kind: 'daily', hour: 20, minute: 0 });

    const streak = plansFor('streakWarning');
    expect(streak[0]).toMatchObject({ kind: 'daily', hour: 20, minute: 30 });
  });

  it('schedules one morning daily plan for the progress-photo reminder', () => {
    const photo = plansFor('progressPhoto');
    expect(photo).toHaveLength(1);
    expect(photo[0]).toMatchObject({ kind: 'daily', hour: 8, minute: 30 });
  });

  it('schedules a weekly Monday plan for the recap', () => {
    const recap = plansFor('weeklyRecap');
    expect(recap).toEqual([
      expect.objectContaining({ kind: 'weekly', weekday: 2, hour: 9 }),
    ]);
  });

  it('fans workout reminders out to one weekly plan per training day, deduped', () => {
    const plans = plansFor('workoutReminder', [1, 3, 3, 5]); // Mon, Wed, Wed, Fri
    expect(plans).toHaveLength(3);
    expect(plans.map((p) => (p.kind === 'weekly' ? p.weekday : 0)).sort()).toEqual([2, 4, 6]);
  });

  it('schedules nothing for workout reminders with no training days', () => {
    expect(plansFor('workoutReminder', [])).toEqual([]);
  });
});
