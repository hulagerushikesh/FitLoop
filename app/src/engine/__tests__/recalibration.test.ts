import { computeRecalibration, type WeightPoint } from '../recalibration';

function dateAt(day: number): string {
  // day 1 -> '2026-01-01', day 14 -> '2026-01-14'
  return `2026-01-${String(day).padStart(2, '0')}`;
}

function buildHistory(previousWeekWeights: number[], recentWeekWeights: number[]): WeightPoint[] {
  const history: WeightPoint[] = [];
  previousWeekWeights.forEach((w, i) => history.push({ date: dateAt(i + 1), weightKg: w }));
  recentWeekWeights.forEach((w, i) => history.push({ date: dateAt(i + 8), weightKg: w }));
  return history;
}

describe('computeRecalibration', () => {
  it('does not adjust when there is no weight history', () => {
    const result = computeRecalibration({
      weightHistory: [],
      currentCalorieTarget: 2200,
      targetRateKgPerWeek: -0.5,
      goalType: 'fat_loss',
    });
    expect(result.adjusted).toBe(false);
  });

  it('does not adjust when a window has fewer than 3 weigh-ins', () => {
    const history = buildHistory([80, 79.9], [79.7, 79.6]); // only 2 points per window
    const result = computeRecalibration({
      weightHistory: history,
      currentCalorieTarget: 2200,
      targetRateKgPerWeek: -0.5,
      goalType: 'fat_loss',
    });
    expect(result.adjusted).toBe(false);
    expect(result.actualRateKgPerWeek).toBeNull();
  });

  it('does not adjust when the trend is within threshold', () => {
    // previous week avg 80.0, recent week avg 79.6 -> actual rate -0.4, close to target -0.5
    const history = buildHistory([80, 80, 80], [79.6, 79.6, 79.6]);
    const result = computeRecalibration({
      weightHistory: history,
      currentCalorieTarget: 2200,
      targetRateKgPerWeek: -0.5,
      goalType: 'fat_loss',
    });
    expect(result.adjusted).toBe(false);
    expect(result.reason).toMatch(/on track/i);
  });

  it('reduces the target when fat-loss weight loss is slower than expected', () => {
    // previous week avg 80.0, recent week avg 79.8 -> actual rate -0.2, expected -0.5 (deviation +0.3)
    const history = buildHistory([80, 80, 80], [79.8, 79.8, 79.8]);
    const result = computeRecalibration({
      weightHistory: history,
      currentCalorieTarget: 2200,
      targetRateKgPerWeek: -0.5,
      goalType: 'fat_loss',
    });
    expect(result.adjusted).toBe(true);
    if (result.adjusted) {
      expect(result.newCalorieTarget).toBeLessThan(2200);
      expect(result.deltaKcal).toBeLessThan(0);
      expect(result.reason).toMatch(/slower than expected/i);
      expect(result.reason).toMatch(/reduced/i);
    }
  });

  it('increases the target when fat-loss weight loss is faster than expected', () => {
    // previous week avg 80.0, recent week avg 79.1 -> actual rate -0.9, expected -0.5 (deviation -0.4)
    const history = buildHistory([80, 80, 80], [79.1, 79.1, 79.1]);
    const result = computeRecalibration({
      weightHistory: history,
      currentCalorieTarget: 2200,
      targetRateKgPerWeek: -0.5,
      goalType: 'fat_loss',
    });
    expect(result.adjusted).toBe(true);
    if (result.adjusted) {
      expect(result.newCalorieTarget).toBeGreaterThan(2200);
      expect(result.reason).toMatch(/faster than expected/i);
      expect(result.reason).toMatch(/increased/i);
    }
  });

  it('reduces the target when muscle-gain weight gain is faster than expected', () => {
    // previous week avg 70.0, recent week avg 70.6 -> actual rate +0.6, expected +0.25 (deviation +0.35)
    const history = buildHistory([70, 70, 70], [70.6, 70.6, 70.6]);
    const result = computeRecalibration({
      weightHistory: history,
      currentCalorieTarget: 2800,
      targetRateKgPerWeek: 0.25,
      goalType: 'muscle_gain',
    });
    expect(result.adjusted).toBe(true);
    if (result.adjusted) {
      expect(result.newCalorieTarget).toBeLessThan(2800);
      expect(result.reason).toMatch(/faster than expected/i);
      expect(result.reason).toMatch(/limit excess fat gain/i);
    }
  });

  it('increases the target when muscle-gain weight gain is slower than expected', () => {
    // previous week avg 70.0, recent week avg 70.05 -> actual rate +0.05, expected +0.25 (deviation -0.2)
    const history = buildHistory([70, 70, 70], [70.05, 70.05, 70.05]);
    const result = computeRecalibration({
      weightHistory: history,
      currentCalorieTarget: 2800,
      targetRateKgPerWeek: 0.25,
      goalType: 'muscle_gain',
    });
    expect(result.adjusted).toBe(true);
    if (result.adjusted) {
      expect(result.newCalorieTarget).toBeGreaterThan(2800);
      expect(result.reason).toMatch(/slower than expected/i);
    }
  });

  it('adjusts maintenance targets back toward the starting weight', () => {
    // trending up: previous week avg 75.0, recent week avg 75.4 -> deviation +0.4
    const up = buildHistory([75, 75, 75], [75.4, 75.4, 75.4]);
    const upResult = computeRecalibration({
      weightHistory: up,
      currentCalorieTarget: 2500,
      targetRateKgPerWeek: 0,
      goalType: 'maintenance',
    });
    expect(upResult.adjusted).toBe(true);
    if (upResult.adjusted) {
      expect(upResult.newCalorieTarget).toBeLessThan(2500);
      expect(upResult.reason).toMatch(/trended up/i);
    }

    // trending down: previous week avg 75.0, recent week avg 74.6 -> deviation -0.4
    const down = buildHistory([75, 75, 75], [74.6, 74.6, 74.6]);
    const downResult = computeRecalibration({
      weightHistory: down,
      currentCalorieTarget: 2500,
      targetRateKgPerWeek: 0,
      goalType: 'maintenance',
    });
    expect(downResult.adjusted).toBe(true);
    if (downResult.adjusted) {
      expect(downResult.newCalorieTarget).toBeGreaterThan(2500);
      expect(downResult.reason).toMatch(/trended down/i);
    }
  });

  it('never proposes a target below the safety floor', () => {
    const history = buildHistory([80, 80, 80], [79.8, 79.8, 79.8]); // triggers a reduction
    const result = computeRecalibration({
      weightHistory: history,
      currentCalorieTarget: 1250, // close to the default 1200 floor
      targetRateKgPerWeek: -0.5,
      goalType: 'fat_loss',
    });
    expect(result.adjusted).toBe(true);
    if (result.adjusted) {
      expect(result.newCalorieTarget).toBeGreaterThanOrEqual(1200);
    }
  });
});
