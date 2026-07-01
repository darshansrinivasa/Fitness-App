import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createFood,
  createMealLog,
  createNutritionGoal,
  DEFAULT_NUTRITION_GOAL,
  enqueueFood,
  enqueueMealLog,
  enqueueNutritionGoal,
  todayDateString,
  updateNutritionGoal,
  type Food,
  type MealLog,
  type NutritionGoal,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, updateRow } from './helpers';

export interface MacroTotals {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export async function getFoods(
  db: SQLiteDatabase,
  userId: string,
): Promise<Food[]> {
  return db.getAllAsync<Food>(
    `SELECT * FROM foods WHERE user_id = ? AND deleted_at IS NULL ORDER BY name ASC`,
    [userId],
  );
}

export async function addFood(
  db: SQLiteDatabase,
  userId: string,
  input: {
    name: string;
    serving_size_g?: number;
    calories_per_serving?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  },
): Promise<Food> {
  const queue = makeSyncQueue(db);
  const row = createFood({ id: newId(), user_id: userId, ...input });
  await insertRow(db, 'foods', row);
  await enqueueFood(queue, 'insert', row);
  return row;
}

export async function getActiveNutritionGoal(
  db: SQLiteDatabase,
  userId: string,
  asOf: string = todayDateString(),
): Promise<NutritionGoal | null> {
  return db.getFirstAsync<NutritionGoal>(
    `SELECT * FROM nutrition_goals
     WHERE user_id = ? AND deleted_at IS NULL AND effective_from <= ?
     ORDER BY effective_from DESC, updated_at DESC LIMIT 1`,
    [userId, asOf],
  );
}

export async function ensureDefaultNutritionGoal(
  db: SQLiteDatabase,
  userId: string,
): Promise<NutritionGoal> {
  const existing = await getActiveNutritionGoal(db, userId);
  if (existing) return existing;

  const queue = makeSyncQueue(db);
  const row = createNutritionGoal({ id: newId(), user_id: userId });
  await insertRow(db, 'nutrition_goals', row);
  await enqueueNutritionGoal(queue, 'insert', row);
  return row;
}

export async function setNutritionGoal(
  db: SQLiteDatabase,
  userId: string,
  patch: Partial<Pick<NutritionGoal, 'calories' | 'protein_g' | 'carbs_g' | 'fat_g'>>,
): Promise<NutritionGoal> {
  const today = todayDateString();
  const queue = makeSyncQueue(db);
  const existingToday = await db.getFirstAsync<NutritionGoal>(
    `SELECT * FROM nutrition_goals
     WHERE user_id = ? AND effective_from = ? AND deleted_at IS NULL`,
    [userId, today],
  );

  if (existingToday) {
    const row = updateNutritionGoal(existingToday, patch);
    await updateRow(db, 'nutrition_goals', row);
    await enqueueNutritionGoal(queue, 'update', row);
    return row;
  }

  const row = createNutritionGoal({
    id: newId(),
    user_id: userId,
    ...(patch.calories != null ? { calories: patch.calories } : {}),
    ...(patch.protein_g != null ? { protein_g: patch.protein_g } : {}),
    ...(patch.carbs_g != null ? { carbs_g: patch.carbs_g } : {}),
    ...(patch.fat_g != null ? { fat_g: patch.fat_g } : {}),
  });
  await insertRow(db, 'nutrition_goals', row);
  await enqueueNutritionGoal(queue, 'insert', row);
  return row;
}

function scaleMacros(
  food: Food,
  quantityG: number,
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const factor = quantityG / food.serving_size_g;
  return {
    calories: Math.round((food.calories_per_serving ?? 0) * factor),
    protein_g: Math.round(((food.protein_g ?? 0) * factor) * 10) / 10,
    carbs_g: Math.round(((food.carbs_g ?? 0) * factor) * 10) / 10,
    fat_g: Math.round(((food.fat_g ?? 0) * factor) * 10) / 10,
  };
}

export async function logMeal(
  db: SQLiteDatabase,
  userId: string,
  food: Food,
  quantityG: number,
  mealType: MealLog['meal_type'],
): Promise<MealLog> {
  const queue = makeSyncQueue(db);
  const macros = scaleMacros(food, quantityG);
  const row = createMealLog({
    id: newId(),
    user_id: userId,
    food_id: food.id,
    food_name: food.name,
    quantity_g: quantityG,
    meal_type: mealType,
    ...macros,
  });
  await insertRow(db, 'meal_logs', row);
  await enqueueMealLog(queue, 'insert', row);
  return row;
}

export async function getTodayMealLogs(
  db: SQLiteDatabase,
  userId: string,
): Promise<MealLog[]> {
  const today = todayDateString();
  return db.getAllAsync<MealLog>(
    `SELECT * FROM meal_logs
     WHERE user_id = ? AND deleted_at IS NULL AND logged_date = ?
     ORDER BY created_at DESC`,
    [userId, today],
  );
}

export async function getTodayMacroTotals(
  db: SQLiteDatabase,
  userId: string,
): Promise<MacroTotals> {
  const today = todayDateString();
  const row = await db.getFirstAsync<MacroTotals>(
    `SELECT
       COALESCE(SUM(calories), 0) as calories,
       COALESCE(SUM(protein_g), 0) as protein_g,
       COALESCE(SUM(carbs_g), 0) as carbs_g,
       COALESCE(SUM(fat_g), 0) as fat_g
     FROM meal_logs
     WHERE user_id = ? AND deleted_at IS NULL AND logged_date = ?`,
    [userId, today],
  );
  return row ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

export { DEFAULT_NUTRITION_GOAL };
