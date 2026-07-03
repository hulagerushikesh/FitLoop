import { suggestNextSet, bestSet } from '../progressiveOverload';

describe('suggestNextSet', () => {
  it('suggests +2.5kg same reps, or same weight +1 rep', () => {
    const suggestions = suggestNextSet({ weightKg: 60, reps: 10 });
    expect(suggestions).toEqual([
      { weightKg: 62.5, reps: 10, label: '62.5kg x 10' },
      { weightKg: 60, reps: 11, label: '60kg x 11' },
    ]);
  });

  it('accepts a custom weight increment', () => {
    const suggestions = suggestNextSet({ weightKg: 100, reps: 5 }, 5);
    expect(suggestions[0]).toEqual({ weightKg: 105, reps: 5, label: '105kg x 5' });
  });
});

describe('bestSet', () => {
  it('picks the heaviest set', () => {
    expect(
      bestSet([
        { weightKg: 60, reps: 10 },
        { weightKg: 65, reps: 8 },
        { weightKg: 62.5, reps: 9 },
      ])
    ).toEqual({ weightKg: 65, reps: 8 });
  });

  it('uses reps as a tiebreaker on equal weight', () => {
    expect(
      bestSet([
        { weightKg: 60, reps: 8 },
        { weightKg: 60, reps: 10 },
      ])
    ).toEqual({ weightKg: 60, reps: 10 });
  });

  it('returns null for an empty list', () => {
    expect(bestSet([])).toBeNull();
  });
});
