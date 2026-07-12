import { generateWeeklyPlan, trainingDaysPerWeek } from '../weeklyPlan';

describe('trainingDaysPerWeek', () => {
  it('scales training days with activity level', () => {
    expect(trainingDaysPerWeek('sedentary')).toBe(3);
    expect(trainingDaysPerWeek('moderate')).toBe(4);
    expect(trainingDaysPerWeek('active')).toBe(5);
    expect(trainingDaysPerWeek('very_active')).toBe(6);
  });
});

describe('generateWeeklyPlan', () => {
  it('is deterministic — same input, same plan', () => {
    const input = { goalType: 'muscle_gain', activityLevel: 'active', sex: 'male' } as const;
    expect(generateWeeklyPlan(input)).toEqual(generateWeeklyPlan(input));
  });

  it('produces 3 days (PPL) for a sedentary user', () => {
    const plan = generateWeeklyPlan({ goalType: 'maintenance', activityLevel: 'sedentary', sex: 'female' });
    expect(plan).toHaveLength(3);
    expect(plan.map((d) => d.splitType)).toEqual(['push', 'pull', 'legs']);
    expect(plan.map((d) => d.dayOfWeek)).toEqual([1, 3, 5]);
  });

  it('produces a 6-day PPL x2 for a very active user with A/B names', () => {
    const plan = generateWeeklyPlan({ goalType: 'muscle_gain', activityLevel: 'very_active', sex: 'male' });
    expect(plan).toHaveLength(6);
    expect(plan.map((d) => d.name)).toEqual(['Push A', 'Pull A', 'Legs A', 'Push B', 'Pull B', 'Legs B']);
    expect(plan.every((d) => d.targetSets === 4 && d.targetReps === 10)).toBe(true);
  });

  it('applies hypertrophy scheme for muscle gain, endurance for fat loss', () => {
    const gain = generateWeeklyPlan({ goalType: 'muscle_gain', activityLevel: 'moderate', sex: 'male' });
    expect(gain[0].focus).toBe('hypertrophy');
    expect(gain[0].targetReps).toBe(10);

    const cut = generateWeeklyPlan({ goalType: 'fat_loss', activityLevel: 'moderate', sex: 'male' });
    expect(cut[0].focus).toBe('endurance');
    expect(cut[0].targetReps).toBe(15);
  });

  it('adds cardio to lower-body days only for fat-loss goals', () => {
    const cut = generateWeeklyPlan({ goalType: 'fat_loss', activityLevel: 'active', sex: 'female' });
    const lower = cut.find((d) => d.splitType === 'lower' || d.splitType === 'legs')!;
    expect(lower.muscleGroups).toContain('cardio');

    const gain = generateWeeklyPlan({ goalType: 'muscle_gain', activityLevel: 'active', sex: 'female' });
    const legs = gain.find((d) => d.splitType === 'legs')!;
    expect(legs.muscleGroups).not.toContain('cardio');
  });

  it('gives different users different plans', () => {
    const a = generateWeeklyPlan({ goalType: 'fat_loss', activityLevel: 'sedentary', sex: 'female' });
    const b = generateWeeklyPlan({ goalType: 'muscle_gain', activityLevel: 'very_active', sex: 'male' });
    expect(a).not.toEqual(b);
    expect(a.length).not.toBe(b.length);
  });
});
