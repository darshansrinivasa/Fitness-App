import {
  PILOT_SYNC_TABLES,
  SyncOrchestrator,
  WATER_LOGS_TABLE,
  type RemoteSyncClient,
  type SyncableRecord,
} from '@lifestyle-os/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SQLiteDatabase } from 'expo-sqlite';

import { createSqliteSyncStore } from './sqliteStore';

const WATER_LOG_REMOTE_COLUMNS = [
  'id',
  'user_id',
  'logged_at',
  'amount_ml',
  'notes',
  'created_at',
  'updated_at',
  'deleted_at',
  'sync_version',
] as const;

function sanitizeRemoteRow(
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (table === WATER_LOGS_TABLE) {
    return Object.fromEntries(
      WATER_LOG_REMOTE_COLUMNS.filter((key) => key in row).map((key) => [
        key,
        row[key],
      ]),
    );
  }
  const { synced_at: _syncedAt, ...rest } = row;
  return rest;
}

export function createRemoteSyncClient(supabase: SupabaseClient): RemoteSyncClient {
  return {
    async upsert(table: string, rows: Record<string, unknown>[]): Promise<void> {
      const payload = rows.map((row) => sanitizeRemoteRow(table, row));
      const { error } = await supabase.from(table).upsert(payload, {
        onConflict: 'id',
      });
      if (error) throw error;
    },

    async fetchDelta<T extends SyncableRecord>(
      table: string,
      since: string | null,
    ): Promise<T[]> {
      let query = supabase
        .from(table)
        .select('*')
        .order('updated_at', { ascending: true });

      if (since) {
        query = query.gt('updated_at', since);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  };
}

export function createSyncService(db: SQLiteDatabase, supabase: SupabaseClient) {
  const local = createSqliteSyncStore(db);
  const remote = createRemoteSyncClient(supabase);
  const orchestrator = new SyncOrchestrator(local, remote, [...PILOT_SYNC_TABLES]);

  return {
    orchestrator,
    async sync() {
      const result = await orchestrator.runFullSync();
      if (result.failed > 0) {
        throw new Error(`${result.failed} item(s) failed to upload`);
      }
      return result;
    },
    async onRealtimeHint() {
      return orchestrator.runPull();
    },
  };
}

export { enqueueChange, createSqliteSyncStore } from './sqliteStore';
