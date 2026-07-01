import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createMedicalRecord,
  createSymptomLog,
  createVitalsLog,
  enqueueMedicalRecord,
  enqueueSymptomLog,
  enqueueVitalsLog,
  type MedicalRecord,
  type SymptomLog,
  type VitalsLog,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite } from './helpers';

export async function logVitals(
  db: SQLiteDatabase,
  userId: string,
  input: {
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate_bpm?: number;
    blood_sugar_mgdl?: number;
    notes?: string;
  },
): Promise<VitalsLog> {
  const queue = makeSyncQueue(db);
  const row = createVitalsLog({ id: newId(), user_id: userId, ...input });
  await insertRow(db, 'vitals_logs', row);
  await enqueueVitalsLog(queue, 'insert', row);
  return row;
}

export async function logSymptom(
  db: SQLiteDatabase,
  userId: string,
  symptom: string,
  severity = 3,
  notes?: string,
): Promise<SymptomLog> {
  const queue = makeSyncQueue(db);
  const row = createSymptomLog({ id: newId(), user_id: userId, symptom, severity, notes });
  await insertRow(db, 'symptoms_logs', row);
  await enqueueSymptomLog(queue, 'insert', row);
  return row;
}

export async function addMedicalRecord(
  db: SQLiteDatabase,
  userId: string,
  input: {
    title: string;
    record_type: MedicalRecord['record_type'];
    description?: string;
    doctor_name?: string;
  },
): Promise<MedicalRecord> {
  const queue = makeSyncQueue(db);
  const row = createMedicalRecord({ id: newId(), user_id: userId, ...input });
  await insertRow(db, 'medical_records', row);
  await enqueueMedicalRecord(queue, 'insert', row);
  return row;
}

export async function getRecentVitals(db: SQLiteDatabase, userId: string, limit = 10): Promise<VitalsLog[]> {
  const rows = await db.getAllAsync<VitalsLog>(
    `SELECT * FROM vitals_logs WHERE user_id = ? AND deleted_at IS NULL ORDER BY logged_at DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}

export async function getRecentSymptoms(db: SQLiteDatabase, userId: string, limit = 10): Promise<SymptomLog[]> {
  const rows = await db.getAllAsync<SymptomLog>(
    `SELECT * FROM symptoms_logs WHERE user_id = ? AND deleted_at IS NULL ORDER BY logged_date DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}

export async function getMedicalRecords(db: SQLiteDatabase, userId: string, limit = 10): Promise<MedicalRecord[]> {
  const rows = await db.getAllAsync<MedicalRecord>(
    `SELECT * FROM medical_records WHERE user_id = ? AND deleted_at IS NULL ORDER BY record_date DESC LIMIT ?`,
    [userId, limit],
  );
  return rows.map(parseFromSqlite);
}

export async function getLatestHeartRate(db: SQLiteDatabase, userId: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ heart_rate_bpm: number | null }>(
    `SELECT heart_rate_bpm FROM vitals_logs WHERE user_id = ? AND deleted_at IS NULL AND heart_rate_bpm IS NOT NULL
     ORDER BY logged_at DESC LIMIT 1`,
    [userId],
  );
  return row?.heart_rate_bpm ?? null;
}
