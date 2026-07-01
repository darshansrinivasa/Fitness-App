import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createBreakoutLog,
  createSkincareLog,
  createSkincareProduct,
  enqueueBreakoutLog,
  enqueueSkincareLog,
  enqueueSkincareProduct,
  type BreakoutLog,
  type SkincareLog,
  type SkincareProduct,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite } from './helpers';

export async function addSkincareProduct(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  category = 'other',
): Promise<SkincareProduct> {
  const queue = makeSyncQueue(db);
  const row = createSkincareProduct({ id: newId(), user_id: userId, name, category });
  await insertRow(db, 'skincare_products', row);
  await enqueueSkincareProduct(queue, 'insert', row);
  return row;
}

export async function logSkincareRoutine(
  db: SQLiteDatabase,
  userId: string,
  input: {
    routine_type: SkincareLog['routine_type'];
    products_used?: string[];
    skin_hydration?: number;
    skin_clarity?: number;
    notes?: string;
  },
): Promise<SkincareLog> {
  const queue = makeSyncQueue(db);
  const row = createSkincareLog({ id: newId(), user_id: userId, ...input });
  await insertRow(db, 'skincare_logs', row);
  await enqueueSkincareLog(queue, 'insert', row);
  return row;
}

export async function logBreakout(
  db: SQLiteDatabase,
  userId: string,
  location: string,
  severity = 3,
  notes?: string,
): Promise<BreakoutLog> {
  const queue = makeSyncQueue(db);
  const row = createBreakoutLog({ id: newId(), user_id: userId, location, severity, notes });
  await insertRow(db, 'breakout_logs', row);
  await enqueueBreakoutLog(queue, 'insert', row);
  return row;
}

export async function getSkincareProducts(db: SQLiteDatabase, userId: string): Promise<SkincareProduct[]> {
  const rows = await db.getAllAsync<SkincareProduct>(
    `SELECT * FROM skincare_products WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name`,
    [userId],
  );
  return rows.map(parseFromSqlite);
}

export async function getSkincareLogs(db: SQLiteDatabase, userId: string, limit = 10): Promise<SkincareLog[]> {
  const rows = await db.getAllAsync<SkincareLog>(
    `SELECT * FROM skincare_logs WHERE user_id = ? AND deleted_at IS NULL ORDER BY logged_date DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}

export async function getBreakoutLogs(db: SQLiteDatabase, userId: string, limit = 10): Promise<BreakoutLog[]> {
  const rows = await db.getAllAsync<BreakoutLog>(
    `SELECT * FROM breakout_logs WHERE user_id = ? AND deleted_at IS NULL ORDER BY logged_date DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}
