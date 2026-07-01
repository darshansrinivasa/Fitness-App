import type { SQLiteDatabase } from 'expo-sqlite';
import type { SyncOperation } from '@lifestyle-os/shared';

import { enqueueChange } from '../sync/sqliteStore';

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
  const keys = Object.keys(row);
  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')})
     VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => row[k]) as (string | number | null)[],
  );
}

export async function updateRow(
  db: SQLiteDatabase,
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  const keys = Object.keys(row).filter((k) => k !== 'id');
  await db.runAsync(
    `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`,
    [...keys.map((k) => row[k]), row.id] as (string | number | null)[],
  );
}
