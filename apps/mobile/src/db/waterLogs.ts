import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createWaterLog,
  enqueueWaterLog,
  WATER_LOGS_TABLE,
  type WaterLog,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { enqueueChange } from '../sync/sqliteStore';

async function getUserVersion(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  return row?.user_version ?? 0;
}

async function runSql(db: SQLiteDatabase, sql: string): Promise<void> {
  const statements = sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.execAsync(statement);
  }
}

export async function migrateLocalSchema(db: SQLiteDatabase): Promise<void> {
  let version = await getUserVersion(db);

  if (version < 1) {
    await runSql(
      db,
      `
      CREATE TABLE IF NOT EXISTS sync_metadata (
        table_name TEXT PRIMARY KEY,
        last_synced_at TEXT
      );
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS sync_queue_created_at_idx
        ON sync_queue (created_at);
    `,
    );
    await db.execAsync('PRAGMA user_version = 1');
    version = 1;
  }

  if (version < 2) {
    await runSql(
      db,
      `
      CREATE TABLE IF NOT EXISTS water_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        logged_at TEXT NOT NULL,
        amount_ml INTEGER NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1,
        synced_at TEXT
      );
      CREATE INDEX IF NOT EXISTS water_logs_user_logged_at_idx
        ON water_logs (user_id, logged_at);
    `,
    );
    await db.execAsync('PRAGMA user_version = 2');
    version = 2;
  }

  if (version < 3) {
    await runSql(
      db,
      `
      CREATE TABLE IF NOT EXISTS water_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        daily_target_ml INTEGER NOT NULL,
        effective_from TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS water_goals_user_effective_idx
        ON water_goals (user_id, effective_from);
    `,
    );
    await db.execAsync('PRAGMA user_version = 3');
  }
}

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

  const keys = Object.keys(row);
  await db.runAsync(
    `INSERT INTO water_logs (${keys.join(', ')})
     VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => (row as Record<string, unknown>)[k]) as (
      | string
      | number
      | null
    )[],
  );

  await enqueueWaterLog(
    {
      enqueue: (table, recordId, operation, payload, createdAt) =>
        enqueueChange(db, table, recordId, operation, payload, createdAt),
    },
    'insert',
    row,
  );

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
