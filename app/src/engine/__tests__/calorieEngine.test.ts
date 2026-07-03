import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacros,
  computeInitialTargets,
  MIN_SAFE_CALORIE_TARGET,
} from '../calorieEngine';

describe('calculateBMR', () => {
  it('computes male BMR with Mifflin-St Jeor', () => {
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5
    expect(calculateBMR({ sex: 'male', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
  });

  it('computes female BMR with Mifflin-St Jeor', () => {
    // 10*65 + 6.25*165 - 5*25 - 161 = 650 + 1031.25 - 125 - 161
    expect(calculateBMR({ sex: 'female', weightKg: 65, heightCm: 165, age: 25 })).toBeCloseTo(1395.25);
  });

  it('computes other BMR as the midpoint of the male/female offsets', () => {
    // 10*70 + 6.25*170 - 5*28 - 78 = 700 + 1062.5 - 140 - 78
    expect(calculateBMR({ sex: 'other', weightKg: 70, heightCm: 170, age: 28 })).toBeCloseTo(1544.5);
  });
});

describe('calculateTDEE', () => {
  it('applies the activity multiplier', () => {
    expect(calculateTDEE(1780, 'moderate')).toBeCloseTo(1780 * 1.55);
    expect(calculateTDEE(1780, 'sedentary')).toBeCloseTo(1780 * 1.2);
    expect(calculateTDEE(1780, 'very_active')).toBeCloseTo(1780 * 1.9);
  });
});

describe('calculateCalorieTarget', () => {
  it('cuts 20% for fat loss', () => {
    expect(calculateCalorieTarget(2759, 'fat_loss')).toBe(Math.round(2759 * 0.8));
  });

  it('adds 12.5% for muscle gain', () => {
    expect(calculateCalorieTarget(2759, 'muscle_gain')).toBe(Math.round(2759 * 1.125));
  });

  it('keeps TDEE unchanged for maintenance', () => {
    expect(calculateCalorieTarget(2759, 'maintenance')).toBe(2759);
  });

  it('never returns below the safety floor', () => {
    expect(calculateCalorieTarget(1000, 'fat_loss')).toBe(MIN_SAFE_CALORIE_TARGET);
  });
});

describe('calculateMacros', () => {
  it('splits calories into protein/fat/carbs', () => {
    const macros = calculateMacros(80, 2200, 'fat_loss');
    expect(macros.protein_g).toBe(176); // 80 * 2.2
    expect(macros.fat_g).toBe(67); // round(2200*0.275/9)
    // carbs should absorb the remainder
    const proteinKcal = macros.protein_g * 4;
    const fatKcal = macros.fat_g * 9;
    expect(macros.carbs_g).toBe(Math.round((2200 - proteinKcal - fatKcal) / 4));
  });

  it('clamps carbs at zero instead of going negative', () => {
    // Heavy bodyweight + low calorie target: protein+fat alone exceed the target.
    const macros = calculateMacros(150, MIN_SAFE_CALORIE_TARGET, 'fat_loss');
    expect(macros.carbs_g).toBe(0);
  });
});

describe('computeInitialTargets', () => {
  it('chains BMR -> TDEE -> calorie target -> macros', () => {
    const result = computeInitialTargets({
      sex: 'male',
      weightKg: 80,
      heightCm: 180,
      age: 30,
      activityLevel: 'moderate',
      goalType: 'fat_loss',
    });

    expect(result.bmr).toBe(1780);
    expect(result.tdee).toBe(Math.round(1780 * 1.55));
    expect(result.calories).toBe(Math.max(MIN_SAFE_CALORIE_TARGET, Math.round(result.tdee * 0.8)));
    expect(result.protein_g).toBeGreaterThan(0);
    expect(result.fat_g).toBeGreaterThan(0);
    expect(result.carbs_g).toBeGreaterThanOrEqual(0);
  });
});
