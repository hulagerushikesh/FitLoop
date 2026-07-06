import { useMemo } from 'react';
import { useProfile } from './useProfile';
import type { UnitSystem } from '../types/database';
import {
  displayHeight,
  displayWeight,
  formatWeight,
  heightUnitLabel,
  parseHeight,
  parseWeight,
  weightUnitLabel,
} from '../utils/units';

export interface Units {
  unitSystem: UnitSystem;
  weightUnit: 'kg' | 'lb';
  heightUnit: 'cm' | 'in';
  /** kg (canonical) → number in the user's display unit */
  displayWeight: (kg: number) => number;
  /** user-entered number in their unit → canonical kg */
  parseWeight: (value: number) => number;
  displayHeight: (cm: number) => number;
  parseHeight: (value: number) => number;
  /** "82.5kg" / "181.9lb" */
  formatWeight: (kg: number) => string;
}

/**
 * The user's unit preference (profiles.unit_system) plus conversion helpers.
 * Storage is always metric; every weight/height input and display should go
 * through this hook rather than hardcoding kg/cm.
 */
export function useUnits(): Units {
  const { profile } = useProfile();
  const unitSystem: UnitSystem = profile?.unit_system ?? 'metric';

  return useMemo(
    () => ({
      unitSystem,
      weightUnit: weightUnitLabel(unitSystem),
      heightUnit: heightUnitLabel(unitSystem),
      displayWeight: (kg) => displayWeight(kg, unitSystem),
      parseWeight: (value) => parseWeight(value, unitSystem),
      displayHeight: (cm) => displayHeight(cm, unitSystem),
      parseHeight: (value) => parseHeight(value, unitSystem),
      formatWeight: (kg) => formatWeight(kg, unitSystem),
    }),
    [unitSystem]
  );
}
