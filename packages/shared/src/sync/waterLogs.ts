import { nextLocalVersion } from './conflict';
import {
  WATER_LOGS_TABLE,
  waterLogSchema,
  type WaterLog,
} from '../schemas/waterLog';
import type { SyncOperation } from '../types/sync';

export { WATER_LOGS_TABLE };

export interface WaterLogWriteInput {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at?: string;
  notes?: string | null;
}

export interface EnqueueWaterLogChange {
  enqueue(
    table: string,
    recordId: string,
    operation: SyncOperation,
    payload: string,
    createdAt: string,
  ): Promise<void>;
}

/** Create a new water log row ready for local SQLite + sync queue. */
export function createWaterLog(
  input: WaterLogWriteInput,
  now: Date = new Date(),
): WaterLog {
  const loggedAt = input.logged_at ?? now.toISOString();
  return waterLogSchema.parse({
    id: input.id,
    user_id: input.user_id,
    logged_at: loggedAt,
    amount_ml: input.amount_ml,
    notes: input.notes ?? null,
    created_at: loggedAt,
    updated_at: loggedAt,
    deleted_at: null,
    sync_version: 1,
  });
}

/** Apply a local update and return the row + queue payload. */
export function updateWaterLog(
  existing: WaterLog,
  patch: Partial<Pick<WaterLog, 'amount_ml' | 'notes' | 'logged_at'>>,
  now: Date = new Date(),
): WaterLog {
  const versioned = nextLocalVersion(existing, now);
  return waterLogSchema.parse({
    ...existing,
    ...patch,
    ...versioned,
  });
}

/** Soft-delete a water log for sync-friendly removal. */
export function deleteWaterLog(
  existing: WaterLog,
  now: Date = new Date(),
): WaterLog {
  const versioned = nextLocalVersion(existing, now);
  return waterLogSchema.parse({
    ...existing,
    ...versioned,
    deleted_at: versioned.updated_at,
  });
}

export async function enqueueWaterLog(
  queue: EnqueueWaterLogChange,
  operation: SyncOperation,
  row: WaterLog,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WATER_LOGS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

/** Tables registered for sync in Slice 0 pilot. */
export const PILOT_SYNC_TABLES = [WATER_LOGS_TABLE] as const;
