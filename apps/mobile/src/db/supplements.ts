import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createSupplement,
  createSupplementLog,
  enqueueSupplement,
  enqueueSupplementLog,
  todayDateString,
  type Supplement,
  type SupplementLog,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite } from './helpers';

export interface SupplementWithStatus extends Supplement {
  taken_today: boolean;
}

export async function getActiveSupplements(
  db: SQLiteDatabase,
  userId: string,
): Promise<Supplement[]> {
  const rows = await db.getAllAsync<Supplement>(
    `SELECT * FROM supplements WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1
     ORDER BY name ASC`,
    [userId],
  );
  return rows.map(parseFromSqlite);
}

export async function addSupplement(
  db: SQLiteDatabase,
  userId: string,
  input: { name: string; dose_amount: number; dose_unit: string },
): Promise<Supplement> {
  const queue = makeSyncQueue(db);
  const row = createSupplement({ id: newId(), user_id: userId, ...input });
  await insertRow(db, 'supplements', row);
  await enqueueSupplement(queue, 'insert', row);
  return row;
}

export async function logSupplementTaken(
  db: SQLiteDatabase,
  userId: string,
  supplement: Supplement,
): Promise<SupplementLog> {
  const queue = makeSyncQueue(db);
  const row = createSupplementLog({
    id: newId(),
    supplement_id: supplement.id,
    user_id: userId,
    dose_amount: supplement.dose_amount,
  });
  await insertRow(db, 'supplement_logs', row);
  await enqueueSupplementLog(queue, 'insert', row);
  return row;
}

export async function getSupplementsWithStatus(
  db: SQLiteDatabase,
  userId: string,
): Promise<SupplementWithStatus[]> {
  const supplements = await getActiveSupplements(db, userId);
  const today = todayDateString();
  const takenIds = new Set(
    (
      await db.getAllAsync<{ supplement_id: string }>(
        `SELECT supplement_id FROM supplement_logs
         WHERE user_id = ? AND deleted_at IS NULL AND date(taken_at) = ?`,
        [userId, today],
      )
    ).map((r) => r.supplement_id),
  );
  return supplements.map((s) => ({
    ...s,
    taken_today: takenIds.has(s.id),
  }));
}

export async function getTodaySupplementsTakenCount(
  db: SQLiteDatabase,
  userId: string,
): Promise<{ done: number; total: number }> {
  const supplements = await getActiveSupplements(db, userId);
  const today = todayDateString();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT supplement_id) as count FROM supplement_logs
     WHERE user_id = ? AND deleted_at IS NULL AND date(taken_at) = ?`,
    [userId, today],
  );
  return { done: row?.count ?? 0, total: supplements.length };
}
