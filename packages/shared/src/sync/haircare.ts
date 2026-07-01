import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  haircareLogSchema,
  haircareProductSchema,
  HAIRCARE_LOGS_TABLE,
  HAIRCARE_PRODUCTS_TABLE,
  type HaircareLog,
  type HaircareProduct,
} from '../schemas/slice4';

export interface EnqueueChange {
  enqueue(table: string, recordId: string, operation: SyncOperation, payload: string, createdAt: string): Promise<void>;
}

function base(now: Date) {
  const ts = now.toISOString();
  return { created_at: ts, updated_at: ts, deleted_at: null, sync_version: 1 };
}

export function createHaircareLog(
  input: {
    id: string;
    user_id: string;
    log_type: HaircareLog['log_type'];
    products_used?: string[];
    scalp_condition?: number;
    hair_condition?: number;
    notes?: string;
  },
  now = new Date(),
): HaircareLog {
  return haircareLogSchema.parse({
    ...input,
    logged_date: todayDateString(now),
    products_used: input.products_used ?? [],
    duration_minutes: null,
    shedding_level: null,
    notes: input.notes ?? null,
    ...base(now),
  });
}

export function createHaircareProduct(
  input: { id: string; user_id: string; name: string; type?: string },
  now = new Date(),
): HaircareProduct {
  return haircareProductSchema.parse({
    ...input,
    type: input.type ?? 'other',
    brand: null,
    notes: null,
    is_active: true,
    ...base(now),
  });
}

async function enqueue(queue: EnqueueChange, table: string, row: { id: string }, op: SyncOperation, now: Date) {
  await queue.enqueue(table, row.id, op, JSON.stringify(row), now.toISOString());
}

export const enqueueHaircareLog = (q: EnqueueChange, op: SyncOperation, row: HaircareLog, now = new Date()) =>
  enqueue(q, HAIRCARE_LOGS_TABLE, row, op, now);
export const enqueueHaircareProduct = (q: EnqueueChange, op: SyncOperation, row: HaircareProduct, now = new Date()) =>
  enqueue(q, HAIRCARE_PRODUCTS_TABLE, row, op, now);

export { HAIRCARE_LOGS_TABLE, HAIRCARE_PRODUCTS_TABLE };
