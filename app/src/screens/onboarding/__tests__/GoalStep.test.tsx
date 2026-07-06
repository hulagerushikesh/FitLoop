import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../../../theme';
import GoalStep from '../GoalStep';

// A fully-filled onboarding draft so the "Finish" button is enabled.
const DRAFT = {
  age: 30,
  sex: 'male' as const,
  height_cm: 180,
  weight_kg: 80,
  activity_level: 'moderate' as const,
  goal_type: 'muscle_gain' as const,
  target_rate_kg_per_week: 0.25,
  unit_system: 'metric' as const,
};

// `mock`-prefixed so jest.mock factories may reference them (jest hoisting rule).
const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockInsertGoal = jest.fn().mockResolvedValue(undefined);
const mockSeedStandardPlan = jest.fn().mockResolvedValue(undefined);
const mockRefresh = jest.fn().mockResolvedValue(undefined);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('../../../hooks/useProfile', () => ({ useProfile: () => ({ refresh: mockRefresh }) }));
jest.mock('../../../services/profile', () => ({
  completeOnboarding: (...a: unknown[]) => mockCompleteOnboarding(...a),
}));
jest.mock('../../../services/goals', () => ({ insertGoal: (...a: unknown[]) => mockInsertGoal(...a) }));
jest.mock('../../../services/workouts', () => ({
  seedStandardPlan: (...a: unknown[]) => mockSeedStandardPlan(...a),
}));
jest.mock('../OnboardingContext', () => ({
  useOnboardingDraft: () => ({ draft: DRAFT, update: jest.fn() }),
}));

function renderGoalStep() {
  return render(
    <ThemeProvider>
      {/* navigation props are unused by GoalStep */}
      <GoalStep {...({} as React.ComponentProps<typeof GoalStep>)} />
    </ThemeProvider>
  );
}

describe('Onboarding GoalStep (integration)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('completes the wizard and persists a sane calorie target + macros', async () => {
    const { getByText } = renderGoalStep();

    fireEvent.press(getByText('Finish'));

    await waitFor(() => expect(mockInsertGoal).toHaveBeenCalledTimes(1));

    expect(mockCompleteOnboarding).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ goal_type: 'muscle_gain' })
    );

    const [, goal] = mockInsertGoal.mock.calls[0];
    // Sanity: an 80kg moderately-active male bulking should land well within a
    // believable range, and every macro should be positive.
    expect(goal.calorie_target).toBeGreaterThan(2000);
    expect(goal.calorie_target).toBeLessThan(3800);
    expect(goal.protein_g).toBeGreaterThan(0);
    expect(goal.fat_g).toBeGreaterThan(0);
    expect(goal.carbs_g).toBeGreaterThan(0);
  });
});
