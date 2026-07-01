import type { SQLiteDatabase } from 'expo-sqlite';
import {
  average,
  buildHabitHeatmap,
  buildLifestyleExport,
  completionRate,
  dateSequence,
  daysInRange,
  type ExportModule,
  type HabitHeatmapRow,
  type LifestyleExport,
} from '@lifestyle-os/shared';

import { computeStreak, getActiveHabits } from './habits';
import { getActiveGoals } from './goals';
import { getActiveWaterGoal } from './waterGoals';
import { parseFromSqlite } from './helpers';

export interface GatherExportOptions {
  modules: ExportModule[];
  includePhotoMetadata: boolean;
}

function hasModule(modules: ExportModule[], mod: ExportModule): boolean {
  return modules.includes(mod);
}

export async function gatherLifestyleExport(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string,
  userProfile: LifestyleExport['user'],
  options: GatherExportOptions,
): Promise<LifestyleExport> {
  const { modules, includePhotoMetadata } = options;
  const dayCount = daysInRange(from, to);
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const empty = buildLifestyleExport({
    export_version: '1.0',
    exported_at: new Date().toISOString(),
    date_range: { from, to },
    user: userProfile,
    goals: [],
    body: { weight_logs: [], measurements: [] },
    fitness: { workout_count: 0, workouts: [] },
    nutrition: { average_calories: 0, average_protein_g: 0, daily_logs: [] },
    water: { average_daily_ml: 0, goal_ml: 3000, daily_logs: [] },
    sleep: { average_duration_hours: 0, average_quality: 0, daily_logs: [] },
    habits: { habits: [] },
    supplements: { active: [] },
    haircare: { oil_applications: 0, wash_sessions: 0, avg_condition_score: null },
    skincare: { routine_adherence_pct: 0, avg_skin_clarity: null, breakouts: 0 },
    health: { vitals: [], symptoms: [] },
    progress_photos: { count: 0, dates: [] },
  });

  if (hasModule(modules, 'goals')) {
    const goals = await getActiveGoals(db, userId);
    empty.goals = goals.map((g) => ({
      title: g.title,
      category: g.category,
      progress_pct: g.progress_pct,
    }));
  }

  if (hasModule(modules, 'body')) {
    const weights = await db.getAllAsync<{ logged_date: string; weight_kg: number }>(
      `SELECT logged_date, weight_kg FROM weight_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?
       ORDER BY logged_date ASC`,
      [userId, from, to],
    );
    empty.body.weight_logs = weights.map((w) => ({
      date: w.logged_date,
      weight_kg: w.weight_kg,
    }));

    const measurements = await db.getAllAsync<{ logged_date: string; waist_cm: number | null }>(
      `SELECT logged_date, waist_cm FROM body_measurements
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?
       ORDER BY logged_date ASC`,
      [userId, from, to],
    );
    empty.body.measurements = measurements.map((m) => ({
      date: m.logged_date,
      waist_cm: m.waist_cm,
    }));
  }

  if (hasModule(modules, 'fitness')) {
    const workouts = await db.getAllAsync<{ started_at: string; name: string }>(
      `SELECT started_at, name FROM workouts
       WHERE user_id = ? AND deleted_at IS NULL AND started_at BETWEEN ? AND ?
       ORDER BY started_at ASC`,
      [userId, fromIso, toIso],
    );
    empty.fitness.workout_count = workouts.length;
    empty.fitness.workouts = workouts.map((w) => ({
      date: w.started_at.slice(0, 10),
      name: w.name,
    }));
  }

  if (hasModule(modules, 'nutrition')) {
    const daily = await db.getAllAsync<{ day: string; calories: number; protein_g: number }>(
      `SELECT logged_date as day,
              COALESCE(SUM(calories), 0) as calories,
              COALESCE(SUM(protein_g), 0) as protein_g
       FROM meal_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?
       GROUP BY logged_date ORDER BY day ASC`,
      [userId, from, to],
    );
    empty.nutrition.daily_logs = daily.map((d) => ({
      date: d.day,
      calories: d.calories,
      protein_g: d.protein_g,
    }));
    empty.nutrition.average_calories = Math.round(average(daily.map((d) => d.calories)));
    empty.nutrition.average_protein_g = Math.round(average(daily.map((d) => d.protein_g)));
  }

  if (hasModule(modules, 'water')) {
    const goal = await getActiveWaterGoal(db, userId);
    empty.water.goal_ml = goal?.daily_target_ml ?? 3000;

    const daily = await db.getAllAsync<{ day: string; total_ml: number }>(
      `SELECT date(logged_at) as day, COALESCE(SUM(amount_ml), 0) as total_ml
       FROM water_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_at >= ? AND logged_at <= ?
       GROUP BY date(logged_at) ORDER BY day ASC`,
      [userId, fromIso, toIso],
    );
    empty.water.daily_logs = daily.map((d) => ({
      date: d.day,
      total_ml: d.total_ml,
    }));
    empty.water.average_daily_ml = Math.round(average(daily.map((d) => d.total_ml)));
  }

  if (hasModule(modules, 'sleep')) {
    const logs = await db.getAllAsync<{
      sleep_date: string;
      duration_minutes: number;
      quality_rating: number;
    }>(
      `SELECT sleep_date, duration_minutes, quality_rating FROM sleep_logs
       WHERE user_id = ? AND deleted_at IS NULL AND sleep_date BETWEEN ? AND ?
       ORDER BY sleep_date ASC`,
      [userId, from, to],
    );
    empty.sleep.daily_logs = logs.map((l) => ({
      date: l.sleep_date,
      duration_minutes: l.duration_minutes,
      quality: l.quality_rating,
    }));
    empty.sleep.average_duration_hours =
      Math.round((average(logs.map((l) => l.duration_minutes)) / 60) * 10) / 10;
    empty.sleep.average_quality = average(logs.map((l) => l.quality_rating));
  }

  if (hasModule(modules, 'habits')) {
    const habits = await getActiveHabits(db, userId);
    const habitStats: LifestyleExport['habits']['habits'] = [];
    for (const habit of habits) {
      const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM habit_logs
         WHERE habit_id = ? AND user_id = ? AND deleted_at IS NULL
         AND logged_date BETWEEN ? AND ?`,
        [habit.id, userId, from, to],
      );
      const streak = await computeStreak(db, habit.id, userId);
      habitStats.push({
        name: habit.name,
        completion_rate_pct: completionRate(row?.count ?? 0, dayCount),
        current_streak: streak,
      });
    }
    empty.habits.habits = habitStats;
  }

  if (hasModule(modules, 'supplements')) {
    const supplements = await db.getAllAsync<{ id: string; name: string; dose_amount: number; dose_unit: string }>(
      `SELECT id, name, dose_amount, dose_unit FROM supplements
       WHERE user_id = ? AND deleted_at IS NULL AND is_active = 1`,
      [userId],
    );
    const active: LifestyleExport['supplements']['active'] = [];
    for (const supp of supplements) {
      const row = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM supplement_logs
         WHERE supplement_id = ? AND user_id = ? AND deleted_at IS NULL
         AND taken_at BETWEEN ? AND ?`,
        [supp.id, userId, fromIso, toIso],
      );
      active.push({
        name: supp.name,
        dose: `${supp.dose_amount} ${supp.dose_unit}`,
        adherence_pct: completionRate(row?.count ?? 0, dayCount),
      });
    }
    empty.supplements.active = active;
  }

  if (hasModule(modules, 'haircare')) {
    const logs = await db.getAllAsync<{ log_type: string; hair_condition: number | null }>(
      `SELECT log_type, hair_condition FROM haircare_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?`,
      [userId, from, to],
    );
    empty.haircare.oil_applications = logs.filter((l) => l.log_type === 'oil').length;
    empty.haircare.wash_sessions = logs.filter((l) => l.log_type === 'wash').length;
    const scores = logs.map((l) => l.hair_condition).filter((v): v is number => v != null);
    empty.haircare.avg_condition_score = scores.length > 0 ? average(scores) : null;
  }

  if (hasModule(modules, 'skincare')) {
    const routines = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM skincare_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?`,
      [userId, from, to],
    );
    const breakouts = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM breakout_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?`,
      [userId, from, to],
    );
    const clarityRows = await db.getAllAsync<{ skin_clarity: number | null }>(
      `SELECT skin_clarity FROM skincare_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?`,
      [userId, from, to],
    );
    const clarity = clarityRows.map((r) => r.skin_clarity).filter((v): v is number => v != null);
    const expectedRoutines = dayCount * 2;
    empty.skincare.routine_adherence_pct = completionRate(routines?.count ?? 0, expectedRoutines);
    empty.skincare.avg_skin_clarity = clarity.length > 0 ? average(clarity) : null;
    empty.skincare.breakouts = breakouts?.count ?? 0;
  }

  if (hasModule(modules, 'health')) {
    const vitals = await db.getAllAsync<{
      logged_at: string;
      systolic_bp: number | null;
      diastolic_bp: number | null;
      heart_rate_bpm: number | null;
    }>(
      `SELECT logged_at, systolic_bp, diastolic_bp, heart_rate_bpm FROM vitals_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_at BETWEEN ? AND ?
       ORDER BY logged_at ASC`,
      [userId, fromIso, toIso],
    );
    empty.health.vitals = vitals.map((v) => ({
      date: v.logged_at.slice(0, 10),
      systolic: v.systolic_bp,
      diastolic: v.diastolic_bp,
      heart_rate_bpm: v.heart_rate_bpm,
    }));

    const symptoms = await db.getAllAsync<{
      logged_date: string;
      symptom: string;
      severity: number | null;
    }>(
      `SELECT logged_date, symptom, severity FROM symptoms_logs
       WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?`,
      [userId, from, to],
    );
    empty.health.symptoms = symptoms.map((s) => ({
      date: s.logged_date,
      symptom: s.symptom,
      severity: s.severity,
    }));
  }

  if (hasModule(modules, 'photos') && includePhotoMetadata) {
    const photos = await db.getAllAsync<{ taken_date: string }>(
      `SELECT taken_date FROM progress_photos
       WHERE user_id = ? AND deleted_at IS NULL AND taken_date BETWEEN ? AND ?
       ORDER BY taken_date ASC`,
      [userId, from, to],
    );
    empty.progress_photos.count = photos.length;
    empty.progress_photos.dates = photos.map((p) => p.taken_date);
  }

  return empty;
}

export async function getHabitHeatmapForRange(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string,
): Promise<HabitHeatmapRow[]> {
  const habits = await getActiveHabits(db, userId);
  const dates = dateSequence(from, to);
  const completedDatesByHabit = new Map<string, Set<string>>();

  for (const habit of habits) {
    const rows = await db.getAllAsync<{ logged_date: string }>(
      `SELECT logged_date FROM habit_logs
       WHERE habit_id = ? AND user_id = ? AND deleted_at IS NULL
       AND logged_date BETWEEN ? AND ?`,
      [habit.id, userId, from, to],
    );
    completedDatesByHabit.set(habit.id, new Set(rows.map((r) => r.logged_date)));
  }

  return buildHabitHeatmap(
    habits.map((h) => ({ id: h.id, name: h.name })),
    completedDatesByHabit,
    dates,
  );
}

export async function getWaterTotalsForRange(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string,
): Promise<Array<{ day: string; total_ml: number }>> {
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;
  const rows = await db.getAllAsync<{ day: string; total_ml: number }>(
    `SELECT date(logged_at) as day, COALESCE(SUM(amount_ml), 0) as total_ml
     FROM water_logs
     WHERE user_id = ? AND deleted_at IS NULL AND logged_at >= ? AND logged_at <= ?
     GROUP BY date(logged_at) ORDER BY day ASC`,
    [userId, fromIso, toIso],
  );
  const map = new Map(rows.map((r) => [r.day, r.total_ml]));
  return dateSequence(from, to).map((day) => ({
    day,
    total_ml: map.get(day) ?? 0,
  }));
}

export async function getWeightTrendForRange(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string,
): Promise<Array<{ day: string; weight_kg: number }>> {
  return db.getAllAsync(
    `SELECT logged_date as day, weight_kg FROM weight_logs
     WHERE user_id = ? AND deleted_at IS NULL AND logged_date BETWEEN ? AND ?
     ORDER BY logged_date ASC`,
    [userId, from, to],
  );
}

export async function getPhotosInRange(
  db: SQLiteDatabase,
  userId: string,
  from: string,
  to: string,
): Promise<Array<{ id: string; taken_date: string; storage_path: string; angle: string }>> {
  const rows = await db.getAllAsync<{
    id: string;
    taken_date: string;
    storage_path: string;
    angle: string;
  }>(
    `SELECT id, taken_date, storage_path, angle FROM progress_photos
     WHERE user_id = ? AND deleted_at IS NULL AND taken_date BETWEEN ? AND ?
     ORDER BY taken_date ASC`,
    [userId, from, to],
  );
  return rows.map(parseFromSqlite);
}
