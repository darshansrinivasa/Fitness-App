import {
  PILOT_SYNC_TABLES,
  SyncOrchestrator,
  type RemoteSyncClient,
  type SyncableRecord,
} from '@lifestyle-os/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { SQLiteDatabase } from 'expo-sqlite';

import { createSqliteSyncStore, initLocalDb } from './sqliteStore';
import { createSupabaseClient } from './supabaseClient';

export function createRemoteSyncClient(supabase: SupabaseClient): RemoteSyncClient {
  return {
    async upsert(table: string, rows: Record<string, unknown>[]): Promise<void> {
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
      if (error) throw error;
    },

    async fetchDelta<T extends SyncableRecord>(
      table: string,
      since: string | null,
    ): Promise<T[]> {
      let query = supabase.from(table).select('*').order('updated_at', { ascending: true });
      if (since) {
        query = query.gt('updated_at', since);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  };
}

export async function createSyncService(db: SQLiteDatabase) {
  await initLocalDb(db);
  const local = createSqliteSyncStore(db);
  const supabase = createSupabaseClient();
  const remote = createRemoteSyncClient(supabase);
  const orchestrator = new SyncOrchestrator(local, remote, [...PILOT_SYNC_TABLES]);

  return {
    orchestrator,
    async sync() {
      return orchestrator.runFullSync();
    },
    /** Call from Supabase Realtime handler — pull only, never push. */
    async onRealtimeHint() {
      return orchestrator.runPull();
    },
  };
}

export { enqueueChange, initLocalDb, createSqliteSyncStore } from './sqliteStore';
