import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const waterGoalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  daily_target_ml: z.number().int().positive(),
  effective_from: dateString,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
  sync_version: z.number().int().positive(),
});

export type WaterGoal = z.infer<typeof waterGoalSchema>;

export const WATER_GOALS_TABLE = 'water_goals' as const;

export const DEFAULT_DAILY_WATER_GOAL_ML = 3000;
