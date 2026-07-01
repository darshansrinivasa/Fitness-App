import { nextLocalVersion } from './conflict';
import {
  DEFAULT_DAILY_WATER_GOAL_ML,
  WATER_GOALS_TABLE,
  waterGoalSchema,
  type WaterGoal,
} from '../schemas/waterGoal';
import type { SyncOperation } from '../types/sync';

export { WATER_GOALS_TABLE, DEFAULT_DAILY_WATER_GOAL_ML };

export interface WaterGoalWriteInput {
  id: string;
  user_id: string;
  daily_target_ml?: number;
  effective_from?: string;
}

export interface EnqueueWaterGoalChange {
  enqueue(
    table: string,
    recordId: string,
    operation: SyncOperation,
    payload: string,
    createdAt: string,
  ): Promise<void>;
}

export function todayDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function createWaterGoal(
  input: WaterGoalWriteInput,
  now: Date = new Date(),
): WaterGoal {
  const effectiveFrom = input.effective_from ?? todayDateString(now);
  const timestamp = now.toISOString();
  return waterGoalSchema.parse({
    id: input.id,
    user_id: input.user_id,
    daily_target_ml: input.daily_target_ml ?? DEFAULT_DAILY_WATER_GOAL_ML,
    effective_from: effectiveFrom,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    sync_version: 1,
  });
}

export function updateWaterGoal(
  existing: WaterGoal,
  patch: Partial<Pick<WaterGoal, 'daily_target_ml' | 'effective_from'>>,
  now: Date = new Date(),
): WaterGoal {
  const versioned = nextLocalVersion(existing, now);
  return waterGoalSchema.parse({
    ...existing,
    ...patch,
    ...versioned,
  });
}

export async function enqueueWaterGoal(
  queue: EnqueueWaterGoalChange,
  operation: SyncOperation,
  row: WaterGoal,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WATER_GOALS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}
