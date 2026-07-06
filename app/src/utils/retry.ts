// Generic retry-with-exponential-backoff. Used to make transient network
// failures (e.g. a dropped request to the analyze-meal edge function) recover
// automatically instead of surfacing as an error the user has to act on.

export interface RetryOptions {
  /** number of RETRIES after the first attempt (so 1 = up to 2 attempts) */
  retries?: number;
  baseDelayMs?: number;
  /** decide whether a given error is worth retrying (default: always) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** injectable sleep so tests don't wait on real timers */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 1, baseDelayMs = 500, shouldRetry = () => true, sleep = defaultSleep } = options;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      await sleep(baseDelayMs * 2 ** attempt);
      attempt += 1;
    }
  }
}
