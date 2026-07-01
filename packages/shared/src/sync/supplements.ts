import { nextLocalVersion } from './conflict';
import type { SyncOperation } from '../types/sync';
import {
  supplementLogSchema,
  supplementSchema,
  SUPPLEMENTS_TABLE,
  SUPPLEMENT_LOGS_TABLE,
  type Supplement,
  type SupplementLog,
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

export function createSupplement(
  input: {
    id: string;
    user_id: string;
    name: string;
    dose_amount: number;
    dose_unit: string;
    brand?: string;
    times_of_day?: string[];
  },
  now: Date = new Date(),
): Supplement {
  return supplementSchema.parse({
    ...input,
    brand: input.brand ?? null,
    frequency: 'daily',
    times_of_day: input.times_of_day ?? ['morning'],
    notes: null,
    is_active: true,
    stock_quantity: null,
    low_stock_threshold: 7,
    ...baseFields(now),
  });
}

export function createSupplementLog(
  input: {
    id: string;
    supplement_id: string;
    user_id: string;
    dose_amount?: number;
  },
  now: Date = new Date(),
): SupplementLog {
  return supplementLogSchema.parse({
    ...input,
    taken_at: now.toISOString(),
    notes: null,
    ...baseFields(now),
  });
}

export function updateSupplement(
  existing: Supplement,
  patch: Partial<Pick<Supplement, 'is_active' | 'stock_quantity'>>,
  now: Date = new Date(),
): Supplement {
  return supplementSchema.parse({
    ...existing,
    ...patch,
    ...nextLocalVersion(existing, now),
  });
}

export async function enqueueSupplement(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: Supplement,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(SUPPLEMENTS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export async function enqueueSupplementLog(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: SupplementLog,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    SUPPLEMENT_LOGS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export { SUPPLEMENTS_TABLE, SUPPLEMENT_LOGS_TABLE };
