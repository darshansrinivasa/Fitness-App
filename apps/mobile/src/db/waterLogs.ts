import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createWaterLog,
  enqueueWaterLog,
  WATER_LOGS_TABLE,
  type WaterLog,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue } from './helpers';

export { migrateLocalSchema } from './migrate';

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function insertWaterLogLocal(
  db: SQLiteDatabase,
  userId: string,
  amountMl: number,
): Promise<WaterLog> {
  const row = createWaterLog({
    id: newId(),
    user_id: userId,
    amount_ml: amountMl,
  });

  const queue = makeSyncQueue(db);
  await insertRow(db, 'water_logs', row);
  await enqueueWaterLog(queue, 'insert', row);

  return row;
}

export async function getTodayWaterLogs(
  db: SQLiteDatabase,
  userId: string,
): Promise<WaterLog[]> {
  return db.getAllAsync<WaterLog>(
    `SELECT * FROM water_logs
     WHERE user_id = ? AND deleted_at IS NULL AND logged_at >= ?
     ORDER BY logged_at DESC`,
    [userId, startOfTodayIso()],
  );
}

export async function getTodayWaterTotalMl(
  db: SQLiteDatabase,
  userId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount_ml), 0) as total FROM water_logs
     WHERE user_id = ? AND deleted_at IS NULL AND logged_at >= ?`,
    [userId, startOfTodayIso()],
  );
  return row?.total ?? 0;
}

export async function getPendingSyncCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sync_queue',
  );
  return row?.count ?? 0;
}

export async function getLastSyncedAt(
  db: SQLiteDatabase,
  table = WATER_LOGS_TABLE,
): Promise<string | null> {
  const row = await db.getFirstAsync<{ last_synced_at: string | null }>(
    'SELECT last_synced_at FROM sync_metadata WHERE table_name = ?',
    [table],
  );
  return row?.last_synced_at ?? null;
}

export interface DailyWaterTotal {
  day: string;
  total_ml: number;
}

function startOfDaysAgoIso(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export async function getDailyWaterTotals(
  db: SQLiteDatabase,
  userId: string,
  days = 30,
): Promise<DailyWaterTotal[]> {
  const since = startOfDaysAgoIso(days - 1);
  const rows = await db.getAllAsync<{ day: string; total_ml: number }>(
    `SELECT date(logged_at) as day, COALESCE(SUM(amount_ml), 0) as total_ml
     FROM water_logs
     WHERE user_id = ? AND deleted_at IS NULL AND logged_at >= ?
     GROUP BY date(logged_at)
     ORDER BY day ASC`,
    [userId, since],
  );

  const totalsByDay = new Map(rows.map((row) => [row.day, row.total_ml]));
  const result: DailyWaterTotal[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const day = d.toISOString().slice(0, 10);
    result.push({
      day,
      total_ml: totalsByDay.get(day) ?? 0,
    });
  }

  return result;
}
