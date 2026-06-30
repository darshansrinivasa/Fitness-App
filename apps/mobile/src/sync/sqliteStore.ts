import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import type {
  LocalSyncStore,
  SyncMetadata,
  SyncQueueItem,
  SyncableRecord,
} from '@lifestyle-os/shared';

import { newId } from '../lib/id';

const LOCAL_SCHEMA = `
create table if not exists sync_metadata (
  table_name text primary key,
  last_synced_at text
);
create table if not exists sync_queue (
  id text primary key,
  table_name text not null,
  record_id text not null,
  operation text not null,
  payload text not null,
  created_at text not null,
  attempts integer not null default 0
);
`;

export async function initLocalDb(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(LOCAL_SCHEMA);
  const version = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  if ((version?.user_version ?? 0) < 1) {
    // Module tables (e.g. water_logs) are created by migrations/local SQL assets.
    await db.execAsync('PRAGMA user_version = 1');
  }
}

export function createSqliteSyncStore(db: SQLiteDatabase): LocalSyncStore {
  return {
    async getSyncMetadata(table: string): Promise<SyncMetadata | null> {
      const row = await db.getFirstAsync<{ last_synced_at: string | null }>(
        'SELECT last_synced_at FROM sync_metadata WHERE table_name = ?',
        [table],
      );
      if (!row) return null;
      return { table_name: table, last_synced_at: row.last_synced_at };
    },

    async setSyncMetadata(table: string, lastSyncedAt: string): Promise<void> {
      await db.runAsync(
        `INSERT INTO sync_metadata (table_name, last_synced_at)
         VALUES (?, ?)
         ON CONFLICT(table_name) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
        [table, lastSyncedAt],
      );
    },

    async dequeueBatch(limit: number): Promise<SyncQueueItem[]> {
      return db.getAllAsync<SyncQueueItem>(
        `SELECT id, table_name, record_id, operation, payload, created_at, attempts
         FROM sync_queue
         ORDER BY created_at ASC
         LIMIT ?`,
        [limit],
      );
    },

    async markQueueItemDone(id: string): Promise<void> {
      await db.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
    },

    async markQueueItemFailed(id: string): Promise<void> {
      await db.runAsync(
        'UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?',
        [id],
      );
    },

    async getLocalRecord<T extends SyncableRecord>(
      table: string,
      id: string,
    ): Promise<T | null> {
      return db.getFirstAsync<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    },

    async upsertLocal<T extends SyncableRecord>(
      table: string,
      row: T,
    ): Promise<void> {
      const keys = Object.keys(row);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map((k) => `${k} = excluded.${k}`).join(', ');
      await db.runAsync(
        `INSERT INTO ${table} (${keys.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updates}`,
        keys.map((k) => (row as Record<string, unknown>)[k]) as SQLiteBindValue[],
      );
    },
  };
}

export async function enqueueChange(
  db: SQLiteDatabase,
  table: string,
  recordId: string,
  operation: SyncQueueItem['operation'],
  payload: string,
  createdAt: string,
): Promise<void> {
  const id = newId();
  await db.runAsync(
    `INSERT INTO sync_queue (id, table_name, record_id, operation, payload, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, table, recordId, operation, payload, createdAt],
  );
}
