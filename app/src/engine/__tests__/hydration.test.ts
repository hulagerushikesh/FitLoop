import { computeWaterGoalMl, hydrationProgress } from '../hydration';

describe('computeWaterGoalMl', () => {
  it('is deterministic — same input, same goal', () => {
    expect(computeWaterGoalMl(80, 'moderate')).toBe(computeWaterGoalMl(80, 'moderate'));
  });

  it('scales with body weight (~35 ml/kg, rounded to 100 ml)', () => {
    // 80 kg * 35 = 2800, no activity bonus → 2800
    expect(computeWaterGoalMl(80, 'sedentary')).toBe(2800);
    // 60 kg * 35 = 2100 → 2100
    expect(computeWaterGoalMl(60, 'sedentary')).toBe(2100);
  });

  it('adds a sweat-loss bonus for more active users', () => {
    const sedentary = computeWaterGoalMl(80, 'sedentary');
    const active = computeWaterGoalMl(80, 'very_active');
    expect(active).toBeGreaterThan(sedentary);
    // 2800 + 1000 = 3800
    expect(active).toBe(3800);
  });

  it('rounds to a friendly 100 ml step', () => {
    // 77 kg * 35 = 2695 → nearest 100 = 2700
    expect(computeWaterGoalMl(77, 'sedentary') % 100).toBe(0);
    expect(computeWaterGoalMl(77, 'sedentary')).toBe(2700);
  });

  it('clamps to a sane range', () => {
    expect(computeWaterGoalMl(30, 'sedentary')).toBe(2000); // floor
    expect(computeWaterGoalMl(200, 'very_active')).toBe(5000); // ceiling
  });

  it('falls back to a default weight when unknown', () => {
    // 70 kg default * 35 = 2450 → nearest 100 = 2500
    expect(computeWaterGoalMl(null, 'sedentary')).toBe(2500);
    expect(computeWaterGoalMl(0, null)).toBe(2500);
  });
});

describe('hydrationProgress', () => {
  it('returns the fraction of the goal met, capped at 1', () => {
    expect(hydrationProgress(1500, 3000)).toBe(0.5);
    expect(hydrationProgress(3000, 3000)).toBe(1);
    expect(hydrationProgress(4000, 3000)).toBe(1);
  });

  it('is safe for zero/negative goals', () => {
    expect(hydrationProgress(500, 0)).toBe(0);
  });
});
