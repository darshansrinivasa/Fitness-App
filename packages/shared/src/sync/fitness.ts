import type { SyncOperation } from '../types/sync';
import {
  workoutExerciseSchema,
  workoutSchema,
  workoutSetSchema,
  WORKOUT_EXERCISES_TABLE,
  WORKOUT_SETS_TABLE,
  WORKOUTS_TABLE,
  type Workout,
  type WorkoutExercise,
  type WorkoutSet,
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

export function createWorkout(
  input: {
    id: string;
    user_id: string;
    name: string;
    started_at?: string;
    notes?: string | null;
  },
  now: Date = new Date(),
): Workout {
  return workoutSchema.parse({
    ...input,
    started_at: input.started_at ?? now.toISOString(),
    ended_at: now.toISOString(),
    template_id: null,
    notes: input.notes ?? null,
    ...baseFields(now),
  });
}

export function createWorkoutExercise(
  input: {
    id: string;
    workout_id: string;
    exercise_name: string;
    order_index?: number;
    exercise_category?: string | null;
  },
  now: Date = new Date(),
): WorkoutExercise {
  return workoutExerciseSchema.parse({
    ...input,
    order_index: input.order_index ?? 0,
    exercise_category: input.exercise_category ?? 'strength',
    ...baseFields(now),
  });
}

export function createWorkoutSet(
  input: {
    id: string;
    workout_exercise_id: string;
    set_number: number;
    reps?: number | null;
    weight_kg?: number | null;
  },
  now: Date = new Date(),
): WorkoutSet {
  return workoutSetSchema.parse({
    ...input,
    duration_seconds: null,
    distance_km: null,
    notes: null,
    is_pr: false,
    ...baseFields(now),
  });
}

export async function enqueueWorkout(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: Workout,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(WORKOUTS_TABLE, row.id, operation, JSON.stringify(row), now.toISOString());
}

export async function enqueueWorkoutExercise(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: WorkoutExercise,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WORKOUT_EXERCISES_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export async function enqueueWorkoutSet(
  queue: EnqueueChange,
  operation: SyncOperation,
  row: WorkoutSet,
  now: Date = new Date(),
): Promise<void> {
  await queue.enqueue(
    WORKOUT_SETS_TABLE,
    row.id,
    operation,
    JSON.stringify(row),
    now.toISOString(),
  );
}

export { WORKOUTS_TABLE, WORKOUT_EXERCISES_TABLE, WORKOUT_SETS_TABLE };
