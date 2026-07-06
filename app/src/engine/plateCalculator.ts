// Plate calculator: given a target total bar weight and the bar's own
// weight, work out which plates go on EACH SIDE using standard plate
// denominations. Greedy largest-first is exact for standard sets because
// every denomination divides the next one up.

export const STANDARD_BAR_KG = 20;
export const STANDARD_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export const STANDARD_BAR_LB = 45;
export const STANDARD_PLATES_LB = [45, 35, 25, 10, 5, 2.5] as const;

export interface PlateBreakdown {
  /** plates for ONE side, largest first, e.g. [20, 5, 2.5] */
  perSide: number[];
  /** total achieved with these plates (== target when achievable) */
  achievedTotal: number;
  /** leftover weight that couldn't be represented per side (0 when exact) */
  remainderPerSide: number;
}

export function calculatePlates(
  targetTotal: number,
  barWeight: number,
  plateSizes: readonly number[]
): PlateBreakdown | null {
  if (targetTotal < barWeight) return null;

  let perSideRemaining = (targetTotal - barWeight) / 2;
  const perSide: number[] = [];
  const EPSILON = 1e-9;

  for (const plate of plateSizes) {
    while (perSideRemaining + EPSILON >= plate) {
      perSide.push(plate);
      perSideRemaining -= plate;
    }
  }

  const remainderPerSide = Math.round(perSideRemaining * 100) / 100;
  const achievedTotal = targetTotal - remainderPerSide * 2;
  return { perSide, achievedTotal, remainderPerSide };
}
