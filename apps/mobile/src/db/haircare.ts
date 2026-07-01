import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createHaircareLog,
  createHaircareProduct,
  enqueueHaircareLog,
  enqueueHaircareProduct,
  type HaircareLog,
  type HaircareProduct,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite } from './helpers';

export async function addHaircareProduct(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  type = 'other',
): Promise<HaircareProduct> {
  const queue = makeSyncQueue(db);
  const row = createHaircareProduct({ id: newId(), user_id: userId, name, type });
  await insertRow(db, 'haircare_products', row);
  await enqueueHaircareProduct(queue, 'insert', row);
  return row;
}

export async function logHaircare(
  db: SQLiteDatabase,
  userId: string,
  input: {
    log_type: HaircareLog['log_type'];
    products_used?: string[];
    scalp_condition?: number;
    hair_condition?: number;
    notes?: string;
  },
): Promise<HaircareLog> {
  const queue = makeSyncQueue(db);
  const row = createHaircareLog({ id: newId(), user_id: userId, ...input });
  await insertRow(db, 'haircare_logs', row);
  await enqueueHaircareLog(queue, 'insert', row);
  return row;
}

export async function getHaircareProducts(db: SQLiteDatabase, userId: string): Promise<HaircareProduct[]> {
  const rows = await db.getAllAsync<HaircareProduct>(
    `SELECT * FROM haircare_products WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name`,
    [userId],
  );
  return rows.map(parseFromSqlite);
}

export async function getHaircareLogs(db: SQLiteDatabase, userId: string, limit = 15): Promise<HaircareLog[]> {
  const rows = await db.getAllAsync<HaircareLog>(
    `SELECT * FROM haircare_logs WHERE user_id = ? AND deleted_at IS NULL ORDER BY logged_date DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}
