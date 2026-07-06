// Pure unit conversions. The database stores canonical metric (kg / cm);
// these convert for display and parse user input back to metric.

import type { UnitSystem } from '../types/database';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

/** Kg → display number in the user's weight unit, rounded to 1 decimal. */
export function displayWeight(kg: number, unit: UnitSystem): number {
  const v = unit === 'imperial' ? kgToLb(kg) : kg;
  return Math.round(v * 10) / 10;
}

/** User-entered weight in their unit → canonical kg. */
export function parseWeight(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? lbToKg(value) : value;
}

/** Cm → display number in the user's length unit, rounded to 1 decimal. */
export function displayHeight(cm: number, unit: UnitSystem): number {
  const v = unit === 'imperial' ? cmToIn(cm) : cm;
  return Math.round(v * 10) / 10;
}

/** User-entered height in their unit → canonical cm. */
export function parseHeight(value: number, unit: UnitSystem): number {
  return unit === 'imperial' ? inToCm(value) : value;
}

export function weightUnitLabel(unit: UnitSystem): 'kg' | 'lb' {
  return unit === 'imperial' ? 'lb' : 'kg';
}

export function heightUnitLabel(unit: UnitSystem): 'cm' | 'in' {
  return unit === 'imperial' ? 'in' : 'cm';
}

/** "82.5kg" / "181.9lb" — for compact set summaries. */
export function formatWeight(kg: number, unit: UnitSystem): string {
  return `${displayWeight(kg, unit)}${weightUnitLabel(unit)}`;
}
