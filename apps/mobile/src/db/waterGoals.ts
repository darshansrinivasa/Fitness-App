import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createWaterGoal,
  DEFAULT_DAILY_WATER_GOAL_ML,
  enqueueWaterGoal,
  todayDateString,
  updateWaterGoal,
  WATER_GOALS_TABLE,
  type WaterGoal,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { enqueueChange } from '../sync/sqliteStore';

export async function getActiveWaterGoal(
  db: SQLiteDatabase,
  userId: string,
  asOf: string = todayDateString(),
): Promise<WaterGoal | null> {
  return db.getFirstAsync<WaterGoal>(
    `SELECT * FROM water_goals
     WHERE user_id = ? AND deleted_at IS NULL AND effective_from <= ?
     ORDER BY effective_from DESC, updated_at DESC
     LIMIT 1`,
    [userId, asOf],
  );
}

export async function ensureDefaultWaterGoal(
  db: SQLiteDatabase,
  userId: string,
): Promise<WaterGoal> {
  const existing = await getActiveWaterGoal(db, userId);
  if (existing) return existing;

  const row = createWaterGoal({
    id: newId(),
    user_id: userId,
    daily_target_ml: DEFAULT_DAILY_WATER_GOAL_ML,
  });

  const keys = Object.keys(row);
  await db.runAsync(
    `INSERT INTO water_goals (${keys.join(', ')})
     VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => (row as Record<string, unknown>)[k]) as (
      | string
      | number
      | null
    )[],
  );

  await enqueueWaterGoal(
    {
      enqueue: (table, recordId, operation, payload, createdAt) =>
        enqueueChange(db, table, recordId, operation, payload, createdAt),
    },
    'insert',
    row,
  );

  return row;
}

export async function setDailyWaterGoal(
  db: SQLiteDatabase,
  userId: string,
  dailyTargetMl: number,
): Promise<WaterGoal> {
  const today = todayDateString();
  const existingToday = await db.getFirstAsync<WaterGoal>(
    `SELECT * FROM water_goals
     WHERE user_id = ? AND effective_from = ? AND deleted_at IS NULL`,
    [userId, today],
  );

  if (existingToday) {
    const row = updateWaterGoal(existingToday, {
      daily_target_ml: dailyTargetMl,
    });
    const keys = Object.keys(row);
    await db.runAsync(
      `UPDATE water_goals SET ${keys
        .filter((k) => k !== 'id')
        .map((k) => `${k} = ?`)
        .join(', ')}
       WHERE id = ?`,
      [
        ...keys
          .filter((k) => k !== 'id')
          .map((k) => (row as Record<string, unknown>)[k]),
        row.id,
      ] as (string | number | null)[],
    );
    await enqueueWaterGoal(
      {
        enqueue: (table, recordId, operation, payload, createdAt) =>
          enqueueChange(db, table, recordId, operation, payload, createdAt),
      },
      'update',
      row,
    );
    return row;
  }

  const row = createWaterGoal({
    id: newId(),
    user_id: userId,
    daily_target_ml: dailyTargetMl,
    effective_from: today,
  });

  const keys = Object.keys(row);
  await db.runAsync(
    `INSERT INTO water_goals (${keys.join(', ')})
     VALUES (${keys.map(() => '?').join(', ')})`,
    keys.map((k) => (row as Record<string, unknown>)[k]) as (
      | string
      | number
      | null
    )[],
  );

  await enqueueWaterGoal(
    {
      enqueue: (table, recordId, operation, payload, createdAt) =>
        enqueueChange(db, table, recordId, operation, payload, createdAt),
    },
    'insert',
    row,
  );

  return row;
}

export { WATER_GOALS_TABLE };
