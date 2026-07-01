import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  progressPhotoSchema,
  PROGRESS_PHOTOS_TABLE,
  type ProgressPhoto,
} from '../schemas/slice4';

export interface EnqueueChange {
  enqueue(table: string, recordId: string, operation: SyncOperation, payload: string, createdAt: string): Promise<void>;
}

function base(now: Date) {
  const ts = now.toISOString();
  return { created_at: ts, updated_at: ts, deleted_at: null, sync_version: 1 };
}

export function createProgressPhoto(
  input: {
    id: string;
    user_id: string;
    storage_path: string;
    angle: ProgressPhoto['angle'];
    weight_kg?: number;
    notes?: string;
  },
  now = new Date(),
): ProgressPhoto {
  return progressPhotoSchema.parse({
    ...input,
    taken_date: todayDateString(now),
    weight_kg: input.weight_kg ?? null,
    notes: input.notes ?? null,
    ...base(now),
  });
}

export async function enqueueProgressPhoto(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: ProgressPhoto,
  now = new Date(),
): Promise<void> {
  await queue.enqueue(PROGRESS_PHOTOS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export { PROGRESS_PHOTOS_TABLE, PROGRESS_PHOTOS_BUCKET } from '../schemas/slice4';
