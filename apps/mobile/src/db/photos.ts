import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createProgressPhoto,
  enqueueProgressPhoto,
  type ProgressPhoto,
} from '@lifestyle-os/shared/sync';

import { uploadProgressPhoto } from '../lib/photoStorage';
import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite } from './helpers';

export async function addProgressPhoto(
  db: SQLiteDatabase,
  userId: string,
  localUri: string,
  angle: ProgressPhoto['angle'],
  weightKg?: number,
  notes?: string,
): Promise<ProgressPhoto> {
  const id = newId();
  const storagePath = await uploadProgressPhoto(userId, id, localUri);
  const queue = makeSyncQueue(db);
  const row = createProgressPhoto({
    id,
    user_id: userId,
    storage_path: storagePath,
    angle,
    weight_kg: weightKg,
    notes,
  });
  await insertRow(db, 'progress_photos', row);
  await enqueueProgressPhoto(queue, 'insert', row);
  return row;
}

export async function getProgressPhotos(
  db: SQLiteDatabase,
  userId: string,
  limit = 30,
): Promise<ProgressPhoto[]> {
  const rows = await db.getAllAsync<ProgressPhoto>(
    `SELECT * FROM progress_photos WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY taken_date DESC, created_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}

export async function getProgressPhotoCount(db: SQLiteDatabase, userId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM progress_photos WHERE user_id = ? AND deleted_at IS NULL`,
    [userId],
  );
  return row?.count ?? 0;
}
