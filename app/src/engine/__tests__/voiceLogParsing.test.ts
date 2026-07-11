import {
  normalizeVoiceResult,
  activityToSessionFields,
  fuzzyMatchExercise,
  resolveMatchedExercise,
  toKg,
  type VoiceWorkout,
} from '../voiceLogParsing';

describe('normalizeVoiceResult', () => {
  it('reshapes a food payload and rounds macros', () => {
    const r = normalizeVoiceResult({
      type: 'food',
      transcript: 'two eggs and toast',
      food_name: '2 eggs and toast',
      food_calories: 245.6,
      food_protein_g: 18.2,
      food_carbs_g: 20,
      food_fat_g: 11.9,
      food_confidence: 0.8,
    });
    expect(r.type).toBe('food');
    if (r.type !== 'food') throw new Error('type');
    expect(r.food).toEqual({
      name: '2 eggs and toast',
      calories: 246,
      protein_g: 18,
      carbs_g: 20,
      fat_g: 12,
      confidence: 0.8,
    });
  });

  it('clamps confidence into 0..1 and floors negative macros at 0', () => {
    const r = normalizeVoiceResult({
      type: 'food',
      transcript: 'x',
      food_name: 'mystery',
      food_calories: -50,
      food_confidence: 5,
    });
    if (r.type !== 'food') throw new Error('type');
    expect(r.food.calories).toBe(0);
    expect(r.food.confidence).toBe(1);
  });

  it('expands workout sets and normalizes lb → kg', () => {
    const r = normalizeVoiceResult({
      type: 'workout',
      transcript: 'bench press 3 by 8 at 135 pounds',
      workout_exercise_name: 'Bench Press',
      workout_matched_exercise_id: 'ex-1',
      workout_sets: [
        { weight: 135, reps: 8, unit: 'lb' },
        { weight: 135, reps: 8, unit: 'lb' },
        { weight: 135, reps: 8, unit: 'lb' },
      ],
    });
    if (r.type !== 'workout') throw new Error('type');
    expect(r.workout.sets).toHaveLength(3);
    expect(r.workout.sets[0].reps).toBe(8);
    expect(r.workout.sets[0].weightKg).toBeCloseTo(61.23, 1);
    expect(r.workout.matchedExerciseId).toBe('ex-1');
  });

  it('keeps kg weights as-is and treats empty match id as null', () => {
    const r = normalizeVoiceResult({
      type: 'workout',
      transcript: 'squat',
      workout_exercise_name: 'Squat',
      workout_matched_exercise_id: '',
      workout_sets: [{ weight: 100, reps: 5, unit: 'kg' }],
    });
    if (r.type !== 'workout') throw new Error('type');
    expect(r.workout.sets[0].weightKg).toBe(100);
    expect(r.workout.matchedExerciseId).toBeNull();
  });

  it('parses an activity result', () => {
    const r = normalizeVoiceResult({
      type: 'activity',
      transcript: 'I ran for 25 minutes',
      activity_name: 'Running',
      activity_duration_minutes: 25,
      activity_estimated_calories: 260,
    });
    if (r.type !== 'activity') throw new Error('type');
    expect(r.activity.activityName).toBe('Running');
    expect(r.activity.durationMinutes).toBe(25);
    expect(r.activity.estimatedCalories).toBe(260);
  });

  it('downgrades a food payload with no name to unclear', () => {
    const r = normalizeVoiceResult({ type: 'food', transcript: 'mumble', food_calories: 100 });
    expect(r.type).toBe('unclear');
    if (r.type !== 'unclear') throw new Error('type');
    expect(r.transcript).toBe('mumble');
    expect(r.message.length).toBeGreaterThan(0);
  });

  it('downgrades a workout payload with neither name nor sets to unclear', () => {
    const r = normalizeVoiceResult({ type: 'workout', transcript: 'uh' });
    expect(r.type).toBe('unclear');
  });

  it('passes through an explicit unclear message', () => {
    const r = normalizeVoiceResult({ type: 'unclear', transcript: 'weather', message: 'Not a log.' });
    if (r.type !== 'unclear') throw new Error('type');
    expect(r.message).toBe('Not a log.');
  });

  it('handles a totally malformed payload', () => {
    expect(normalizeVoiceResult(null).type).toBe('unclear');
    expect(normalizeVoiceResult(undefined).type).toBe('unclear');
    expect(normalizeVoiceResult('nope').type).toBe('unclear');
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
    const fields = activityToSessionFields(
      { activityName: 'Evening walk', durationMinutes: 30, estimatedCalories: 120, notes: null },
      '2026-07-11'
    );
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
    const w: VoiceWorkout = { exerciseName: 'squat', matchedExerciseId: '1', sets: [], notes: null };
    expect(resolveMatchedExercise(w, library)?.id).toBe('1');
  });

  it('falls back to fuzzy match when the server id is unknown', () => {
    const w: VoiceWorkout = { exerciseName: 'bench press', matchedExerciseId: 'ghost', sets: [], notes: null };
    expect(resolveMatchedExercise(w, library)?.id).toBe('1');
  });

  it('fuzzy-matches when no server id is given', () => {
    const w: VoiceWorkout = { exerciseName: 'squat', matchedExerciseId: null, sets: [], notes: null };
    expect(resolveMatchedExercise(w, library)?.id).toBe('2');
  });

  it('returns null when nothing matches', () => {
    const w: VoiceWorkout = { exerciseName: 'deadlift', matchedExerciseId: null, sets: [], notes: null };
    expect(resolveMatchedExercise(w, library)).toBeNull();
  });
});
