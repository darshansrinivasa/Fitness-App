import type { SQLiteDatabase } from 'expo-sqlite';
import {
  createWorkout,
  createWorkoutExercise,
  createWorkoutSet,
  enqueueWorkout,
  enqueueWorkoutExercise,
  enqueueWorkoutSet,
  todayDateString,
  type Workout,
} from '@lifestyle-os/shared/sync';

import { newId } from '../lib/id';
import { insertRow, makeSyncQueue } from './helpers';

export interface WorkoutSummary {
  id: string;
  name: string;
  started_at: string;
  exercise_name: string;
  set_count: number;
}

export interface SetInput {
  reps: number;
  weight_kg: number;
}

export async function logQuickWorkout(
  db: SQLiteDatabase,
  userId: string,
  exerciseName: string,
  sets: SetInput[],
): Promise<void> {
  const queue = makeSyncQueue(db);
  const workout = createWorkout({
    id: newId(),
    user_id: userId,
    name: exerciseName,
  });
  const exercise = createWorkoutExercise({
    id: newId(),
    workout_id: workout.id,
    exercise_name: exerciseName,
  });

  await insertRow(db, 'workouts', workout);
  await enqueueWorkout(queue, 'insert', workout);

  await insertRow(db, 'workout_exercises', exercise);
  await enqueueWorkoutExercise(queue, 'insert', exercise);

  for (let i = 0; i < sets.length; i += 1) {
    const setRow = createWorkoutSet({
      id: newId(),
      workout_exercise_id: exercise.id,
      set_number: i + 1,
      reps: sets[i].reps,
      weight_kg: sets[i].weight_kg,
    });
    await insertRow(db, 'workout_sets', setRow);
    await enqueueWorkoutSet(queue, 'insert', setRow);
  }
}

export async function getRecentWorkouts(
  db: SQLiteDatabase,
  userId: string,
  limit = 20,
): Promise<WorkoutSummary[]> {
  return db.getAllAsync<WorkoutSummary>(
    `SELECT w.id, w.name, w.started_at,
            we.exercise_name,
            COUNT(ws.id) as set_count
     FROM workouts w
     JOIN workout_exercises we ON we.workout_id = w.id AND we.deleted_at IS NULL
     LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id AND ws.deleted_at IS NULL
     WHERE w.user_id = ? AND w.deleted_at IS NULL
     GROUP BY w.id, we.exercise_name
     ORDER BY w.started_at DESC
     LIMIT ?`,
    [userId, limit],
  );
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
