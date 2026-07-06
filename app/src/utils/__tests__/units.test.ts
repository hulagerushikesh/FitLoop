import {
  cmToIn,
  displayHeight,
  displayWeight,
  formatWeight,
  heightUnitLabel,
  inToCm,
  kgToLb,
  lbToKg,
  parseHeight,
  parseWeight,
  weightUnitLabel,
} from '../units';

describe('weight conversions', () => {
  it('round-trips kg <-> lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2);
    expect(lbToKg(220.462)).toBeCloseTo(100, 2);
    expect(lbToKg(kgToLb(82.5))).toBeCloseTo(82.5, 6);
  });

  it('displays metric unchanged and imperial converted, rounded to 1 dp', () => {
    expect(displayWeight(82.53, 'metric')).toBe(82.5);
    expect(displayWeight(100, 'imperial')).toBe(220.5);
  });

  it('parses user input back to canonical kg', () => {
    expect(parseWeight(82.5, 'metric')).toBe(82.5);
    expect(parseWeight(220.462, 'imperial')).toBeCloseTo(100, 2);
  });

  it('labels and formats with the right unit', () => {
    expect(weightUnitLabel('metric')).toBe('kg');
    expect(weightUnitLabel('imperial')).toBe('lb');
    expect(formatWeight(82.5, 'metric')).toBe('82.5kg');
    expect(formatWeight(100, 'imperial')).toBe('220.5lb');
  });
});

describe('height conversions', () => {
  it('round-trips cm <-> in', () => {
    expect(cmToIn(180)).toBeCloseTo(70.866, 2);
    expect(inToCm(70.866)).toBeCloseTo(180, 2);
  });

  it('displays and parses per unit system', () => {
    expect(displayHeight(180, 'metric')).toBe(180);
    expect(displayHeight(180, 'imperial')).toBe(70.9);
    expect(parseHeight(70.866, 'imperial')).toBeCloseTo(180, 2);
    expect(heightUnitLabel('imperial')).toBe('in');
  });
});
