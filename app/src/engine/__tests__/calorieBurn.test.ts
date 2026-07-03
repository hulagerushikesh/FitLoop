import {
  calculateWeightedAverageMET,
  calculateCaloriesBurned,
  estimateDurationMinutes,
  estimateSessionCalories,
} from '../calorieBurn';

describe('calculateCaloriesBurned', () => {
  it('applies the MET formula', () => {
    // 6 MET * 80kg * (45/60) hours = 360
    expect(calculateCaloriesBurned(6, 80, 45)).toBe(360);
  });

  it('returns 0 for 0 duration', () => {
    expect(calculateCaloriesBurned(6, 80, 0)).toBe(0);
  });
});

describe('calculateWeightedAverageMET', () => {
  it('weights MET by number of sets', () => {
    // (6*3 + 3.5*2) / 5 = 25/5 = 5
    expect(
      calculateWeightedAverageMET([
        { metValue: 6, setCount: 3 },
        { metValue: 3.5, setCount: 2 },
      ])
    ).toBe(5);
  });

  it('returns 0 when there are no sets', () => {
    expect(calculateWeightedAverageMET([])).toBe(0);
    expect(calculateWeightedAverageMET([{ metValue: 6, setCount: 0 }])).toBe(0);
  });
});

describe('estimateDurationMinutes', () => {
  it('uses the default minutes-per-set', () => {
    expect(estimateDurationMinutes(15)).toBe(45);
  });

  it('accepts a custom minutes-per-set', () => {
    expect(estimateDurationMinutes(10, 2)).toBe(20);
  });
});

describe('estimateSessionCalories', () => {
  it('combines weighted MET and duration', () => {
    const exercises = [
      { metValue: 6, setCount: 3 }, // squat, 3 sets
      { metValue: 3.5, setCount: 3 }, // leg curl, 3 sets
    ];
    // avgMet = (6*3+3.5*3)/6 = 4.75; duration = 6 sets * 3 min = 18 min
    const expectedAvgMet = (6 * 3 + 3.5 * 3) / 6;
    const expected = Math.round(expectedAvgMet * 80 * (18 / 60));
    expect(estimateSessionCalories(exercises, 80, estimateDurationMinutes(6))).toBe(expected);
  });

  it('returns 0 for an empty session', () => {
    expect(estimateSessionCalories([], 80, 0)).toBe(0);
  });
});
