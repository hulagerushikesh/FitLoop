import { checkRateLimit } from '../rateLimit';

const WINDOW = 10 * 60 * 1000; // 10 min
const MAX = 3;

describe('checkRateLimit', () => {
  it('allows and records a call when under the limit', () => {
    const r = checkRateLimit([1000, 2000], 3000, WINDOW, MAX);
    expect(r.allowed).toBe(true);
    expect(r.nextTimestamps).toEqual([1000, 2000, 3000]);
  });

  it('blocks when the window is full and reports retryAfter', () => {
    const now = 100_000;
    const r = checkRateLimit([now - 1000, now - 2000, now - 3000], now, WINDOW, MAX);
    expect(r.allowed).toBe(false);
    // oldest in-window is now-3000, ages out after WINDOW - 3000
    expect(r.retryAfterMs).toBe(WINDOW - 3000);
  });

  it('drops timestamps older than the window, freeing capacity', () => {
    const now = 1_000_000;
    const stale = now - WINDOW - 1; // outside window
    const r = checkRateLimit([stale, now - 1000, now - 2000], now, WINDOW, MAX);
    expect(r.allowed).toBe(true);
    expect(r.nextTimestamps).not.toContain(stale);
    expect(r.nextTimestamps).toContain(now);
  });
});
