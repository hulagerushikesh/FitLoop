import React, { createContext, useContext, useState } from 'react';
import type { ActivityLevel, GoalType, Sex, UnitSystem } from '../../types/database';

export interface OnboardingDraft {
  age?: number;
  sex?: Sex;
  height_cm?: number;
  weight_kg?: number;
  activity_level?: ActivityLevel;
  goal_type?: GoalType;
  target_rate_kg_per_week?: number;
  unit_system: UnitSystem;
}

interface OnboardingContextValue {
  draft: OnboardingDraft;
  update: (fields: Partial<OnboardingDraft>) => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>({ unit_system: 'metric' });
  const update = (fields: Partial<OnboardingDraft>) =>
    setDraft((prev) => ({ ...prev, ...fields }));

  return (
    <OnboardingContext.Provider value={{ draft, update }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingDraft(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboardingDraft must be used within OnboardingProvider');
  return ctx;
}
