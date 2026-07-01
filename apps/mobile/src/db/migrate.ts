import type { SQLiteDatabase } from 'expo-sqlite';

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
    version = 3;
  }

  if (version < 4) {
    await runSql(
      db,
      `
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        template_id TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS workout_exercises (
        id TEXT PRIMARY KEY,
        workout_id TEXT NOT NULL,
        exercise_name TEXT NOT NULL,
        exercise_category TEXT,
        order_index INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS workout_sets (
        id TEXT PRIMARY KEY,
        workout_exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        reps INTEGER,
        weight_kg REAL,
        duration_seconds INTEGER,
        distance_km REAL,
        notes TEXT,
        is_pr INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS workouts_user_started_idx
        ON workouts (user_id, started_at);
    `,
    );
    await db.execAsync('PRAGMA user_version = 4');
    version = 4;
  }

  if (version < 5) {
    await runSql(
      db,
      `
      CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        serving_size_g REAL NOT NULL DEFAULT 100,
        calories_per_serving REAL,
        protein_g REAL,
        carbs_g REAL,
        fat_g REAL,
        fiber_g REAL,
        sugar_g REAL,
        sodium_mg REAL,
        barcode TEXT,
        is_favourite INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS meal_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        logged_date TEXT NOT NULL,
        meal_type TEXT NOT NULL,
        food_id TEXT,
        food_name TEXT NOT NULL,
        quantity_g REAL NOT NULL,
        calories REAL,
        protein_g REAL,
        carbs_g REAL,
        fat_g REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS nutrition_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        calories INTEGER,
        protein_g INTEGER,
        carbs_g INTEGER,
        fat_g INTEGER,
        effective_from TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS meal_logs_user_date_idx
        ON meal_logs (user_id, logged_date);
    `,
    );
    await db.execAsync('PRAGMA user_version = 5');
    version = 5;
  }

  if (version < 6) {
    await runSql(
      db,
      `
      CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        logged_date TEXT NOT NULL,
        weight_kg REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS body_measurements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        logged_date TEXT NOT NULL,
        chest_cm REAL,
        waist_cm REAL,
        hips_cm REAL,
        left_arm_cm REAL,
        right_arm_cm REAL,
        left_thigh_cm REAL,
        right_thigh_cm REAL,
        left_calf_cm REAL,
        right_calf_cm REAL,
        neck_cm REAL,
        shoulders_cm REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS weight_logs_user_date_idx
        ON weight_logs (user_id, logged_date);
    `,
    );
    await db.execAsync('PRAGMA user_version = 6');
    version = 6;
  }

  if (version < 7) {
    await runSql(
      db,
      `
      CREATE TABLE IF NOT EXISTS sleep_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        sleep_date TEXT NOT NULL,
        bedtime TEXT,
        wake_time TEXT,
        duration_minutes INTEGER,
        quality_rating INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        frequency TEXT NOT NULL DEFAULT 'daily',
        frequency_days TEXT,
        target_count INTEGER DEFAULT 1,
        category TEXT,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        logged_date TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS supplements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        brand TEXT,
        dose_amount REAL NOT NULL,
        dose_unit TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'daily',
        times_of_day TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        stock_quantity INTEGER,
        low_stock_threshold INTEGER DEFAULT 7,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS supplement_logs (
        id TEXT PRIMARY KEY,
        supplement_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        taken_at TEXT NOT NULL,
        dose_amount REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        metric TEXT,
        start_value REAL,
        target_value REAL,
        current_value REAL,
        unit TEXT,
        deadline TEXT,
        status TEXT DEFAULT 'active',
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS goal_check_ins (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        checked_in_at TEXT NOT NULL,
        value REAL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_version INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX IF NOT EXISTS sleep_logs_user_date_idx ON sleep_logs (user_id, sleep_date);
      CREATE INDEX IF NOT EXISTS habit_logs_habit_date_idx ON habit_logs (habit_id, logged_date);
      CREATE INDEX IF NOT EXISTS supplement_logs_user_taken_idx ON supplement_logs (user_id, taken_at);
    `,
    );
    await db.execAsync('PRAGMA user_version = 7');
  }
}
