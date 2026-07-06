import {
  STANDARD_BAR_KG,
  STANDARD_PLATES_KG,
  STANDARD_PLATES_LB,
  calculatePlates,
} from '../plateCalculator';

describe('calculatePlates', () => {
  it('computes an exact standard load (100kg on a 20kg bar)', () => {
    const result = calculatePlates(100, STANDARD_BAR_KG, STANDARD_PLATES_KG)!;
    expect(result.perSide).toEqual([25, 15]);
    expect(result.achievedTotal).toBe(100);
    expect(result.remainderPerSide).toBe(0);
  });

  it('uses small plates when needed (62.5kg)', () => {
    const result = calculatePlates(62.5, STANDARD_BAR_KG, STANDARD_PLATES_KG)!;
    expect(result.perSide).toEqual([20, 1.25]);
    expect(result.achievedTotal).toBe(62.5);
  });

  it('returns empty bar for target == bar weight', () => {
    const result = calculatePlates(20, STANDARD_BAR_KG, STANDARD_PLATES_KG)!;
    expect(result.perSide).toEqual([]);
    expect(result.achievedTotal).toBe(20);
  });

  it('returns null when the target is below the bar', () => {
    expect(calculatePlates(15, STANDARD_BAR_KG, STANDARD_PLATES_KG)).toBeNull();
  });

  it('reports a remainder when the target is not representable', () => {
    // 101kg → 40.5/side → 25+15 leaves 0.5/side unloadable
    const result = calculatePlates(101, STANDARD_BAR_KG, STANDARD_PLATES_KG)!;
    expect(result.perSide).toEqual([25, 15]);
    expect(result.remainderPerSide).toBe(0.5);
    expect(result.achievedTotal).toBe(100);
  });

  it('handles lb plates (225lb bench = 2×45 per side)', () => {
    const result = calculatePlates(225, 45, STANDARD_PLATES_LB)!;
    expect(result.perSide).toEqual([45, 45]);
    expect(result.achievedTotal).toBe(225);
  });
});
