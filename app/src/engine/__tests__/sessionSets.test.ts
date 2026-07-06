import { appendSet, nextSetNumber, totalSets, type LoggedSets } from '../sessionSets';

const set = (weight: number, reps: number) => ({ weight_kg: weight, reps, rpe: null });

describe('session set logging transitions', () => {
  it('numbers sets 1-based per exercise', () => {
    const sets: LoggedSets = { squat: [set(100, 5)] };
    expect(nextSetNumber(sets, 'squat')).toBe(2);
    expect(nextSetNumber(sets, 'bench')).toBe(1); // untouched exercise starts at 1
  });

  it('appends immutably and only to the target exercise', () => {
    const before: LoggedSets = { squat: [set(100, 5)], bench: [set(60, 8)] };
    const after = appendSet(before, 'squat', set(102.5, 5));

    expect(after.squat).toHaveLength(2);
    expect(after.squat[1]).toEqual(set(102.5, 5));
    expect(before.squat).toHaveLength(1); // original not mutated
    expect(after.bench).toBe(before.bench); // other exercise untouched
  });

  it('counts total sets across exercises', () => {
    expect(totalSets({ squat: [set(100, 5), set(100, 5)], bench: [set(60, 8)] })).toBe(3);
    expect(totalSets({})).toBe(0);
  });

  it('models the full log flow: append then the next number advances', () => {
    let sets: LoggedSets = {};
    const n1 = nextSetNumber(sets, 'ohp');
    sets = appendSet(sets, 'ohp', set(40, 10));
    const n2 = nextSetNumber(sets, 'ohp');
    expect([n1, n2]).toEqual([1, 2]);
    expect(totalSets(sets)).toBe(1);
  });
});
