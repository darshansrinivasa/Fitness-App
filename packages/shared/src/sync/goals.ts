import { nextLocalVersion } from './conflict';
import type { SyncOperation } from '../types/sync';
import {
  goalCheckInSchema,
  goalSchema,
  GOALS_TABLE,
  GOAL_CHECK_INS_TABLE,
  type Goal,
  type GoalCheckIn,
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

export function createGoal(
  input: {
    id: string;
    user_id: string;
    title: string;
    category: string;
    start_value?: number;
    target_value?: number;
    current_value?: number;
    unit?: string;
    deadline?: string;
  },
  now: Date = new Date(),
): Goal {
  return goalSchema.parse({
    ...input,
    description: null,
    metric: null,
    start_value: input.start_value ?? 0,
    target_value: input.target_value ?? 100,
    current_value: input.current_value ?? input.start_value ?? 0,
    unit: input.unit ?? '',
    deadline: input.deadline ?? null,
    status: 'active',
    completed_at: null,
    ...baseFields(now),
  });
}

export function createGoalCheckIn(
  input: {
    id: string;
    goal_id: string;
    user_id: string;
    value: number;
    notes?: string | null;
  },
  now: Date = new Date(),
): GoalCheckIn {
  return goalCheckInSchema.parse({
    ...input,
    checked_in_at: now.toISOString(),
    notes: input.notes ?? null,
    ...baseFields(now),
  });
}

export function updateGoal(
  existing: Goal,
  patch: Partial<Pick<Goal, 'current_value' | 'status' | 'completed_at'>>,
  now: Date = new Date(),
): Goal {
  return goalSchema.parse({
    ...existing,
    ...patch,
    ...nextLocalVersion(existing, now),
  });
}

export function goalProgressPct(goal: Goal): number {
  const start = goal.start_value ?? 0;
  const target = goal.target_value ?? start;
  const current = goal.current_value ?? start;
  if (target === start) return current >= target ? 100 : 0;
  const pct = ((current - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export async function enqueueGoal(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: Goal,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(GOALS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export async function enqueueGoalCheckIn(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: GoalCheckIn,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    GOAL_CHECK_INS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export { GOALS_TABLE, GOAL_CHECK_INS_TABLE };
