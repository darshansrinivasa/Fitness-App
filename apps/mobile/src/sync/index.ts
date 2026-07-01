import {
  BODY_MEASUREMENTS_TABLE,
  FOODS_TABLE,
  MEAL_LOGS_TABLE,
  NUTRITION_GOALS_TABLE,
  SYNC_TABLES,
  SyncOrchestrator,
  WATER_GOALS_TABLE,
  WATER_LOGS_TABLE,
  WEIGHT_LOGS_TABLE,
  WORKOUT_EXERCISES_TABLE,
  WORKOUT_SETS_TABLE,
  WORKOUTS_TABLE,
  type RemoteSyncClient,
  type SyncableRecord,
} from '@lifestyle-os/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SQLiteDatabase } from 'expo-sqlite';

import { createSqliteSyncStore } from './sqliteStore';

const REMOTE_COLUMNS: Record<string, readonly string[]> = {
  [WATER_LOGS_TABLE]: [
    'id', 'user_id', 'logged_at', 'amount_ml', 'notes',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [WATER_GOALS_TABLE]: [
    'id', 'user_id', 'daily_target_ml', 'effective_from',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [WORKOUTS_TABLE]: [
    'id', 'user_id', 'name', 'template_id', 'started_at', 'ended_at', 'notes',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [WORKOUT_EXERCISES_TABLE]: [
    'id', 'workout_id', 'exercise_name', 'exercise_category', 'order_index',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [WORKOUT_SETS_TABLE]: [
    'id', 'workout_exercise_id', 'set_number', 'reps', 'weight_kg',
    'duration_seconds', 'distance_km', 'notes', 'is_pr',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [FOODS_TABLE]: [
    'id', 'user_id', 'name', 'brand', 'serving_size_g', 'calories_per_serving',
    'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg',
    'barcode', 'is_favourite', 'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [MEAL_LOGS_TABLE]: [
    'id', 'user_id', 'logged_date', 'meal_type', 'food_id', 'food_name',
    'quantity_g', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'notes',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [NUTRITION_GOALS_TABLE]: [
    'id', 'user_id', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'effective_from',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [WEIGHT_LOGS_TABLE]: [
    'id', 'user_id', 'logged_date', 'weight_kg', 'notes',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
  [BODY_MEASUREMENTS_TABLE]: [
    'id', 'user_id', 'logged_date', 'chest_cm', 'waist_cm', 'hips_cm',
    'left_arm_cm', 'right_arm_cm', 'left_thigh_cm', 'right_thigh_cm',
    'left_calf_cm', 'right_calf_cm', 'neck_cm', 'shoulders_cm', 'notes',
    'created_at', 'updated_at', 'deleted_at', 'sync_version',
  ],
};

function sanitizeRemoteRow(
  table: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const columns = REMOTE_COLUMNS[table];
  if (columns) {
    return Object.fromEntries(
      columns.filter((key) => key in row).map((key) => [key, row[key]]),
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
  const orchestrator = new SyncOrchestrator(local, remote, [...SYNC_TABLES]);

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
export { SYNC_TABLES } from '@lifestyle-os/shared';
