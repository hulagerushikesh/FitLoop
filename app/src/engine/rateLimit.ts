// Pure sliding-window rate-limit check. Protects the Gemini-backed meal
// analysis from runaway usage (and the API bill) without any server state —
// call timestamps are persisted client-side and evaluated here.

export interface RateLimitResult {
  allowed: boolean;
  /** ms until the oldest in-window call ages out (0 when allowed) */
  retryAfterMs: number;
  /** timestamps to persist if the call proceeds (window-trimmed, now appended) */
  nextTimestamps: number[];
}

/**
 * Allows a call when fewer than `maxCalls` have happened within `windowMs`.
 * Trims timestamps outside the window; when allowed, appends `now`.
 */
export function checkRateLimit(
  timestamps: number[],
  now: number,
  windowMs: number,
  maxCalls: number
): RateLimitResult {
  const inWindow = timestamps.filter((ts) => now - ts < windowMs).sort((a, b) => a - b);

  if (inWindow.length >= maxCalls) {
    const oldest = inWindow[0];
    return { allowed: false, retryAfterMs: windowMs - (now - oldest), nextTimestamps: inWindow };
  }
  return { allowed: true, retryAfterMs: 0, nextTimestamps: [...inWindow, now] };
}
