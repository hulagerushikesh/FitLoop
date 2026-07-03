// Minimal local copy of the type aliases this function needs from
// app/src/types/database.ts. Deno can't import across the app's
// TS project boundary, so these are duplicated — keep in sync if the
// app's enums change.
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'fat_loss' | 'muscle_gain' | 'maintenance';
