import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logSet } from './workouts';
import { replayQueue, type QueuedWrite } from '../engine/offlineQueue';
import type { SetType } from '../types/database';

// Narrow "don't lose data mid-session" offline resilience: when a set-log write
// fails (e.g. wifi drops mid-workout), it's queued in AsyncStorage and replayed
// automatically when connectivity returns. This is NOT full offline-first sync.

const QUEUE_KEY = 'fitloop.offline.queue';

export interface LogSetPayload {
  userId: string;
  sessionId: string;
  workoutId: string | null;
  exerciseId: string;
  setNumber: number;
  input: { weight_kg: number | null; reps: number | null; rpe: number | null; set_type?: SetType };
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `${Date.now()}-${seq}`;
}

async function readQueue(): Promise<QueuedWrite<LogSetPayload>[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueuedWrite<LogSetPayload>[]) : [];
}

async function writeQueue(items: QueuedWrite<LogSetPayload>[]): Promise<void> {
  if (items.length === 0) await AsyncStorage.removeItem(QUEUE_KEY);
  else await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

/** Appends a failed set write to the queue for later replay. */
export async function enqueueSetLog(payload: LogSetPayload): Promise<void> {
  const queue = await readQueue();
  queue.push({ id: nextId(), type: 'logSet', payload, createdAt: Date.now() });
  await writeQueue(queue);
}

/** Number of writes currently waiting to sync. */
export async function pendingWriteCount(): Promise<number> {
  return (await readQueue()).length;
}

let flushing = false;

/**
 * Replays queued writes in order, stopping at the first failure (so sets never
 * land out of order). Returns how many were flushed. Guarded so overlapping
 * triggers (reconnect + manual) don't double-send.
 */
export async function flushOfflineQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  try {
    const queue = await readQueue();
    if (queue.length === 0) return 0;

    const remaining = await replayQueue(queue, async (item) => {
      const p = item.payload;
      await logSet(p.userId, p.sessionId, p.workoutId, p.exerciseId, p.setNumber, p.input);
    });
    await writeQueue(remaining);
    return queue.length - remaining.length;
  } finally {
    flushing = false;
  }
}

let unsubscribe: (() => void) | null = null;

/**
 * Starts listening for connectivity changes and flushes the queue when the
 * device comes back online. Also flushes once immediately. Idempotent.
 */
export function initOfflineSync(): void {
  if (unsubscribe) return;
  flushOfflineQueue().catch(() => {});
  unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) flushOfflineQueue().catch(() => {});
  });
}
