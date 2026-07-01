import type { SQLiteDatabase } from 'expo-sqlite';
import type { SyncOperation } from '@lifestyle-os/shared';

import { enqueueChange } from '../sync/sqliteStore';

const JSON_ARRAY_KEYS = ['frequency_days', 'times_of_day'] as const;
const BOOL_KEYS = ['is_active', 'is_favourite', 'is_pr'] as const;

export function coerceForSqlite(row: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...row };
  for (const key of JSON_ARRAY_KEYS) {
    if (Array.isArray(copy[key])) copy[key] = JSON.stringify(copy[key]);
  }
  for (const key of BOOL_KEYS) {
    if (typeof copy[key] === 'boolean') copy[key] = copy[key] ? 1 : 0;
  }
  return copy;
}

export function parseFromSqlite<T>(row: T): T {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row } as Record<string, unknown>;
  for (const key of JSON_ARRAY_KEYS) {
    if (typeof copy[key] === 'string' && copy[key]) {
      try {
        copy[key] = JSON.parse(copy[key] as string);
      } catch {
        copy[key] = null;
      }
    }
  }
  for (const key of BOOL_KEYS) {
    if (typeof copy[key] === 'number') copy[key] = copy[key] === 1;
  }
  return copy as T;
}

export function makeSyncQueue(db: SQLiteDatabase) {
  return {
    enqueue: (
      table: string,
      recordId: string,
      operation: SyncOperation,
      payload: string,
      createdAt: string,
    ) => enqueueChange(db, table, recordId, operation, payload, createdAt),
  };
}

export async function insertRow(
  db: SQLiteDatabase,
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const stored = coerceForSqlite(row);
  const keys = Object.keys(stored);
  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')})
     VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => stored[k]) as (string | number | null)[],
  );
}

export async function updateRow(
  db: SQLiteDatabase,
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const stored = coerceForSqlite(row);
  const keys = Object.keys(stored).filter((k) => k !== 'id');
  await db.runAsync(
    `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    [...keys.map((k) => stored[k]), stored.id] as (string | number | null)[],
  );
}
