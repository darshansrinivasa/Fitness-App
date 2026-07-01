import { nextLocalVersion } from './conflict';
import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  sleepLogSchema,
  SLEEP_LOGS_TABLE,
  type SleepLog,
} from '../schemas/slice3';

export interface EnqueueChange {
  enqueue(
    table: string,
    recordId: string,
    operation: SyncOperation,
    payload: string,
    createdAt: string,
  ): Promise<void>;
}

function baseFields(now: Date) {
  const ts = now.toISOString();
  return { created_at: ts, updated_at: ts, deleted_at: null, sync_version: 1 };
}

export function calcSleepDurationMinutes(
  bedtime: string,
  wakeTime: string,
): number {
  const start = new Date(bedtime).getTime();
  const end = new Date(wakeTime).getTime();
  if (end <= start) return 0;
  return Math.round((end - start) / 60_000);
}

export function createSleepLog(
  input: {
    id: string;
    user_id: string;
    bedtime: string;
    wake_time: string;
    quality_rating?: number;
    notes?: string | null;
    sleep_date?: string;
  },
  now: Date = new Date(),
): SleepLog {
  const sleepDate = input.sleep_date ?? todayDateString(new Date(input.wake_time));
  return sleepLogSchema.parse({
    ...input,
    sleep_date: sleepDate,
    duration_minutes: calcSleepDurationMinutes(input.bedtime, input.wake_time),
    notes: input.notes ?? null,
    ...baseFields(now),
  });
}

export function updateSleepLog(
  existing: SleepLog,
  patch: Partial<Pick<SleepLog, 'bedtime' | 'wake_time' | 'quality_rating' | 'notes'>>,
  now: Date = new Date(),
): SleepLog {
  const merged = { ...existing, ...patch, ...nextLocalVersion(existing, now) };
  if (merged.bedtime && merged.wake_time) {
    merged.duration_minutes = calcSleepDurationMinutes(merged.bedtime, merged.wake_time);
  }
  return sleepLogSchema.parse(merged);
}

export async function enqueueSleepLog(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: SleepLog,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(SLEEP_LOGS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export { SLEEP_LOGS_TABLE };
