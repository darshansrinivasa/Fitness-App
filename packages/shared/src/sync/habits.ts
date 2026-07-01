import { nextLocalVersion } from './conflict';
import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  habitLogSchema,
  habitSchema,
  HABITS_TABLE,
  HABIT_LOGS_TABLE,
  type Habit,
  type HabitLog,
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

export function createHabit(
  input: {
    id: string;
    user_id: string;
    name: string;
    category?: string;
    color?: string;
  },
  now: Date = new Date(),
): Habit {
  return habitSchema.parse({
    ...input,
    description: null,
    icon: null,
    color: input.color ?? '#38bdf8',
    frequency: 'daily',
    frequency_days: null,
    target_count: 1,
    category: input.category ?? 'wellness',
    is_active: true,
    sort_order: 0,
    ...baseFields(now),
  });
}

export function createHabitLog(
  input: {
    id: string;
    habit_id: string;
    user_id: string;
    logged_date?: string;
  },
  now: Date = new Date(),
): HabitLog {
  return habitLogSchema.parse({
    ...input,
    logged_date: input.logged_date ?? todayDateString(now),
    count: 1,
    notes: null,
    ...baseFields(now),
  });
}

export function updateHabitLog(
  existing: HabitLog,
  now: Date = new Date(),
): HabitLog {
  return habitLogSchema.parse({
    ...existing,
    ...nextLocalVersion(existing, now),
    deleted_at: nextLocalVersion(existing, now).updated_at,
  });
}

export async function enqueueHabit(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: Habit,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(HABITS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export async function enqueueHabitLog(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: HabitLog,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(HABIT_LOGS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export { HABITS_TABLE, HABIT_LOGS_TABLE };
