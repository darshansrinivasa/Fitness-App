import {
  createBodyMeasurement,
  createBreakoutLog,
  createFood,
  createGoal,
  createGoalCheckIn,
  createHabit,
  createHabitLog,
  createHaircareLog,
  createHaircareProduct,
  createMealLog,
  createMedicalRecord,
  createPersonalRecord,
  createProgressPhoto,
  createSkincareLog,
  createSleepLog,
  createSupplement,
  createSupplementLog,
  createSymptomLog,
  createVitalsLog,
  createNutritionGoal,
  createWaterGoal,
  createWaterLog,
  createWeightLog,
  createWorkout,
  createWorkoutExercise,
  createWorkoutSet,
  createWorkoutTemplate,
  goalProgressPct,
  todayDateString,
  type Food,
  type Goal,
  type Habit,
  type PersonalRecord,
  type TemplateExercise,
  NUTRITION_GOALS_TABLE,
  WATER_GOALS_TABLE,
  WEIGHT_LOGS_TABLE,
  type WorkoutTemplate,
} from '@lifestyle-os/shared/sync';
import {
  buildPeriodSummary,
  exportToChatGpt,
  exportToJson,
  exportToMarkdown,
  exportToPdfHtml,
  resolveDateRange,
  type DateRangePreset,
  type ExportFormat,
  type LifestyleExport,
  type ReportPeriod,
} from '@lifestyle-os/shared';

import { getSupabase } from './supabase';

export const MODULES = [
  { id: 'fitness', title: 'Fitness', blurb: 'Workouts, templates, records' },
  { id: 'nutrition', title: 'Nutrition', blurb: 'Meals and macros' },
  { id: 'water', title: 'Water', blurb: 'Hydration and daily goal' },
  { id: 'sleep', title: 'Sleep', blurb: 'Duration and quality' },
  { id: 'habits', title: 'Habits', blurb: 'Daily checklist' },
  { id: 'body', title: 'Body', blurb: 'Weight and measurements' },
  { id: 'photos', title: 'Photos', blurb: 'Progress gallery' },
  { id: 'haircare', title: 'Haircare', blurb: 'Wash, oil, treatments' },
  { id: 'skincare', title: 'Skincare', blurb: 'Routine and breakouts' },
  { id: 'supplements', title: 'Supplements', blurb: 'Doses and stock' },
  { id: 'goals', title: 'Goals', blurb: 'Targets and check-ins' },
  { id: 'health', title: 'Health Records', blurb: 'Vitals, symptoms, visits' },
] as const;

export type ModuleId = (typeof MODULES)[number]['id'];

function id(): string {
  return crypto.randomUUID();
}

export async function saveBaseline(
  userId: string,
  input: { weightKg?: number | null; waterMl?: number | null; calories?: number | null },
): Promise<void> {
  if (input.weightKg && input.weightKg > 0) {
    await insert(WEIGHT_LOGS_TABLE, createWeightLog({ id: id(), user_id: userId, weight_kg: input.weightKg }));
  }
  if (input.waterMl && input.waterMl > 0) {
    await insert(WATER_GOALS_TABLE, createWaterGoal({ id: id(), user_id: userId, daily_target_ml: Math.round(input.waterMl) }));
  }
  if (input.calories && input.calories > 0) {
    await insert(NUTRITION_GOALS_TABLE, createNutritionGoal({ id: id(), user_id: userId, calories: Math.round(input.calories) }));
  }
}

async function insert(table: string, row: object): Promise<void> {
  const { error } = await getSupabase().from(table).insert(row);
  if (error) throw new Error(error.message);
}

async function patch(table: string, rowId: string, values: object): Promise<void> {
  const { error } = await getSupabase().from(table).update(values).eq('id', rowId);
  if (error) throw new Error(error.message);
}

export async function logWater(userId: string, amountMl: number): Promise<void> {
  await insert('water_logs', createWaterLog({ id: id(), user_id: userId, amount_ml: amountMl }));
}

export async function logWorkout(
  userId: string,
  name: string,
  exercises: TemplateExercise[],
): Promise<void> {
  const workout = createWorkout({ id: id(), user_id: userId, name });
  await insert('workouts', workout);
  for (let index = 0; index < exercises.length; index += 1) {
    const draft = exercises[index];
    const exercise = createWorkoutExercise({
      id: id(),
      workout_id: workout.id,
      exercise_name: draft.exercise_name,
      order_index: index,
    });
    await insert('workout_exercises', exercise);
    for (let setNumber = 1; setNumber <= draft.sets; setNumber += 1) {
      const setId = id();
      const isPr = setNumber === draft.sets ? await recordPr(userId, draft, setId) : false;
      await insert(
        'workout_sets',
        createWorkoutSet({
          id: setId,
          workout_exercise_id: exercise.id,
          set_number: setNumber,
          reps: draft.reps,
          weight_kg: draft.weight_kg,
          is_pr: isPr,
        }),
      );
    }
  }
}

async function recordPr(userId: string, draft: TemplateExercise, setId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .ilike('exercise_name', draft.exercise_name)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const existing = data as PersonalRecord | null;
  const beats =
    !existing ||
    (existing.weight_kg ?? 0) < draft.weight_kg ||
    ((existing.weight_kg ?? 0) === draft.weight_kg && (existing.reps ?? 0) < draft.reps);
  if (!beats) return false;
  if (!existing) {
    await insert(
      'personal_records',
      createPersonalRecord({
        id: id(),
        user_id: userId,
        exercise_name: draft.exercise_name,
        weight_kg: draft.weight_kg,
        reps: draft.reps,
        workout_set_id: setId,
      }),
    );
    return true;
  }
  await patch('personal_records', existing.id, {
    weight_kg: draft.weight_kg,
    reps: draft.reps,
    achieved_at: new Date().toISOString(),
    workout_set_id: setId,
    updated_at: new Date().toISOString(),
    sync_version: Number(existing.sync_version ?? 1) + 1,
  });
  return true;
}

export async function saveTemplate(userId: string, name: string, exercises: TemplateExercise[]) {
  await insert(
    'workout_templates',
    createWorkoutTemplate({ id: id(), user_id: userId, name, exercises }),
  );
}

export async function addFood(
  userId: string,
  input: { name: string; calories: number; protein: number; carbs: number; fat: number },
): Promise<void> {
  await insert(
    'foods',
    createFood({
      id: id(),
      user_id: userId,
      name: input.name,
      calories_per_serving: input.calories,
      protein_g: input.protein,
      carbs_g: input.carbs,
      fat_g: input.fat,
    }),
  );
}

export async function logMeal(
  userId: string,
  food: Food,
  quantityG: number,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
): Promise<void> {
  const factor = quantityG / (food.serving_size_g || 100);
  await insert(
    'meal_logs',
    createMealLog({
      id: id(),
      user_id: userId,
      food_id: food.id,
      food_name: food.name,
      quantity_g: quantityG,
      meal_type: mealType,
      calories: Math.round((food.calories_per_serving ?? 0) * factor),
      protein_g: Math.round((food.protein_g ?? 0) * factor * 10) / 10,
      carbs_g: Math.round((food.carbs_g ?? 0) * factor * 10) / 10,
      fat_g: Math.round((food.fat_g ?? 0) * factor * 10) / 10,
    }),
  );
}

export async function logWeight(userId: string, weightKg: number): Promise<void> {
  await insert('weight_logs', createWeightLog({ id: id(), user_id: userId, weight_kg: weightKg }));
}

export async function logMeasurements(
  userId: string,
  patchValues: Record<string, number>,
): Promise<void> {
  const today = todayDateString();
  const { data, error } = await getSupabase()
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_date', today)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) {
    await patch('body_measurements', data.id as string, {
      ...patchValues,
      updated_at: new Date().toISOString(),
      sync_version: Number(data.sync_version ?? 1) + 1,
    });
    return;
  }
  await insert(
    'body_measurements',
    createBodyMeasurement({ id: id(), user_id: userId, ...patchValues }),
  );
}

export function sleepInstants(bedtime: string, wake: string): { bedtime: string; wake_time: string } {
  const today = todayDateString();
  const [bh, bm] = bedtime.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  let bedDate = today;
  if (bh * 60 + bm > wh * 60 + wm) {
    const previous = new Date(`${today}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    bedDate = previous.toISOString().slice(0, 10);
  }
  return {
    bedtime: new Date(`${bedDate}T${bedtime}:00Z`).toISOString(),
    wake_time: new Date(`${today}T${wake}:00Z`).toISOString(),
  };
}

export async function logSleep(
  userId: string,
  bedtime: string,
  wake: string,
  quality: number,
): Promise<void> {
  const times = sleepInstants(bedtime, wake);
  await insert(
    'sleep_logs',
    createSleepLog({ id: id(), user_id: userId, ...times, quality_rating: quality }),
  );
}

export async function addHabit(userId: string, name: string): Promise<void> {
  await insert('habits', createHabit({ id: id(), user_id: userId, name }));
}

export async function toggleHabit(userId: string, habitId: string, done: boolean): Promise<void> {
  const today = todayDateString();
  const { data, error } = await getSupabase()
    .from('habit_logs')
    .select('id, sync_version')
    .eq('habit_id', habitId)
    .eq('logged_date', today)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (done && !data) {
    await insert('habit_logs', createHabitLog({ id: id(), user_id: userId, habit_id: habitId }));
  }
  if (!done && data) {
    await patch('habit_logs', data.id as string, {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_version: Number(data.sync_version ?? 1) + 1,
    });
  }
}

export async function addSupplement(
  userId: string,
  input: { name: string; dose: number; unit: string; stock: number | null },
): Promise<void> {
  const row = createSupplement({
    id: id(),
    user_id: userId,
    name: input.name,
    dose_amount: input.dose,
    dose_unit: input.unit,
  });
  if (input.stock != null) row.stock_quantity = input.stock;
  await insert('supplements', row);
}

export async function takeSupplement(
  userId: string,
  supplement: { id: string; dose_amount: number; stock_quantity: number | null; sync_version?: number },
): Promise<void> {
  await insert(
    'supplement_logs',
    createSupplementLog({
      id: id(),
      user_id: userId,
      supplement_id: supplement.id,
      dose_amount: supplement.dose_amount,
    }),
  );
  if (supplement.stock_quantity != null) {
    await patch('supplements', supplement.id, {
      stock_quantity: Math.max(0, supplement.stock_quantity - 1),
      updated_at: new Date().toISOString(),
      sync_version: Number(supplement.sync_version ?? 1) + 1,
    });
  }
}

export async function addGoal(
  userId: string,
  input: { title: string; category: string; start: number; target: number; unit: string },
): Promise<void> {
  await insert(
    'goals',
    createGoal({
      id: id(),
      user_id: userId,
      title: input.title,
      category: input.category,
      start_value: input.start,
      target_value: input.target,
      current_value: input.start,
      unit: input.unit,
    }),
  );
}

export async function checkInGoal(userId: string, goal: Goal, value: number): Promise<void> {
  await insert(
    'goal_check_ins',
    createGoalCheckIn({ id: id(), user_id: userId, goal_id: goal.id, value }),
  );
  await patch('goals', goal.id, {
    current_value: value,
    updated_at: new Date().toISOString(),
    sync_version: goal.sync_version + 1,
  });
}

export async function logVitals(
  userId: string,
  input: { systolic?: number; diastolic?: number; heart?: number; sugar?: number },
): Promise<void> {
  await insert(
    'vitals_logs',
    createVitalsLog({
      id: id(),
      user_id: userId,
      systolic_bp: input.systolic,
      diastolic_bp: input.diastolic,
      heart_rate_bpm: input.heart,
      blood_sugar_mgdl: input.sugar,
    }),
  );
}

export async function logSymptom(userId: string, symptom: string, severity: number): Promise<void> {
  await insert('symptoms_logs', createSymptomLog({ id: id(), user_id: userId, symptom, severity }));
}

export async function addRecord(userId: string, title: string, recordType: string): Promise<void> {
  await insert(
    'medical_records',
    createMedicalRecord({
      id: id(),
      user_id: userId,
      title,
      record_type: recordType as 'visit',
    }),
  );
}

export async function logHair(userId: string, logType: 'oil' | 'wash' | 'treatment' | 'trim' | 'note', notes: string) {
  await insert('haircare_logs', createHaircareLog({ id: id(), user_id: userId, log_type: logType, notes }));
}

export async function addHairProduct(userId: string, name: string): Promise<void> {
  await insert('haircare_products', createHaircareProduct({ id: id(), user_id: userId, name }));
}

export async function logSkin(userId: string, routine: 'morning' | 'night', notes: string): Promise<void> {
  await insert(
    'skincare_logs',
    createSkincareLog({ id: id(), user_id: userId, routine_type: routine, notes, skin_hydration: 3 }),
  );
}

export async function logBreakout(userId: string, location: string, severity: number): Promise<void> {
  await insert('breakout_logs', createBreakoutLog({ id: id(), user_id: userId, location, severity }));
}

export async function uploadPhoto(userId: string, file: File, angle: 'front' | 'side' | 'back' | 'custom') {
  const photoId = id();
  const path = `${userId}/${photoId}.jpg`;
  const { error } = await getSupabase().storage.from('progress-photos').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  });
  if (error) throw new Error(error.message);
  await insert(
    'progress_photos',
    createProgressPhoto({ id: photoId, user_id: userId, storage_path: path, angle }),
  );
}

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from('progress-photos').createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

async function rows<T>(table: string, userId: string, limit = 20): Promise<T[]> {
  const { data, error } = await getSupabase()
    .from(table)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export interface TodaySnapshot {
  waterMl: number;
  waterGoal: number;
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbGoal: number;
  fat: number;
  fatGoal: number;
  workoutCount: number;
  sleepLabel: string;
  habitsDone: number;
  habitsTotal: number;
  supplementsDone: number;
  supplementsTotal: number;
  goals: Array<{ id: string; title: string; category: string; pct: number }>;
  habits: Array<{ id: string; name: string; done: boolean }>;
  heartRate: number | null;
  bloodPressure: string;
  moduleStatus: Array<{ id: ModuleId; detail: string; state: string }>;
}

export async function loadToday(userId: string): Promise<TodaySnapshot> {
  const today = todayDateString();
  const supabase = getSupabase();
  const [water, waterGoals, meals, nutritionGoals, workouts, sleep, habits, habitLogs, supplements, supplementLogs, goals, vitals] =
    await Promise.all([
      supabase.from('water_logs').select('amount_ml').eq('user_id', userId).is('deleted_at', null).gte('logged_at', `${today}T00:00:00Z`),
      supabase.from('water_goals').select('daily_target_ml').eq('user_id', userId).is('deleted_at', null).order('effective_from', { ascending: false }).limit(1),
      supabase.from('meal_logs').select('calories, protein_g, carbs_g, fat_g').eq('user_id', userId).eq('logged_date', today).is('deleted_at', null),
      supabase.from('nutrition_goals').select('calories, protein_g, carbs_g, fat_g').eq('user_id', userId).is('deleted_at', null).order('effective_from', { ascending: false }).limit(1),
      supabase.from('workouts').select('id').eq('user_id', userId).is('deleted_at', null).gte('started_at', `${today}T00:00:00Z`),
      supabase.from('sleep_logs').select('duration_minutes, quality_rating').eq('user_id', userId).is('deleted_at', null).order('sleep_date', { ascending: false }).limit(1),
      supabase.from('habits').select('id, name').eq('user_id', userId).is('deleted_at', null).eq('is_active', true),
      supabase.from('habit_logs').select('habit_id').eq('user_id', userId).eq('logged_date', today).is('deleted_at', null),
      supabase.from('supplements').select('id').eq('user_id', userId).is('deleted_at', null).eq('is_active', true),
      supabase.from('supplement_logs').select('supplement_id').eq('user_id', userId).is('deleted_at', null).gte('taken_at', `${today}T00:00:00Z`),
      supabase.from('goals').select('*').eq('user_id', userId).is('deleted_at', null).eq('status', 'active').limit(6),
      supabase.from('vitals_logs').select('heart_rate_bpm, systolic_bp, diastolic_bp').eq('user_id', userId).is('deleted_at', null).order('logged_at', { ascending: false }).limit(1),
    ]);
  for (const result of [water, waterGoals, meals, nutritionGoals, workouts, sleep, habits, habitLogs, supplements, supplementLogs, goals, vitals]) {
    if (result.error) throw new Error(result.error.message);
  }
  const mealRows = meals.data ?? [];
  const sum = (key: 'calories' | 'protein_g' | 'carbs_g' | 'fat_g') =>
    mealRows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
  const goal = nutritionGoals.data?.[0];
  const waterMl = (water.data ?? []).reduce((total, row) => total + Number(row.amount_ml), 0);
  const doneHabits = new Set((habitLogs.data ?? []).map((row) => row.habit_id as string));
  const takenSupps = new Set((supplementLogs.data ?? []).map((row) => row.supplement_id as string));
  const sleepRow = sleep.data?.[0];
  const vital = vitals.data?.[0];
  const hours = sleepRow ? `${Math.floor(Number(sleepRow.duration_minutes) / 60)}h ${Number(sleepRow.duration_minutes) % 60}m` : '—';
  return {
    waterMl,
    waterGoal: Number(waterGoals.data?.[0]?.daily_target_ml ?? 3000),
    calories: Math.round(sum('calories')),
    calorieGoal: Number(goal?.calories ?? 2200),
    protein: Math.round(sum('protein_g')),
    proteinGoal: Number(goal?.protein_g ?? 150),
    carbs: Math.round(sum('carbs_g')),
    carbGoal: Number(goal?.carbs_g ?? 220),
    fat: Math.round(sum('fat_g')),
    fatGoal: Number(goal?.fat_g ?? 70),
    workoutCount: workouts.data?.length ?? 0,
    sleepLabel: hours,
    habitsDone: doneHabits.size,
    habitsTotal: habits.data?.length ?? 0,
    supplementsDone: takenSupps.size,
    supplementsTotal: supplements.data?.length ?? 0,
    goals: ((goals.data ?? []) as Goal[]).map((goalRow) => ({
      id: goalRow.id,
      title: goalRow.title,
      category: goalRow.category,
      pct: goalProgressPct({
        ...goalRow,
        start_value: goalRow.start_value == null ? null : Number(goalRow.start_value),
        target_value: goalRow.target_value == null ? null : Number(goalRow.target_value),
        current_value: goalRow.current_value == null ? null : Number(goalRow.current_value),
      }),
    })),
    habits: (habits.data ?? []).map((habit) => ({
      id: habit.id as string,
      name: habit.name as string,
      done: doneHabits.has(habit.id as string),
    })),
    heartRate: vital?.heart_rate_bpm ?? null,
    bloodPressure: vital?.systolic_bp ? `${vital.systolic_bp}/${vital.diastolic_bp ?? '—'}` : '—',
    moduleStatus: [
      { id: 'fitness', detail: `${workouts.data?.length ?? 0} workouts today`, state: (workouts.data?.length ?? 0) > 0 ? 'Logged' : 'Open' },
      { id: 'nutrition', detail: `${Math.round(sum('calories'))} kcal logged`, state: 'Today' },
      { id: 'water', detail: `${waterMl} ml`, state: `${Math.round((waterMl / Number(waterGoals.data?.[0]?.daily_target_ml ?? 3000)) * 100)}%` },
      { id: 'sleep', detail: hours, state: sleepRow ? 'Logged' : 'Open' },
      { id: 'supplements', detail: `${takenSupps.size}/${supplements.data?.length ?? 0} taken`, state: 'Today' },
    ],
  };
}

export async function listFoods(userId: string): Promise<Food[]> {
  return rows<Food>('foods', userId, 50);
}

export async function listTable(table: string, userId: string): Promise<Record<string, unknown>[]> {
  return rows<Record<string, unknown>>(table, userId, 12);
}

export async function listHabits(userId: string): Promise<Array<Habit & { done: boolean }>> {
  const today = todayDateString();
  const habits = await rows<Habit>('habits', userId, 50);
  const { data, error } = await getSupabase()
    .from('habit_logs')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('logged_date', today)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  const done = new Set((data ?? []).map((row) => row.habit_id as string));
  return habits.filter((habit) => habit.is_active !== false).map((habit) => ({ ...habit, done: done.has(habit.id) }));
}

export async function listSupplements(userId: string) {
  const today = todayDateString();
  const items = await rows<Record<string, unknown>>('supplements', userId, 50);
  const { data, error } = await getSupabase()
    .from('supplement_logs')
    .select('supplement_id')
    .eq('user_id', userId)
    .gte('taken_at', `${today}T00:00:00Z`)
    .is('deleted_at', null);
  if (error) throw new Error(error.message);
  const taken = new Set((data ?? []).map((row) => row.supplement_id as string));
  return items
    .filter((item) => item.is_active !== false)
    .map((item) => ({ ...item, taken: taken.has(item.id as string) }));
}

export async function listGoals(userId: string): Promise<Goal[]> {
  const data = await rows<Goal>('goals', userId, 30);
  return data.filter((goal) => goal.status === 'active' || goal.status == null);
}

export async function listTemplates(userId: string): Promise<WorkoutTemplate[]> {
  return rows<WorkoutTemplate>('workout_templates', userId, 20);
}

export async function listRecords(userId: string): Promise<PersonalRecord[]> {
  return rows<PersonalRecord>('personal_records', userId, 20);
}

export async function buildExport(userId: string, preset: DateRangePreset, profile: { name: string | null; height_cm: number | null; weight_unit: string }): Promise<LifestyleExport> {
  const range = resolveDateRange(preset);
  const supabase = getSupabase();
  const fromTs = `${range.from}T00:00:00Z`;
  const toTs = `${range.to}T23:59:59Z`;
  const [water, meals, workouts, sleep, habits, habitLogs, supplements, supplementLogs, goals, weights, measurements, vitals, symptoms, hair, skin, breakouts, photos] =
    await Promise.all([
      supabase.from('water_logs').select('logged_at, amount_ml').eq('user_id', userId).is('deleted_at', null).gte('logged_at', fromTs).lte('logged_at', toTs),
      supabase.from('meal_logs').select('logged_date, calories, protein_g').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('workouts').select('started_at, name').eq('user_id', userId).is('deleted_at', null).gte('started_at', fromTs).lte('started_at', toTs),
      supabase.from('sleep_logs').select('sleep_date, duration_minutes, quality_rating').eq('user_id', userId).is('deleted_at', null).gte('sleep_date', range.from).lte('sleep_date', range.to),
      supabase.from('habits').select('id, name').eq('user_id', userId).is('deleted_at', null),
      supabase.from('habit_logs').select('habit_id, logged_date').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('supplements').select('id, name, dose_amount, dose_unit').eq('user_id', userId).is('deleted_at', null).eq('is_active', true),
      supabase.from('supplement_logs').select('supplement_id').eq('user_id', userId).is('deleted_at', null).gte('taken_at', fromTs).lte('taken_at', toTs),
      supabase.from('goals').select('*').eq('user_id', userId).is('deleted_at', null),
      supabase.from('weight_logs').select('logged_date, weight_kg').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('body_measurements').select('logged_date, waist_cm').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('vitals_logs').select('logged_at, systolic_bp, diastolic_bp, heart_rate_bpm').eq('user_id', userId).is('deleted_at', null).gte('logged_at', fromTs).lte('logged_at', toTs),
      supabase.from('symptoms_logs').select('logged_date, symptom, severity').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('haircare_logs').select('log_type, hair_condition').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('skincare_logs').select('skin_clarity').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('breakout_logs').select('id').eq('user_id', userId).is('deleted_at', null).gte('logged_date', range.from).lte('logged_date', range.to),
      supabase.from('progress_photos').select('taken_date').eq('user_id', userId).is('deleted_at', null).gte('taken_date', range.from).lte('taken_date', range.to),
    ]);
  const waterByDay = new Map<string, number>();
  for (const row of water.data ?? []) {
    const day = String(row.logged_at).slice(0, 10);
    waterByDay.set(day, (waterByDay.get(day) ?? 0) + Number(row.amount_ml));
  }
  const waterLogs = [...waterByDay.entries()].map(([date, total_ml]) => ({ date, total_ml }));
  const mealByDay = new Map<string, { calories: number; protein_g: number }>();
  for (const row of meals.data ?? []) {
    const current = mealByDay.get(row.logged_date as string) ?? { calories: 0, protein_g: 0 };
    current.calories += Number(row.calories ?? 0);
    current.protein_g += Number(row.protein_g ?? 0);
    mealByDay.set(row.logged_date as string, current);
  }
  const avg = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0);
  const habitCounts = new Map<string, number>();
  for (const row of habitLogs.data ?? []) {
    habitCounts.set(row.habit_id as string, (habitCounts.get(row.habit_id as string) ?? 0) + 1);
  }
  const suppCounts = new Map<string, number>();
  for (const row of supplementLogs.data ?? []) {
    suppCounts.set(row.supplement_id as string, (suppCounts.get(row.supplement_id as string) ?? 0) + 1);
  }
  const hairRows = hair.data ?? [];
  const skinRows = skin.data ?? [];
  return {
    export_version: '1.0',
    exported_at: new Date().toISOString(),
    date_range: { from: range.from, to: range.to },
    user: profile,
    goals: ((goals.data ?? []) as Goal[]).map((goal) => ({
      title: goal.title,
      category: goal.category,
      progress_pct: goalProgressPct(goal),
    })),
    body: {
      weight_logs: (weights.data ?? []).map((row) => ({ date: row.logged_date as string, weight_kg: Number(row.weight_kg) })),
      measurements: (measurements.data ?? []).map((row) => ({ date: row.logged_date as string, waist_cm: row.waist_cm as number | null })),
    },
    fitness: {
      workout_count: workouts.data?.length ?? 0,
      workouts: (workouts.data ?? []).map((row) => ({ date: String(row.started_at).slice(0, 10), name: row.name as string })),
    },
    nutrition: {
      average_calories: avg([...mealByDay.values()].map((row) => row.calories)),
      average_protein_g: avg([...mealByDay.values()].map((row) => row.protein_g)),
      daily_logs: [...mealByDay.entries()].map(([date, row]) => ({ date, ...row })),
    },
    water: {
      average_daily_ml: avg(waterLogs.map((row) => row.total_ml)),
      goal_ml: 3000,
      daily_logs: waterLogs,
    },
    sleep: {
      average_duration_hours: Math.round((((sleep.data ?? []).reduce((total, row) => total + Number(row.duration_minutes ?? 0), 0) / Math.max(sleep.data?.length ?? 1, 1)) / 60) * 10) / 10,
      average_quality: avg((sleep.data ?? []).map((row) => Number(row.quality_rating ?? 0))),
      daily_logs: (sleep.data ?? []).map((row) => ({
        date: row.sleep_date as string,
        duration_minutes: Number(row.duration_minutes ?? 0),
        quality: Number(row.quality_rating ?? 0),
      })),
    },
    habits: {
      habits: (habits.data ?? []).map((habit) => ({
        name: habit.name as string,
        completion_rate_pct: Math.min(100, Math.round(((habitCounts.get(habit.id as string) ?? 0) / 7) * 100)),
        current_streak: habitCounts.get(habit.id as string) ?? 0,
      })),
    },
    supplements: {
      active: (supplements.data ?? []).map((item) => ({
        name: item.name as string,
        dose: `${item.dose_amount} ${item.dose_unit}`,
        adherence_pct: Math.min(100, Math.round(((suppCounts.get(item.id as string) ?? 0) / 7) * 100)),
      })),
    },
    haircare: {
      oil_applications: hairRows.filter((row) => row.log_type === 'oil').length,
      wash_sessions: hairRows.filter((row) => row.log_type === 'wash').length,
      avg_condition_score: hairRows.length ? avg(hairRows.map((row) => Number(row.hair_condition ?? 0))) : null,
    },
    skincare: {
      routine_adherence_pct: Math.min(100, skinRows.length * 10),
      avg_skin_clarity: skinRows.length ? avg(skinRows.map((row) => Number(row.skin_clarity ?? 0))) : null,
      breakouts: breakouts.data?.length ?? 0,
    },
    health: {
      vitals: (vitals.data ?? []).map((row) => ({
        date: String(row.logged_at).slice(0, 10),
        systolic: row.systolic_bp as number | null,
        diastolic: row.diastolic_bp as number | null,
        heart_rate_bpm: row.heart_rate_bpm as number | null,
      })),
      symptoms: (symptoms.data ?? []).map((row) => ({
        date: row.logged_date as string,
        symptom: row.symptom as string,
        severity: row.severity as number | null,
      })),
    },
    progress_photos: {
      count: photos.data?.length ?? 0,
      dates: (photos.data ?? []).map((row) => row.taken_date as string),
    },
  };
}

export function renderExport(data: LifestyleExport, format: ExportFormat): { contents: string; filename: string; mime: string } {
  const stamp = data.date_range.from;
  if (format === 'markdown') return { contents: exportToMarkdown(data), filename: `lifestyle-${stamp}.md`, mime: 'text/markdown' };
  if (format === 'chatgpt') return { contents: exportToChatGpt(data), filename: `lifestyle-${stamp}-gpt.json`, mime: 'application/json' };
  if (format === 'pdf') return { contents: exportToPdfHtml(data), filename: `lifestyle-${stamp}.html`, mime: 'text/html' };
  return { contents: exportToJson(data), filename: `lifestyle-${stamp}.json`, mime: 'application/json' };
}

export function analyticsSummary(period: ReportPeriod, data: LifestyleExport) {
  const preset = period === 'daily' ? 'today' : period === 'weekly' ? 'week' : 'month';
  return buildPeriodSummary(period, resolveDateRange(preset), data);
}
