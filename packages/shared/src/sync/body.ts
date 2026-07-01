import { nextLocalVersion } from './conflict';
import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  bodyMeasurementSchema,
  weightLogSchema,
  BODY_MEASUREMENTS_TABLE,
  WEIGHT_LOGS_TABLE,
  type BodyMeasurement,
  type WeightLog,
} from '../schemas/slice2';

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
  return {
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
    sync_version: 1,
  };
}

export function createWeightLog(
  input: {
    id: string;
    user_id: string;
    weight_kg: number;
    logged_date?: string;
    notes?: string | null;
  },
  now: Date = new Date(),
): WeightLog {
  return weightLogSchema.parse({
    ...input,
    logged_date: input.logged_date ?? todayDateString(now),
    notes: input.notes ?? null,
    ...baseFields(now),
  });
}

export function createBodyMeasurement(
  input: {
    id: string;
    user_id: string;
    logged_date?: string;
    waist_cm?: number | null;
    chest_cm?: number | null;
    hips_cm?: number | null;
    notes?: string | null;
  },
  now: Date = new Date(),
): BodyMeasurement {
  return bodyMeasurementSchema.parse({
    ...input,
    logged_date: input.logged_date ?? todayDateString(now),
    left_arm_cm: null,
    right_arm_cm: null,
    left_thigh_cm: null,
    right_thigh_cm: null,
    left_calf_cm: null,
    right_calf_cm: null,
    neck_cm: null,
    shoulders_cm: null,
    notes: input.notes ?? null,
    ...baseFields(now),
  });
}

export function updateBodyMeasurement(
  existing: BodyMeasurement,
  patch: Partial<BodyMeasurement>,
  now: Date = new Date(),
): BodyMeasurement {
  return bodyMeasurementSchema.parse({
    ...existing,
    ...patch,
    ...nextLocalVersion(existing, now),
  });
}

export async function enqueueWeightLog(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: WeightLog,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WEIGHT_LOGS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export async function enqueueBodyMeasurement(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: BodyMeasurement,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    BODY_MEASUREMENTS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export { WEIGHT_LOGS_TABLE, BODY_MEASUREMENTS_TABLE };
