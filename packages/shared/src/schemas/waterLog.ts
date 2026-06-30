import { z } from 'zod';

export const waterLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_at: z.string().datetime(),
  amount_ml: z.number().int().positive(),
  notes: z.string().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
  sync_version: z.number().int().positive(),
});

export type WaterLog = z.infer<typeof waterLogSchema>;

export const WATER_LOGS_TABLE = 'water_logs' as const;
