import {
  RECOVERY_HOURS,
  computeRecoveryStates,
  rankRoutinesByRecovery,
  recoveryFraction,
  sessionVolumeByMuscleGroup,
  statusFor,
} from '../muscleRecovery';

const NOW = new Date('2026-07-06T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

describe('recoveryFraction / statusFor', () => {
  it('is 0 immediately after training and 1 after the full window', () => {
    expect(recoveryFraction(new Date(NOW), 48, NOW)).toBe(0);
    expect(recoveryFraction(new Date(hoursAgo(48)), 48, NOW)).toBe(1);
    expect(recoveryFraction(new Date(hoursAgo(96)), 48, NOW)).toBe(1); // clamped
  });

  it('progresses linearly', () => {
    expect(recoveryFraction(new Date(hoursAgo(24)), 48, NOW)).toBe(0.5);
  });

  it('maps fractions to statuses', () => {
    expect(statusFor(0.2)).toBe('fatigued');
    expect(statusFor(0.6)).toBe('recovering');
    expect(statusFor(0.95)).toBe('fresh');
  });
});

describe('computeRecoveryStates', () => {
  it('treats untrained muscle groups as fresh', () => {
    const states = computeRecoveryStates([], NOW);
    expect(states.every((s) => s.status === 'fresh')).toBe(true);
    expect(states.map((s) => s.muscleGroup)).toEqual(Object.keys(RECOVERY_HOURS));
  });

  it('reflects trained groups', () => {
    const states = computeRecoveryStates(
      [{ muscle_group: 'legs', last_trained_at: hoursAgo(12), estimated_recovery_hours: 72 }],
      NOW
    );
    const legs = states.find((s) => s.muscleGroup === 'legs')!;
    expect(legs.status).toBe('fatigued');
    expect(legs.recoveryFraction).toBeCloseTo(12 / 72);
  });
});

describe('rankRoutinesByRecovery', () => {
  it('ranks routines targeting fresh muscles first', () => {
    const states = computeRecoveryStates(
      [
        { muscle_group: 'legs', last_trained_at: hoursAgo(6), estimated_recovery_hours: 72 },
        { muscle_group: 'chest', last_trained_at: hoursAgo(60), estimated_recovery_hours: 60 },
      ],
      NOW
    );
    const ranked = rankRoutinesByRecovery(
      [
        { id: '1', name: 'Legs', muscleGroups: ['legs'] },
        { id: '2', name: 'Chest & Triceps', muscleGroups: ['chest', 'arms'] },
      ],
      states
    );
    expect(ranked[0].name).toBe('Chest & Triceps');
    expect(ranked[0].score).toBe(1);
    expect(ranked[1].score).toBeCloseTo(6 / 72);
  });

  it('puts routines with unknown muscle groups last', () => {
    const ranked = rankRoutinesByRecovery(
      [
        { id: '1', name: 'Mystery', muscleGroups: [] },
        { id: '2', name: 'Abs', muscleGroups: ['core'] },
      ],
      computeRecoveryStates([], NOW)
    );
    expect(ranked[0].name).toBe('Abs');
    expect(ranked[1].score).toBe(0);
  });
});

describe('sessionVolumeByMuscleGroup', () => {
  it('sums weight × reps per muscle group', () => {
    const volume = sessionVolumeByMuscleGroup([
      { muscleGroup: 'chest', weightKg: 100, reps: 5 },
      { muscleGroup: 'chest', weightKg: 100, reps: 5 },
      { muscleGroup: 'arms', weightKg: 20, reps: 10 },
      { muscleGroup: 'core', weightKg: null, reps: 15 }, // bodyweight → 0 volume
    ]);
    expect(volume.get('chest')).toBe(1000);
    expect(volume.get('arms')).toBe(200);
    expect(volume.get('core')).toBe(0);
  });
});
