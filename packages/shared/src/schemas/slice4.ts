import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const syncFields = {
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
  sync_version: z.number().int().positive(),
};

export const vitalsLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_at: z.string().datetime(),
  systolic_bp: z.number().int().positive().nullable().optional(),
  diastolic_bp: z.number().int().positive().nullable().optional(),
  heart_rate_bpm: z.number().int().positive().nullable().optional(),
  blood_sugar_mgdl: z.number().positive().nullable().optional(),
  spo2_percent: z.number().positive().nullable().optional(),
  body_temp_celsius: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export const medicalRecordSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  record_date: dateString,
  record_type: z.enum(['visit', 'diagnosis', 'prescription', 'lab_result', 'vaccination']),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  doctor_name: z.string().nullable().optional(),
  clinic_name: z.string().nullable().optional(),
  attachments: z.array(z.string()).nullable().optional(),
  ...syncFields,
});

export const symptomLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  symptom: z.string().min(1),
  severity: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type VitalsLog = z.infer<typeof vitalsLogSchema>;
export type MedicalRecord = z.infer<typeof medicalRecordSchema>;
export type SymptomLog = z.infer<typeof symptomLogSchema>;

export const VITALS_LOGS_TABLE = 'vitals_logs' as const;
export const MEDICAL_RECORDS_TABLE = 'medical_records' as const;
export const SYMPTOMS_LOGS_TABLE = 'symptoms_logs' as const;

export const progressPhotoSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  taken_date: dateString,
  angle: z.enum(['front', 'side', 'back', 'custom']),
  storage_path: z.string().min(1),
  weight_kg: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type ProgressPhoto = z.infer<typeof progressPhotoSchema>;
export const PROGRESS_PHOTOS_TABLE = 'progress_photos' as const;
export const PROGRESS_PHOTOS_BUCKET = 'progress-photos' as const;

export const haircareLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  log_type: z.enum(['oil', 'wash', 'treatment', 'trim', 'note']),
  products_used: z.array(z.string()).nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  scalp_condition: z.number().int().min(1).max(5).nullable().optional(),
  hair_condition: z.number().int().min(1).max(5).nullable().optional(),
  shedding_level: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export const haircareProductSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  ...syncFields,
});

export type HaircareLog = z.infer<typeof haircareLogSchema>;
export type HaircareProduct = z.infer<typeof haircareProductSchema>;
export const HAIRCARE_LOGS_TABLE = 'haircare_logs' as const;
export const HAIRCARE_PRODUCTS_TABLE = 'haircare_products' as const;

export const skincareLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  routine_type: z.enum(['morning', 'night']),
  products_used: z.array(z.string()).nullable().optional(),
  skin_hydration: z.number().int().min(1).max(5).nullable().optional(),
  skin_oiliness: z.number().int().min(1).max(5).nullable().optional(),
  skin_clarity: z.number().int().min(1).max(5).nullable().optional(),
  sensitivity: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export const breakoutLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  location: z.string().nullable().optional(),
  severity: z.number().int().min(1).max(5).nullable().optional(),
  suspected_cause: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export const skincareProductSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  key_ingredients: z.array(z.string()).nullable().optional(),
  routine_step: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type SkincareLog = z.infer<typeof skincareLogSchema>;
export type BreakoutLog = z.infer<typeof breakoutLogSchema>;
export type SkincareProduct = z.infer<typeof skincareProductSchema>;
export const SKINCARE_LOGS_TABLE = 'skincare_logs' as const;
export const BREAKOUT_LOGS_TABLE = 'breakout_logs' as const;
export const SKINCARE_PRODUCTS_TABLE = 'skincare_products' as const;
