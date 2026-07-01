import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  medicalRecordSchema,
  symptomLogSchema,
  vitalsLogSchema,
  MEDICAL_RECORDS_TABLE,
  SYMPTOMS_LOGS_TABLE,
  VITALS_LOGS_TABLE,
  type MedicalRecord,
  type SymptomLog,
  type VitalsLog,
} from '../schemas/slice4';

export interface EnqueueChange {
  enqueue(table: string, recordId: string, operation: SyncOperation, payload: string, createdAt: string): Promise<void>;
}

function base(now: Date) {
  const ts = now.toISOString();
  return { created_at: ts, updated_at: ts, deleted_at: null, sync_version: 1 };
}

export function createVitalsLog(
  input: {
    id: string;
    user_id: string;
    systolic_bp?: number;
    diastolic_bp?: number;
    heart_rate_bpm?: number;
    blood_sugar_mgdl?: number;
    notes?: string;
  },
  now = new Date(),
): VitalsLog {
  return vitalsLogSchema.parse({
    ...input,
    logged_at: now.toISOString(),
    spo2_percent: null,
    body_temp_celsius: null,
    notes: input.notes ?? null,
    ...base(now),
  });
}

export function createSymptomLog(
  input: { id: string; user_id: string; symptom: string; severity?: number; notes?: string },
  now = new Date(),
): SymptomLog {
  return symptomLogSchema.parse({
    ...input,
    logged_date: todayDateString(now),
    severity: input.severity ?? 3,
    notes: input.notes ?? null,
    ...base(now),
  });
}

export function createMedicalRecord(
  input: {
    id: string;
    user_id: string;
    title: string;
    record_type: MedicalRecord['record_type'];
    description?: string;
    doctor_name?: string;
  },
  now = new Date(),
): MedicalRecord {
  return medicalRecordSchema.parse({
    ...input,
    record_date: todayDateString(now),
    description: input.description ?? null,
    doctor_name: input.doctor_name ?? null,
    clinic_name: null,
    attachments: null,
    ...base(now),
  });
}

async function enqueue(queue: EnqueueChange, table: string, row: { id: string }, op: SyncOperation, now: Date) {
  await queue.enqueue(table, row.id, op, JSON.stringify(row), now.toISOString());
}

export const enqueueVitalsLog = (q: EnqueueChange, op: SyncOperation, row: VitalsLog, now = new Date()) =>
  enqueue(q, VITALS_LOGS_TABLE, row, op, now);
export const enqueueSymptomLog = (q: EnqueueChange, op: SyncOperation, row: SymptomLog, now = new Date()) =>
  enqueue(q, SYMPTOMS_LOGS_TABLE, row, op, now);
export const enqueueMedicalRecord = (q: EnqueueChange, op: SyncOperation, row: MedicalRecord, now = new Date()) =>
  enqueue(q, MEDICAL_RECORDS_TABLE, row, op, now);

export { VITALS_LOGS_TABLE, SYMPTOMS_LOGS_TABLE, MEDICAL_RECORDS_TABLE };
