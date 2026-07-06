// Pure queue-replay logic for offline write resilience. The persistence layer
// (AsyncStorage) and connectivity detection (NetInfo) live in
// services/offlineQueue.ts; this stays side-effect-free so ordering/retry
// behaviour is unit-testable.

export interface QueuedWrite<T = unknown> {
  id: string;
  type: string;
  payload: T;
  createdAt: number;
}

/**
 * Replays queued writes in order through `handler`, stopping at the FIRST
 * failure so writes are never applied out of order (a later set must not land
 * before an earlier one). Returns the writes still awaiting retry.
 */
export async function replayQueue<T>(
  items: QueuedWrite<T>[],
  handler: (item: QueuedWrite<T>) => Promise<void>
): Promise<QueuedWrite<T>[]> {
  const remaining = [...items];
  while (remaining.length > 0) {
    try {
      await handler(remaining[0]);
      remaining.shift();
    } catch {
      break; // keep this write and everything after it for the next flush
    }
  }
  return remaining;
}
