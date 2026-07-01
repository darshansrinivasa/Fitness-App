import { nextLocalVersion } from './conflict';
import type { SyncOperation } from '../types/sync';
import { todayDateString } from './waterGoals';
import {
  DEFAULT_NUTRITION_GOAL,
  foodSchema,
  mealLogSchema,
  nutritionGoalSchema,
  NUTRITION_GOALS_TABLE,
  FOODS_TABLE,
  MEAL_LOGS_TABLE,
  type Food,
  type MealLog,
  type NutritionGoal,
} from '../schemas/slice2';

export interface EnqueueChange {
  enqueue(
    table: string,
    recordId: string,
    operation: SyncOperation,
    payload: string,
    createdAt: string,
  ): Promise<void>;
}

function baseFields(now: Date) {
  const ts = now.toISOString();
  return {
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
    sync_version: 1,
  };
}

export function createFood(
  input: {
    id: string;
    user_id: string;
    name: string;
    serving_size_g?: number;
    calories_per_serving?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  },
  now: Date = new Date(),
): Food {
  return foodSchema.parse({
    ...input,
    serving_size_g: input.serving_size_g ?? 100,
    brand: null,
    fiber_g: null,
    sugar_g: null,
    sodium_mg: null,
    barcode: null,
    is_favourite: false,
    ...baseFields(now),
  });
}

export function createMealLog(
  input: {
    id: string;
    user_id: string;
    food_name: string;
    quantity_g: number;
    meal_type: MealLog['meal_type'];
    food_id?: string | null;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    logged_date?: string;
  },
  now: Date = new Date(),
): MealLog {
  return mealLogSchema.parse({
    ...input,
    logged_date: input.logged_date ?? todayDateString(now),
    notes: null,
    ...baseFields(now),
  });
}

export function createNutritionGoal(
  input: {
    id: string;
    user_id: string;
    calories?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
    effective_from?: string;
  },
  now: Date = new Date(),
): NutritionGoal {
  return nutritionGoalSchema.parse({
    ...input,
    calories: input.calories ?? DEFAULT_NUTRITION_GOAL.calories,
    protein_g: input.protein_g ?? DEFAULT_NUTRITION_GOAL.protein_g,
    carbs_g: input.carbs_g ?? DEFAULT_NUTRITION_GOAL.carbs_g,
    fat_g: input.fat_g ?? DEFAULT_NUTRITION_GOAL.fat_g,
    effective_from: input.effective_from ?? todayDateString(now),
    ...baseFields(now),
  });
}

export function updateNutritionGoal(
  existing: NutritionGoal,
  patch: Partial<Pick<NutritionGoal, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>>,
  now: Date = new Date(),
): NutritionGoal {
  return nutritionGoalSchema.parse({
    ...existing,
    ...patch,
    ...nextLocalVersion(existing, now),
  });
}

export async function enqueueFood(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: Food,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(FOODS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export async function enqueueMealLog(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: MealLog,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(MEAL_LOGS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export async function enqueueNutritionGoal(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: NutritionGoal,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    NUTRITION_GOALS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export {
  DEFAULT_NUTRITION_GOAL,
  FOODS_TABLE,
  MEAL_LOGS_TABLE,
  NUTRITION_GOALS_TABLE,
};
