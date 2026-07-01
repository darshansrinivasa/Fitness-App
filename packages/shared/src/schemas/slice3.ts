import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const syncFields = {
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
  sync_version: z.number().int().positive(),
};

export const sleepLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  sleep_date: dateString,
  bedtime: z.string().datetime().nullable().optional(),
  wake_time: z.string().datetime().nullable().optional(),
  duration_minutes: z.number().int().nonnegative().nullable().optional(),
  quality_rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type SleepLog = z.infer<typeof sleepLogSchema>;
export const SLEEP_LOGS_TABLE = 'sleep_logs' as const;

export const habitSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  frequency: z.string().default('daily'),
  frequency_days: z.array(z.number()).nullable().optional(),
  target_count: z.number().int().positive().optional(),
  category: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  ...syncFields,
});

export const habitLogSchema = z.object({
  id: z.string().uuid(),
  habit_id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  count: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type Habit = z.infer<typeof habitSchema>;
export type HabitLog = z.infer<typeof habitLogSchema>;
export const HABITS_TABLE = 'habits' as const;
export const HABIT_LOGS_TABLE = 'habit_logs' as const;

export const supplementSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  dose_amount: z.number().positive(),
  dose_unit: z.string().min(1),
  frequency: z.string().default('daily'),
  times_of_day: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  stock_quantity: z.number().int().nullable().optional(),
  low_stock_threshold: z.number().int().optional(),
  ...syncFields,
});

export const supplementLogSchema = z.object({
  id: z.string().uuid(),
  supplement_id: z.string().uuid(),
  user_id: z.string().uuid(),
  taken_at: z.string().datetime(),
  dose_amount: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type Supplement = z.infer<typeof supplementSchema>;
export type SupplementLog = z.infer<typeof supplementLogSchema>;
export const SUPPLEMENTS_TABLE = 'supplements' as const;
export const SUPPLEMENT_LOGS_TABLE = 'supplement_logs' as const;

export const goalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  category: z.string().min(1),
  metric: z.string().nullable().optional(),
  start_value: z.number().nullable().optional(),
  target_value: z.number().nullable().optional(),
  current_value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  deadline: dateString.nullable().optional(),
  status: z.enum(['active', 'completed', 'paused', 'abandoned']).optional(),
  completed_at: z.string().datetime().nullable().optional(),
  ...syncFields,
});

export const goalCheckInSchema = z.object({
  id: z.string().uuid(),
  goal_id: z.string().uuid(),
  user_id: z.string().uuid(),
  checked_in_at: z.string().datetime(),
  value: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type Goal = z.infer<typeof goalSchema>;
export type GoalCheckIn = z.infer<typeof goalCheckInSchema>;
export const GOALS_TABLE = 'goals' as const;
export const GOAL_CHECK_INS_TABLE = 'goal_check_ins' as const;
