import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createSleepLog,
  enqueueSleepLog,
  todayDateString,
  updateSleepLog,
  type SleepLog,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite, updateRow } from './helpers';

function combineDateAndTime(date: string, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toISOString();
}

export async function logSleep(
  db: SQLiteDatabase,
  userId: string,
  input: {
    bedtime: string;
    wakeTime: string;
    qualityRating: number;
    notes?: string;
  },
): Promise<SleepLog> {
  const sleepDate = todayDateString(new Date(input.wakeTime));
  const queue = makeSyncQueue(db);
  const existing = await db.getFirstAsync<SleepLog>(
    `SELECT * FROM sleep_logs WHERE user_id = ? AND sleep_date = ? AND deleted_at IS NULL`,
    [userId, sleepDate],
  );

  if (existing) {
    const parsed = parseFromSqlite(existing);
    const row = updateSleepLog(parsed, {
      bedtime: input.bedtime,
      wake_time: input.wakeTime,
      quality_rating: input.qualityRating,
      notes: input.notes ?? null,
    });
    await updateRow(db, 'sleep_logs', row);
    await enqueueSleepLog(queue, 'update', row);
    return row;
  }

  const row = createSleepLog({
    id: newId(),
    user_id: userId,
    bedtime: input.bedtime,
    wake_time: input.wakeTime,
    quality_rating: input.qualityRating,
    notes: input.notes,
    sleep_date: sleepDate,
  });
  await insertRow(db, 'sleep_logs', row);
  await enqueueSleepLog(queue, 'insert', row);
  return row;
}

/** Build ISO timestamps from HH:MM strings (handles overnight sleep). */
export function buildSleepTimes(
  bedtimeHHMM: string,
  wakeHHMM: string,
  wakeDate: string = todayDateString(),
): { bedtime: string; wake_time: string } {
  const wake = combineDateAndTime(wakeDate, wakeHHMM);
  let bedDate = wakeDate;
  const [bh, bm] = bedtimeHHMM.split(':').map(Number);
  const [wh, wm] = wakeHHMM.split(':').map(Number);
  if (bh * 60 + bm > wh * 60 + wm) {
    const d = new Date(`${wakeDate}T00:00:00`);
    d.setDate(d.getDate() - 1);
    bedDate = d.toISOString().slice(0, 10);
  }
  return {
    bedtime: combineDateAndTime(bedDate, bedtimeHHMM),
    wake_time: wake,
  };
}

export async function getLastSleepLog(
  db: SQLiteDatabase,
  userId: string,
): Promise<SleepLog | null> {
  const row = await db.getFirstAsync<SleepLog>(
    `SELECT * FROM sleep_logs WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY sleep_date DESC LIMIT 1`,
    [userId],
  );
  return row ? parseFromSqlite(row) : null;
}

export async function getSleepHistory(
  db: SQLiteDatabase,
  userId: string,
  limit = 14,
): Promise<SleepLog[]> {
  const rows = await db.getAllAsync<SleepLog>(
    `SELECT * FROM sleep_logs WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY sleep_date DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}

export async function getAvgSleepMinutes7d(
  db: SQLiteDatabase,
  userId: string,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ avg: number | null }>(
    `SELECT AVG(duration_minutes) as avg FROM sleep_logs
     WHERE user_id = ? AND deleted_at IS NULL
       AND sleep_date >= date('now', '-7 days')`,
    [userId],
  );
  return row?.avg != null ? Math.round(row.avg) : null;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}
