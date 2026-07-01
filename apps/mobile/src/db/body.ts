import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createBodyMeasurement,
  createWeightLog,
  enqueueBodyMeasurement,
  enqueueWeightLog,
  todayDateString,
  updateBodyMeasurement,
  type BodyMeasurement,
  type WeightLog,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, updateRow } from './helpers';

export interface WeightTrendPoint {
  day: string;
  weight_kg: number;
}

export async function logWeight(
  db: SQLiteDatabase,
  userId: string,
  weightKg: number,
): Promise<WeightLog> {
  const today = todayDateString();
  const queue = makeSyncQueue(db);
  const existing = await db.getFirstAsync<WeightLog>(
    `SELECT * FROM weight_logs
     WHERE user_id = ? AND logged_date = ? AND deleted_at IS NULL`,
    [userId, today],
  );

  if (existing) {
    const row = {
      ...existing,
      weight_kg: weightKg,
      updated_at: new Date().toISOString(),
      sync_version: existing.sync_version + 1,
    };
    await updateRow(db, 'weight_logs', row);
    await enqueueWeightLog(queue, 'update', row);
    return row;
  }

  const row = createWeightLog({ id: newId(), user_id: userId, weight_kg: weightKg });
  await insertRow(db, 'weight_logs', row);
  await enqueueWeightLog(queue, 'insert', row);
  return row;
}

export async function getLatestWeight(
  db: SQLiteDatabase,
  userId: string,
): Promise<WeightLog | null> {
  return db.getFirstAsync<WeightLog>(
    `SELECT * FROM weight_logs
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY logged_date DESC, updated_at DESC LIMIT 1`,
    [userId],
  );
}

export async function getWeightHistory(
  db: SQLiteDatabase,
  userId: string,
  limit = 30,
): Promise<WeightLog[]> {
  return db.getAllAsync<WeightLog>(
    `SELECT * FROM weight_logs
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY logged_date DESC LIMIT ?`,
    [userId, limit],
  );
}

export async function getWeightTrend(
  db: SQLiteDatabase,
  userId: string,
  days = 30,
): Promise<WeightTrendPoint[]> {
  const rows = await db.getAllAsync<WeightTrendPoint>(
    `SELECT logged_date as day, weight_kg
     FROM weight_logs
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY logged_date ASC`,
    [userId],
  );
  return rows.slice(-days);
}

export async function logBodyMeasurement(
  db: SQLiteDatabase,
  userId: string,
  patch: { waist_cm?: number; chest_cm?: number; hips_cm?: number },
): Promise<BodyMeasurement> {
  const today = todayDateString();
  const queue = makeSyncQueue(db);
  const existing = await db.getFirstAsync<BodyMeasurement>(
    `SELECT * FROM body_measurements
     WHERE user_id = ? AND logged_date = ? AND deleted_at IS NULL`,
    [userId, today],
  );

  if (existing) {
    const row = updateBodyMeasurement(existing, patch);
    await updateRow(db, 'body_measurements', row);
    await enqueueBodyMeasurement(queue, 'update', row);
    return row;
  }

  const row = createBodyMeasurement({
    id: newId(),
    user_id: userId,
    ...patch,
  });
  await insertRow(db, 'body_measurements', row);
  await enqueueBodyMeasurement(queue, 'insert', row);
  return row;
}

export async function getLatestBodyMeasurement(
  db: SQLiteDatabase,
  userId: string,
): Promise<BodyMeasurement | null> {
  return db.getFirstAsync<BodyMeasurement>(
    `SELECT * FROM body_measurements
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY logged_date DESC LIMIT 1`,
    [userId],
  );
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return Math.round((lbs / 2.20462) * 10) / 10;
}

export function calcBmi(weightKg: number, heightCm: number | null): number | null {
  if (!heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}
