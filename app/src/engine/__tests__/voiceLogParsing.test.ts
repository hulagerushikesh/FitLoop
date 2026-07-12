import {
  normalizeVoiceBatch,
  activityToSessionFields,
  fuzzyMatchExercise,
  resolveMatchedExercise,
  toKg,
} from '../voiceLogParsing';

describe('normalizeVoiceBatch', () => {
  it('reshapes multiple food items and rounds macros', () => {
    const b = normalizeVoiceBatch({
      transcript: 'two eggs and a banana',
      items: [
        { kind: 'food', food_name: '2 eggs', food_calories: 155.4, food_protein_g: 13, food_carbs_g: 1, food_fat_g: 11 },
        { kind: 'food', food_name: 'banana', food_calories: 105, food_protein_g: 1.3, food_carbs_g: 27, food_fat_g: 0.4 },
      ],
    });
    expect(b.items).toHaveLength(2);
    expect(b.items[0]).toEqual({ kind: 'food', name: '2 eggs', calories: 155, protein_g: 13, carbs_g: 1, fat_g: 11 });
    expect(b.items[1].kind).toBe('food');
    expect(b.message).toBeNull();
  });

  it('handles a mixed batch of food, workout, and activity', () => {
    const b = normalizeVoiceBatch({
      transcript: 'eggs, bench press, and a run',
      items: [
        { kind: 'food', food_name: 'eggs', food_calories: 150 },
        {
          kind: 'workout',
          workout_exercise_name: 'Bench Press',
          workout_matched_exercise_id: 'ex-1',
          workout_sets: [
            { weight: 135, reps: 8, unit: 'lb' },
            { weight: 135, reps: 8, unit: 'lb' },
          ],
        },
        { kind: 'activity', activity_name: 'Running', activity_duration_minutes: 25, activity_estimated_calories: 260 },
      ],
    });
    expect(b.items.map((i) => i.kind)).toEqual(['food', 'workout', 'activity']);
    const workout = b.items[1];
    if (workout.kind !== 'workout') throw new Error('kind');
    expect(workout.sets).toHaveLength(2);
    expect(workout.sets[0].weightKg).toBeCloseTo(61.23, 1);
    expect(workout.matchedExerciseId).toBe('ex-1');
  });

  it('expands and keeps kg workout sets, empty match id → null', () => {
    const b = normalizeVoiceBatch({
      transcript: 'squat',
      items: [
        {
          kind: 'workout',
          workout_exercise_name: 'Squat',
          workout_matched_exercise_id: '',
          workout_sets: [{ weight: 100, reps: 5, unit: 'kg' }],
        },
      ],
    });
    const w = b.items[0];
    if (w.kind !== 'workout') throw new Error('kind');
    expect(w.sets[0].weightKg).toBe(100);
    expect(w.matchedExerciseId).toBeNull();
  });

  it('drops invalid items but keeps valid ones', () => {
    const b = normalizeVoiceBatch({
      transcript: 'x',
      items: [
        { kind: 'food' }, // no name → dropped
        { kind: 'food', food_name: 'toast', food_calories: 90 },
        { kind: 'workout' }, // no name/sets → dropped
        { kind: 'nonsense', foo: 1 }, // unknown kind → dropped
      ],
    });
    expect(b.items).toHaveLength(1);
    expect(b.items[0].kind).toBe('food');
  });

  it('reports an unclear message when no items survive', () => {
    const b = normalizeVoiceBatch({ transcript: 'weather today', items: [], unclear_message: 'Not a log.' });
    expect(b.items).toHaveLength(0);
    expect(b.message).toBe('Not a log.');
    expect(b.transcript).toBe('weather today');
  });

  it('supplies a default message and tolerates malformed payloads', () => {
    expect(normalizeVoiceBatch({ transcript: 'x', items: [] }).message).toMatch(/./);
    expect(normalizeVoiceBatch(null).items).toEqual([]);
    expect(normalizeVoiceBatch('nope').message).toMatch(/./);
    expect(normalizeVoiceBatch(undefined).items).toEqual([]);
  });

  it('floors negative macros at zero', () => {
    const b = normalizeVoiceBatch({
      transcript: 'x',
      items: [{ kind: 'food', food_name: 'mystery', food_calories: -50 }],
    });
    const f = b.items[0];
    if (f.kind !== 'food') throw new Error('kind');
    expect(f.calories).toBe(0);
  });
});

describe('toKg', () => {
  it('converts pounds to kilograms', () => {
    expect(toKg(100, 'lb')).toBeCloseTo(45.36, 1);
  });
  it('leaves kilograms unchanged and preserves null', () => {
    expect(toKg(60, 'kg')).toBe(60);
    expect(toKg(null, 'kg')).toBeNull();
  });
});

describe('activityToSessionFields', () => {
  it('maps an activity into workout_sessions columns', () => {
    const fields = activityToSessionFields({ activityName: 'Evening walk', estimatedCalories: 120 }, '2026-07-11');
    expect(fields).toEqual({
      name: 'Evening walk',
      activity_name: 'Evening walk',
      activity_type: 'cardio',
      calories_burned: 120,
      session_date: '2026-07-11',
    });
  });
});

describe('fuzzyMatchExercise', () => {
  const library = [
    { id: '1', name: 'Barbell Bench Press' },
    { id: '2', name: 'Back Squat' },
    { id: '3', name: 'Romanian Deadlift' },
  ];

  it('matches on shared tokens', () => {
    expect(fuzzyMatchExercise('bench press', library)?.id).toBe('1');
    expect(fuzzyMatchExercise('squat', library)?.id).toBe('2');
  });

  it('returns null when nothing is close enough', () => {
    expect(fuzzyMatchExercise('bicep curl', library)).toBeNull();
  });

  it('returns null for empty input or empty library', () => {
    expect(fuzzyMatchExercise('', library)).toBeNull();
    expect(fuzzyMatchExercise('squat', [])).toBeNull();
  });
});

describe('resolveMatchedExercise', () => {
  const library = [
    { id: '1', name: 'Bench Press' },
    { id: '2', name: 'Squat' },
  ];

  it('prefers a valid server-provided match id', () => {
    expect(resolveMatchedExercise({ exerciseName: 'squat', matchedExerciseId: '1' }, library)?.id).toBe('1');
  });

  it('falls back to fuzzy match when the server id is unknown', () => {
    expect(resolveMatchedExercise({ exerciseName: 'bench press', matchedExerciseId: 'ghost' }, library)?.id).toBe('1');
  });

  it('fuzzy-matches when no server id is given', () => {
    expect(resolveMatchedExercise({ exerciseName: 'squat', matchedExerciseId: null }, library)?.id).toBe('2');
  });

  it('returns null when nothing matches', () => {
    expect(resolveMatchedExercise({ exerciseName: 'deadlift', matchedExerciseId: null }, library)).toBeNull();
  });
});
