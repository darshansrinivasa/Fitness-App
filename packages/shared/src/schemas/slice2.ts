import { z } from 'zod';

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const syncFields = {
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
  sync_version: z.number().int().positive(),
};

export const workoutSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  template_id: z.string().uuid().nullable().optional(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export const workoutExerciseSchema = z.object({
  id: z.string().uuid(),
  workout_id: z.string().uuid(),
  exercise_name: z.string().min(1),
  exercise_category: z.string().nullable().optional(),
  order_index: z.number().int().nonnegative(),
  ...syncFields,
});

export const workoutSetSchema = z.object({
  id: z.string().uuid(),
  workout_exercise_id: z.string().uuid(),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive().nullable().optional(),
  weight_kg: z.number().positive().nullable().optional(),
  duration_seconds: z.number().int().positive().nullable().optional(),
  distance_km: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  is_pr: z.boolean().optional(),
  ...syncFields,
});

export type Workout = z.infer<typeof workoutSchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export type WorkoutSet = z.infer<typeof workoutSetSchema>;

export const WORKOUTS_TABLE = 'workouts' as const;
export const WORKOUT_EXERCISES_TABLE = 'workout_exercises' as const;
export const WORKOUT_SETS_TABLE = 'workout_sets' as const;

export const foodSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  serving_size_g: z.number().positive(),
  calories_per_serving: z.number().nonnegative().nullable().optional(),
  protein_g: z.number().nonnegative().nullable().optional(),
  carbs_g: z.number().nonnegative().nullable().optional(),
  fat_g: z.number().nonnegative().nullable().optional(),
  fiber_g: z.number().nonnegative().nullable().optional(),
  sugar_g: z.number().nonnegative().nullable().optional(),
  sodium_mg: z.number().nonnegative().nullable().optional(),
  barcode: z.string().nullable().optional(),
  is_favourite: z.boolean().optional(),
  ...syncFields,
});

export const mealLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  food_id: z.string().uuid().nullable().optional(),
  food_name: z.string().min(1),
  quantity_g: z.number().positive(),
  calories: z.number().nonnegative().nullable().optional(),
  protein_g: z.number().nonnegative().nullable().optional(),
  carbs_g: z.number().nonnegative().nullable().optional(),
  fat_g: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export const nutritionGoalSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  calories: z.number().int().positive().nullable().optional(),
  protein_g: z.number().int().nonnegative().nullable().optional(),
  carbs_g: z.number().int().nonnegative().nullable().optional(),
  fat_g: z.number().int().nonnegative().nullable().optional(),
  effective_from: dateString,
  ...syncFields,
});

export type Food = z.infer<typeof foodSchema>;
export type MealLog = z.infer<typeof mealLogSchema>;
export type NutritionGoal = z.infer<typeof nutritionGoalSchema>;

export const FOODS_TABLE = 'foods' as const;
export const MEAL_LOGS_TABLE = 'meal_logs' as const;
export const NUTRITION_GOALS_TABLE = 'nutrition_goals' as const;

export const DEFAULT_NUTRITION_GOAL = {
  calories: 2200,
  protein_g: 150,
  carbs_g: 220,
  fat_g: 70,
} as const;

export const weightLogSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  weight_kg: z.number().positive(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export const bodyMeasurementSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  logged_date: dateString,
  chest_cm: z.number().positive().nullable().optional(),
  waist_cm: z.number().positive().nullable().optional(),
  hips_cm: z.number().positive().nullable().optional(),
  left_arm_cm: z.number().positive().nullable().optional(),
  right_arm_cm: z.number().positive().nullable().optional(),
  left_thigh_cm: z.number().positive().nullable().optional(),
  right_thigh_cm: z.number().positive().nullable().optional(),
  left_calf_cm: z.number().positive().nullable().optional(),
  right_calf_cm: z.number().positive().nullable().optional(),
  neck_cm: z.number().positive().nullable().optional(),
  shoulders_cm: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  ...syncFields,
});

export type WeightLog = z.infer<typeof weightLogSchema>;
export type BodyMeasurement = z.infer<typeof bodyMeasurementSchema>;

export const WEIGHT_LOGS_TABLE = 'weight_logs' as const;
export const BODY_MEASUREMENTS_TABLE = 'body_measurements' as const;
