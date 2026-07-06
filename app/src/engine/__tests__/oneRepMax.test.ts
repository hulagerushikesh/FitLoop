import { bestEstimatedOneRepMax, estimateOneRepMax, isNewPr } from '../oneRepMax';

describe('estimateOneRepMax (Epley)', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it('computes Epley for typical rep ranges', () => {
    // 100 × (1 + 8/30) = 126.67 → 126.7
    expect(estimateOneRepMax(100, 8)).toBe(126.7);
    // 60 × (1 + 5/30) = 70
    expect(estimateOneRepMax(60, 5)).toBe(70);
  });

  it('caps rep contribution beyond 12 reps', () => {
    expect(estimateOneRepMax(50, 30)).toBe(estimateOneRepMax(50, 12));
  });

  it('returns 0 for degenerate input', () => {
    expect(estimateOneRepMax(0, 5)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe('bestEstimatedOneRepMax', () => {
  it('picks the highest estimate across sets', () => {
    const best = bestEstimatedOneRepMax([
      { weightKg: 100, reps: 5 }, // 116.7
      { weightKg: 110, reps: 2 }, // 117.3
      { weightKg: null, reps: 10 },
    ]);
    expect(best).toBe(117.3);
  });

  it('returns 0 when no usable sets', () => {
    expect(bestEstimatedOneRepMax([{ weightKg: null, reps: null }])).toBe(0);
  });
});

describe('isNewPr', () => {
  it('celebrates beating the historical best', () => {
    expect(isNewPr(105, 5, 116)).toBe(true); // 122.5 > 116
  });

  it('does not celebrate matching or missing the best', () => {
    expect(isNewPr(100, 5, 116.7)).toBe(false);
    expect(isNewPr(80, 5, 116.7)).toBe(false);
  });

  it('never fires with no history (historicalBest 0)', () => {
    expect(isNewPr(100, 5, 0)).toBe(false);
  });
});
