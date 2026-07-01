import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  breakoutLogSchema,
  skincareLogSchema,
  skincareProductSchema,
  BREAKOUT_LOGS_TABLE,
  SKINCARE_LOGS_TABLE,
  SKINCARE_PRODUCTS_TABLE,
  type BreakoutLog,
  type SkincareLog,
  type SkincareProduct,
} from '../schemas/slice4';

export interface EnqueueChange {
  enqueue(table: string, recordId: string, operation: SyncOperation, payload: string, createdAt: string): Promise<void>;
}

function base(now: Date) {
  const ts = now.toISOString();
  return { created_at: ts, updated_at: ts, deleted_at: null, sync_version: 1 };
}

export function createSkincareLog(
  input: {
    id: string;
    user_id: string;
    routine_type: SkincareLog['routine_type'];
    products_used?: string[];
    skin_hydration?: number;
    skin_oiliness?: number;
    skin_clarity?: number;
    notes?: string;
  },
  now = new Date(),
): SkincareLog {
  return skincareLogSchema.parse({
    ...input,
    logged_date: todayDateString(now),
    products_used: input.products_used ?? [],
    skin_oiliness: input.skin_oiliness ?? 3,
    skin_clarity: input.skin_clarity ?? 3,
    sensitivity: 3,
    notes: input.notes ?? null,
    ...base(now),
  });
}

export function createBreakoutLog(
  input: { id: string; user_id: string; location?: string; severity?: number; notes?: string },
  now = new Date(),
): BreakoutLog {
  return breakoutLogSchema.parse({
    ...input,
    logged_date: todayDateString(now),
    location: input.location ?? 'face',
    severity: input.severity ?? 3,
    suspected_cause: null,
    notes: input.notes ?? null,
    ...base(now),
  });
}

export function createSkincareProduct(
  input: { id: string; user_id: string; name: string; category?: string },
  now = new Date(),
): SkincareProduct {
  return skincareProductSchema.parse({
    ...input,
    brand: null,
    category: input.category ?? 'other',
    key_ingredients: null,
    routine_step: null,
    is_active: true,
    notes: null,
    ...base(now),
  });
}

async function enqueue(queue: EnqueueChange, table: string, row: { id: string }, op: SyncOperation, now: Date) {
  await queue.enqueue(table, row.id, op, JSON.stringify(row), now.toISOString());
}

export const enqueueSkincareLog = (q: EnqueueChange, op: SyncOperation, row: SkincareLog, now = new Date()) =>
  enqueue(q, SKINCARE_LOGS_TABLE, row, op, now);
export const enqueueBreakoutLog = (q: EnqueueChange, op: SyncOperation, row: BreakoutLog, now = new Date()) =>
  enqueue(q, BREAKOUT_LOGS_TABLE, row, op, now);
export const enqueueSkincareProduct = (q: EnqueueChange, op: SyncOperation, row: SkincareProduct, now = new Date()) =>
  enqueue(q, SKINCARE_PRODUCTS_TABLE, row, op, now);

export { SKINCARE_LOGS_TABLE, BREAKOUT_LOGS_TABLE, SKINCARE_PRODUCTS_TABLE };
