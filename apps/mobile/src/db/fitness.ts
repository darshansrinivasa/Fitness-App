import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createPersonalRecord,
  createWorkout,
  createWorkoutExercise,
  createWorkoutSet,
  createWorkoutTemplate,
  enqueuePersonalRecord,
  enqueueWorkout,
  enqueueWorkoutExercise,
  enqueueWorkoutSet,
  enqueueWorkoutTemplate,
  todayDateString,
  updatePersonalRecord,
  type PersonalRecord,
  type TemplateExercise,
  type Workout,
  type WorkoutTemplate,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue, parseFromSqlite, updateRow } from './helpers';

export interface SetInput {
  reps: number;
  weight_kg: number;
}

export interface ExerciseDraft {
  exercise_name: string;
  sets: number;
  reps: number;
  weight_kg: number;
}

export interface WorkoutExerciseLine {
  exercise_name: string;
  set_count: number;
  top_weight: number | null;
  volume: number;
}

export interface WorkoutSession {
  id: string;
  name: string;
  started_at: string;
  volume: number;
  exercises: WorkoutExerciseLine[];
}

interface ExerciseRow {
  workout_id: string;
  workout_name: string;
  started_at: string;
  exercise_name: string;
  set_count: number;
  top_weight: number | null;
  volume: number;
}

function groupSessions(rows: ExerciseRow[]): WorkoutSession[] {
  const map = new Map<string, WorkoutSession>();
  for (const row of rows) {
    const existing = map.get(row.workout_id);
    const line: WorkoutExerciseLine = {
      exercise_name: row.exercise_name,
      set_count: row.set_count,
      top_weight: row.top_weight,
      volume: row.volume,
    };
    if (existing) {
      existing.exercises.push(line);
      existing.volume += row.volume;
    } else {
      map.set(row.workout_id, {
        id: row.workout_id,
        name: row.workout_name,
        started_at: row.started_at,
        volume: row.volume,
        exercises: [line],
      });
    }
  }
  return [...map.values()];
}

const SESSION_SQL = `
  SELECT w.id as workout_id, w.name as workout_name, w.started_at,
         we.exercise_name,
         COUNT(ws.id) as set_count,
         MAX(ws.weight_kg) as top_weight,
         SUM(COALESCE(ws.reps, 0) * COALESCE(ws.weight_kg, 0)) as volume
  FROM workouts w
  JOIN workout_exercises we ON we.workout_id = w.id AND we.deleted_at IS NULL
  LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.deleted_at IS NULL
  WHERE w.user_id = ? AND w.deleted_at IS NULL
`;

async function recordIfPr(
  db: SQLiteDatabase,
  userId: string,
  exerciseName: string,
  weightKg: number,
  reps: number,
  setId: string,
): Promise<boolean> {
  const queue = makeSyncQueue(db);
  const raw = await db.getFirstAsync<PersonalRecord>(
    `SELECT * FROM personal_records
     WHERE user_id = ? AND lower(exercise_name) = lower(?) AND deleted_at IS NULL`,
    [userId, exerciseName],
  );
  const existing = raw ? parseFromSqlite(raw) : null;
  const beats =
    !existing ||
    (existing.weight_kg ?? 0) < weightKg ||
    ((existing.weight_kg ?? 0) === weightKg && (existing.reps ?? 0) < reps);
  if (!beats) return false;

  if (!existing) {
    const row = createPersonalRecord({
      id: newId(),
      user_id: userId,
      exercise_name: exerciseName,
      weight_kg: weightKg,
      reps,
      workout_set_id: setId,
    });
    await insertRow(db, 'personal_records', row);
    await enqueuePersonalRecord(queue, 'insert', row);
    return true;
  }

  const row = updatePersonalRecord(existing, {
    weight_kg: weightKg,
    reps,
    achieved_at: new Date().toISOString(),
    workout_set_id: setId,
  });
  await updateRow(db, 'personal_records', row);
  await enqueuePersonalRecord(queue, 'update', row);
  return true;
}

export async function logWorkoutSession(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  exercises: ExerciseDraft[],
  templateId?: string | null,
): Promise<void> {
  const queue = makeSyncQueue(db);
  const workout = createWorkout({
    id: newId(),
    user_id: userId,
    name,
    template_id: templateId ?? null,
  });
  await insertRow(db, 'workouts', workout);
  await enqueueWorkout(queue, 'insert', workout);

  for (let index = 0; index < exercises.length; index += 1) {
    const draft = exercises[index];
    const exercise = createWorkoutExercise({
      id: newId(),
      workout_id: workout.id,
      exercise_name: draft.exercise_name,
      order_index: index,
    });
    await insertRow(db, 'workout_exercises', exercise);
    await enqueueWorkoutExercise(queue, 'insert', exercise);

    for (let setNumber = 1; setNumber <= draft.sets; setNumber += 1) {
      const setId = newId();
      const isPr =
        setNumber === draft.sets
          ? await recordIfPr(db, userId, draft.exercise_name, draft.weight_kg, draft.reps, setId)
          : false;
      const setRow = createWorkoutSet({
        id: setId,
        workout_exercise_id: exercise.id,
        set_number: setNumber,
        reps: draft.reps,
        weight_kg: draft.weight_kg,
        is_pr: isPr,
      });
      await insertRow(db, 'workout_sets', setRow);
      await enqueueWorkoutSet(queue, 'insert', setRow);
    }
  }
}

export async function logQuickWorkout(
  db: SQLiteDatabase,
  userId: string,
  exerciseName: string,
  sets: SetInput[],
): Promise<void> {
  const first = sets[0];
  await logWorkoutSession(db, userId, exerciseName, [
    {
      exercise_name: exerciseName,
      sets: sets.length,
      reps: first?.reps ?? 1,
      weight_kg: first?.weight_kg ?? 1,
    },
  ]);
}

export async function getSessions(
  db: SQLiteDatabase,
  userId: string,
  options?: { date?: string; limit?: number },
): Promise<WorkoutSession[]> {
  const params: Array<string | number> = [userId];
  let sql = SESSION_SQL;
  if (options?.date) {
    sql += ' AND date(w.started_at) = ?';
    params.push(options.date);
  }
  sql += ' GROUP BY w.id, we.id ORDER BY w.started_at DESC, we.order_index ASC';
  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }
  const rows = await db.getAllAsync<ExerciseRow>(sql, params);
  return groupSessions(rows);
}

export async function getWeeklyWorkoutDays(
  db: SQLiteDatabase,
  userId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ days: number }>(
    `SELECT COUNT(DISTINCT date(started_at)) as days FROM workouts
     WHERE user_id = ? AND deleted_at IS NULL
       AND date(started_at) >= date('now', '-6 days')`,
    [userId],
  );
  return row?.days ?? 0;
}

export async function getTodayWorkoutCount(
  db: SQLiteDatabase,
  userId: string,
): Promise<number> {
  const today = todayDateString();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM workouts
     WHERE user_id = ? AND deleted_at IS NULL AND date(started_at) = ?`,
    [userId, today],
  );
  return row?.count ?? 0;
}

export async function getWorkouts(
  db: SQLiteDatabase,
  userId: string,
): Promise<Workout[]> {
  return db.getAllAsync<Workout>(
    `SELECT * FROM workouts
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY started_at DESC`,
    [userId],
  );
}

export async function saveWorkoutTemplate(
  db: SQLiteDatabase,
  userId: string,
  name: string,
  exercises: TemplateExercise[],
): Promise<WorkoutTemplate> {
  const queue = makeSyncQueue(db);
  const row = createWorkoutTemplate({
    id: newId(),
    user_id: userId,
    name,
    exercises,
  });
  await insertRow(db, 'workout_templates', row);
  await enqueueWorkoutTemplate(queue, 'insert', row);
  return row;
}

export async function getWorkoutTemplates(
  db: SQLiteDatabase,
  userId: string,
): Promise<WorkoutTemplate[]> {
  const rows = await db.getAllAsync<WorkoutTemplate>(
    `SELECT * FROM workout_templates
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId],
  );
  return rows.map(parseFromSqlite);
}

export async function getPersonalRecords(
  db: SQLiteDatabase,
  userId: string,
): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<PersonalRecord>(
    `SELECT * FROM personal_records
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY weight_kg DESC`,
    [userId],
  );
  return rows.map(parseFromSqlite);
}
